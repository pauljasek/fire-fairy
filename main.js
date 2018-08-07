//Aliases
let Application = PIXI.Application;
    Container = PIXI.Container;
    loader = PIXI.loader;
    resources = PIXI.loader.resources;
    TextureCache = PIXI.utils.TextureCache;
    Sprite = PIXI.Sprite;
    Rectangle = PIXI.Rectangle;
    ParticleContainer = PIXI.particles.ParticleContainer;
    Graphics = PIXI.Graphics;

// Get class references
const {diffuseGroup, normalGroup, lightGroup} = PIXI.lights;
const {Layer, Stage} = PIXI.display;

let SIZE = 1024;
let ratio = window.devicePixelRatio;

//Create a Pixi Application
let app = new Application({
    antialias: true,    // default: false
    transparent: false, // default: false
    resolution: 1,       // default: 1
});

app.renderer.view.style.position = "absolute";
app.renderer.view.style.display = "block";
app.renderer.autoResize = true;
//app.renderer.plugins.interaction.autoPreventDefault = false;

//Add the canvas that Pixi automatically created for you to the HTML document
document.body.appendChild(app.view);

let stage = app.stage = new PIXI.display.Stage();

document.documentElement.style.overflow = 'hidden';  // firefox, chrome
document.body.scroll = 'no'; // ie only

resize();

window.onload = resize;
window.onresize = resize;

function resize() {
    app.renderer.resize(window.innerWidth, window.innerHeight);
    let maxDimension = Math.max(window.innerWidth, window.innerHeight);
    let scale = maxDimension/SIZE;
    app.stage.scale.x = scale;
    app.stage.scale.y = scale;

    app.stage.x = (window.innerWidth - maxDimension)/2;
    app.stage.y = (window.innerHeight - maxDimension)/2;
}

function requestFullScreen(event) {
    if (screenfull.enabled) {
        screenfull.request(app.view);
    }
}

let centerCircleRadius = 112;
let centerCircleGraphic = new Graphics();
centerCircleGraphic.beginFill(0x000000);
centerCircleGraphic.drawCircle(0, 0, centerCircleRadius);
centerCircleGraphic.endFill();

let flameColor = 0xffee99;

let centerCircle = new Sprite(app.renderer.generateTexture(centerCircleGraphic));
centerCircle.x = SIZE/2;
centerCircle.y = SIZE/2;

/*
centerCircle.button =  document.createElement("input");
centerCircle.button.type = "button";
centerCircle.button.style.width = "13.33vmax";
centerCircle.button.style.height = "13.33vmax";
centerCircle.button.style.borderRadius = "50%";
centerCircle.button.style.position = "absolute";
centerCircle.button.style.margin = "0px";
centerCircle.button.style.top = "50%";
centerCircle.button.style.left = "50%";
centerCircle.button.style.transform = "translate(-50%, -50%)";
centerCircle.button.style.backgroundImage = "none";
centerCircle.button.style.backgroundColor = "transparent";
centerCircle.button.style.color = "transparent";
centerCircle.button.style.outline = "none";
centerCircle.button.style.borderWidth = "10px";
centerCircle.button.style.borderColor = "#" + flameColor.toString(16);
centerCircle.button.style.textDecoration = "none";
centerCircle.button.style.visibility = "hidden";
document.body.appendChild(centerCircle.button); */

app.stage.addChild(centerCircle);

centerCircle.anchor.set(0.5, 0.5);
let loadingProgress = new Graphics();
loadingProgress.scale.x = 0.5;
loadingProgress.scale.y = 0.5;
centerCircle.addChild(loadingProgress);

centerCircle.textStyle = new PIXI.TextStyle({
    align: 'center',
    fill: '#ffffff',
    fontSize: 36,
});
centerCircle.text = new PIXI.Text('loading', centerCircle.textStyle);
centerCircle.text.anchor.x = 0.5;
centerCircle.text.anchor.y = 0.5;
centerCircle.addChild(centerCircle.text);

centerCircle.down = false;
centerCircle.over = false;
centerCircle.pointerdown = (e) => {
    centerCircle.down = true;
};
centerCircle.pointercancel = (e) => {
    centerCircle.down = false;
};
centerCircle.pointerup = (e) => {
    centerCircle.down = false;
};
centerCircle.pointerupoutside = (e) => {
    centerCircle.down = false;
};
centerCircle.pointerover = (e) => {
    centerCircle.over = true;
};
centerCircle.pointerout = (e) => {
    centerCircle.over = false;
};


loader.add('pebbles', 'images/pebbles.png')
    .add('pebbles_n', 'images/pebbles_n.png')
    .add('fire', 'sounds/fire.mp3')
    .add('flame', 'sounds/flame.mp3')
    .on('progress', loadProgressHandler)
    .load(setup);

function loadProgressHandler(loader, resource) {
    let angle = loader.progress/100 * 2 * Math.PI - Math.PI/2;
    loadingProgress.clear();
    loadingProgress.lineStyle(20, 0xffffff);
    loadingProgress.arc(0, 0, centerCircleRadius*2 - 10, -Math.PI/2, angle);
    loadingProgress.endFill();
}

let state;
    max_duration = 40;
    max_height = 0.008;
    max_brightness = 10/window.devicePixelRatio;
    max_velocity = 5;
    min_velocity = 2;
    decay_rate = 0.2;

let points, last_points, downs, sounds;
let flame_sound, fire_sound;
let sparkles;

let background;

function setup(loader, resources) {
    // Add the background diffuse color
    let diffuse = new PIXI.extras.TilingSprite(
        resources.pebbles.texture,
        SIZE,
        SIZE,
    );
    diffuse.parentGroup = diffuseGroup;

    // Add the background normal map
    let normals = new PIXI.extras.TilingSprite(
        resources.pebbles_n.texture,
        SIZE,
        SIZE,
    );
    normals.parentGroup = normalGroup;

    sparkles = new Container(); //ParticleContainer();

    //stage.addChild(new PIXI.lights.AmbientLight(0xFFFFFF, 0.2));

    // Create a background container
    background = new Container();
    background.addChild(
        normals,
        diffuse,
        sparkles,
    );
    background.visible = false;

    app.stage.addChild(
        // put all layers for deferred rendering of normals
        new Layer(diffuseGroup),
        new Layer(normalGroup),
        new Layer(lightGroup),
        // Add the lights and images
        background
    );

    fire_sound = resources.fire.sound;
    fire_sound.volume = 0.2;

    flame_sound = resources.flame.sound;
    flame_sound.volume = 0.5;

    resetPoints();

    app.renderer.plugins.interaction.on('pointermove', event => {
        if (state === play) {
            let point = event.data.global;
            point = new PIXI.Point((point.x - app.stage.x) / app.stage.scale.x, (point.y - app.stage.y) / app.stage.scale.y);
            points[event.data.pointerId] = point;

            id = event.data.pointerId;
            if (last_points.hasOwnProperty(id) && last_points[id] !== null) {
                let last_point = last_points[id];
                let vx = point.x - last_point.x;
                let vy = point.y - last_point.y;
                let velocity = new PIXI.Point(vx, vy);

                if (velocities.hasOwnProperty(id) && velocities[id] !== null) {
                    let last_velocity = velocities[id];
                    let ax = vx - last_velocity.x;
                    let ay = vy -last_velocity.y;
                    let acceleration = Math.sqrt(ax*ax + ay*ay) * window.devicePixelRatio;
                    let speed = Math.sqrt(vx*vx + vy*vy) * window.devicePixelRatio;

                    let start_time = Math.random() * (flame_sound.duration - 0.6);
                    let end_time = start_time + 0.6;
                    sounds[id] = flame_sound.play({loop: false, start: start_time, end: end_time,})
                    sounds[id].volume = Math.min(0.5, acceleration/40) + Math.min(0.5, speed/200);
                }


                velocities[id] = velocity;
            }
        }
    });

    app.renderer.plugins.interaction.on('pointerdown', event => {
        if (event.data.pointerId >= 10) {
            downs[1] = false;
            try {
                sounds[1].stop()
            } catch(err) {}
        }

        if (state === play) {
            let point = event.data.global;
            point = new PIXI.Point((point.x - app.stage.x)/app.stage.scale.x, (point.y - app.stage.y)/app.stage.scale.y);
            points[event.data.pointerId] = point;
            downs[event.data.pointerId] = true;
        }
    });

    app.renderer.plugins.interaction.on('pointerup', event => {
        downs[event.data.pointerId] = false;
        last_points[event.data.pointerId] = null;
        velocities[event.data.pointerId] = null;
    });
    app.renderer.plugins.interaction.on('pointerupoutside', event => {
        downs[event.data.pointerId] = false;
        last_points[event.data.pointerId] = null;
        velocities[event.data.pointerId] = null;
    });
    app.renderer.plugins.interaction.on('pointerout', event => {
        downs[event.data.pointerId] = false;
        last_points[event.data.pointerId] = null;
        velocities[event.data.pointerId] = null;
    });
    app.renderer.plugins.interaction.on('pointercancel', event => {
        downs[event.data.pointerId] = false;
        last_points[event.data.pointerId] = null;
        velocities[event.data.pointerId] = null;
    });

    state = loading;
    app.ticker.add(loop);

    if (screenfull.enabled) {
        screenfull.on('change', fullScreenChange);
    }

    centerCircle.text.text = 'begin';
    centerCircle.textStyle.fill = flameColor;
    //loadingProgress.tint = flameColor;
    loadingProgress.clear();
    loadingProgress.lineStyle(20, flameColor);
    loadingProgress.drawCircle(0, 0, centerCircleRadius*2 - 10);
    loadingProgress.endFill();

    //centerCircle.button.style.visibility = "visible";
    //loadingProgress.visible = false;
    centerCircle.interactive = true;
    centerCircle.buttonMode = true;
    centerCircle.pointertap = centerCircle.click = fulllScreenButtonAction;
}

function resetPoints() {
    points = {};
    last_points = {};
    velocities = {};
    downs = {};
    sounds = {};
}
function fulllScreenButtonAction(event) {
    requestFullScreen();
    state = play;
    background.visible = true;
    centerCircle.visible = false;
    resize();
    resetPoints();
}

function fullscreenChangeHandler() {
    fullScreenChange();
    resize();
}

function fullScreenChange() {
    if (!screenfull.isFullscreen) {
        resetPoints();

        state = loading;
        background.visible = false;
        centerCircle.visible = true;
    }
}

function loop(delta){
    resize();
    state(delta);
}
function loading(delta) {
    if (centerCircle.over || centerCircle.down) {
        loadingProgress.scale.x = Math.min(0.7, loadingProgress.scale.x * 1.1);
        loadingProgress.scale.y = Math.min(0.7, loadingProgress.scale.y * 1.05);
    } else {
        loadingProgress.scale.x = Math.max(0.3, loadingProgress.scale.x * 0.9);
        loadingProgress.scale.y = Math.max(0.3, loadingProgress.scale.y * 0.95);
    }

    for (let id in sounds) {
        if (sounds.hasOwnProperty(id)) {
            try {
                sounds[id].stop()
            } catch(err) {}
        }
    }
}
function play(delta) {
    //if (pointerDown) {
    for (let id in downs) {
        if (!downs.hasOwnProperty(id)) {
            continue;
        }

        if (sounds.hasOwnProperty(id)) {
            try {
                sounds[id].volume *= Math.pow(0.5, delta);
            } catch (err) {}
        }

        let down = downs[id];
        let point = points[id];

        if (down === false) {
            continue;
        }

        for (let i = 0; i < 1; i++) {
            // Create the point light
            const light = new PIXI.lights.PointLight(flameColor, max_brightness); //, 300);
            light.lightHeight = max_height;
            light.x = point.x + Math.random() * 20 - 10;
            light.y = point.y + Math.random() * 20 - 10;

            let angle = (Math.random() - 1.5) * Math.PI/2

            let velocity = Math.random() * (max_velocity - min_velocity) + min_velocity;
            light.vx = Math.cos(angle) * velocity;
            light.vy = Math.sin(angle) * velocity;

            light.duration = Math.random() * max_duration;

            const start_time = 2 + Math.random() * (fire_sound.duration - light.duration/60 - 4);
            const end_time = start_time + light.duration/60 + 1;

            light.sound = fire_sound.play({start: start_time, end: end_time});

            //let r = 1;
            //light.falloff = [1, 2/r, 1/r/r];
            sparkles.addChild(light);
        }

        last_points[id] = point;
    }

    removes = [];
    sparkles.children.forEach(e => {
        e.x += e.vx * delta;
        e.y += e.vy * delta;

        //e.vx *= Math.pow(1.01, delta);
        //e.vy -= 0.3;
        e.vy *= Math.pow(1.03, delta);

        e.lightHeight = max_height * Math.pow(e.duration/max_duration, decay_rate);
        e.brightness = max_brightness * Math.pow(e.duration/max_duration, decay_rate);
        try {
            e.sound.volume = Math.sqrt(e.duration/max_duration);
        } catch(err) {
        }

        e.duration -= delta;
        if (e.duration < 0) {
            removes.push(e);
        }
    });

    removes.forEach(e => {
        e.sound.stop();
        sparkles.removeChild(e);
    });
}