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

let SIZE = 640;
let ratio = window.devicePixelRatio;

//Create a Pixi Application
let app = new Application({
    antialias: false,    // default: false
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

let centerCircleRadius = 200;
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
loadingProgress.scale.x = 0.25;
loadingProgress.scale.y = 0.25;
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
    loadingProgress.lineStyle(40, 0xffffff);
    loadingProgress.arc(0, 0, centerCircleRadius*2 - 20, -Math.PI/2, angle);
    loadingProgress.endFill();
}

let state;
    max_duration = 40;
    max_height = 0.008;
    max_brightness = 8/window.devicePixelRatio;
    max_velocity = 5;
    min_velocity = 2;
    decay_rate = 0.2;

let points, last_points, downs;
let pointer_flame_sounds = {}, pointer_fire_sounds = {};
let flame_sound, fire_sound;
let flame_sounds, fire_sounds;
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
    //fire_sound.volume = 0.1;
    fire_sound.volume = 0.5;
    fire_sounds = [];
    for (let i = 0; i < 11; i++) {
        //fire_sounds.push(Object.assign(Object.create( Object.getPrototypeOf(fire_sound)), fire_sound));
        //fire_sounds[i].play({start: Math.random() * (fire_sound.duration - 1), loop: true});
        fire_sounds.push(fire_sound.play({start: Math.random() * (fire_sound.duration - 1), loop: true}));
        fire_sounds[i].volume = 0;
    }

    flame_sound = resources.flame.sound;
    //flame_sound.volume = 0.7;
    flame_sound.volume = 2;
    flame_sounds = [];
    for (let i = 0; i < 11; i++) {
        flame_sounds.push(flame_sound.play({start: Math.random() * (flame_sound.duration - 1), loop: true}));
        flame_sounds[i].volume = 0;
    }

    resetPoints();

    app.renderer.plugins.interaction.on('pointermove', event => {
        if (state === play) {
            if (!pointer_flame_sounds.hasOwnProperty(event.data.pointerId)) {
                pointer_flame_sounds[event.data.pointerId] = flame_sounds[pointer_flame_sounds.length];
                pointer_flame_sounds.length += 1
            }

            let point = event.data.global;
            point = new PIXI.Point((point.x - app.stage.x) / app.stage.scale.x, (point.y - app.stage.y) / app.stage.scale.y);
            points[event.data.pointerId] = point;

            let id = event.data.pointerId;
            if (last_points.hasOwnProperty(id) && last_points[id] !== null) {
                let last_point = last_points[id];
                let vx = point.x - last_point.x;
                let vy = point.y - last_point.y;
                let velocity = new PIXI.Point(vx, vy);

                //if (velocities.hasOwnProperty(id) && velocities[id] !== null) {
                //    let last_velocity = velocities[id];
                //    let ax = vx - last_velocity.x;
                //    let ay = vy - last_velocity.y;
                //    let acceleration = Math.sqrt(ax*ax + ay*ay) * window.devicePixelRatio;
                let speed = Math.sqrt(vx*vx + vy*vy) * window.devicePixelRatio;
                try {
                    pointer_flame_sounds[id].volume = pointer_flame_sounds[id].volume * 0.6 + 0.4 * Math.min(1, speed/30);
                } catch (err) {}
                    //sounds[id].volume = 0.75 * Math.min(1, speed/100) + 0.25 * Math.min(1, acceleration/20);
                //}


                //velocities[id] = velocity;
            }
        }
    });

    app.renderer.plugins.interaction.on('pointerdown', event => {
        if (event.data.pointerId >= 10) {
            downs[1] = false;
        }

        if (state === play) {
            if (!pointer_fire_sounds.hasOwnProperty(event.data.pointerId)) {
                pointer_fire_sounds[event.data.pointerId] = fire_sounds[pointer_fire_sounds.length];
                pointer_fire_sounds.length += 1
            }
            try {
                pointer_fire_sounds[event.data.pointerId].volume = 1;
            } catch (err) {}

            let point = event.data.global;
            point = new PIXI.Point((point.x - app.stage.x)/app.stage.scale.x, (point.y - app.stage.y)/app.stage.scale.y);
            points[event.data.pointerId] = point;
            downs[event.data.pointerId] = true;
        }
    });

    function pointerUpHandler(event) {
        downs[event.data.pointerId] = false;
        last_points[event.data.pointerId] = null;
        try {
            pointer_fire_sounds[event.data.pointerId].volume = 0;
        } catch (err) {}
        //velocities[event.data.pointerId] = null;
    }
    app.renderer.plugins.interaction.on('pointerup', pointerUpHandler);
    app.renderer.plugins.interaction.on('pointerupoutside', pointerUpHandler);
    app.renderer.plugins.interaction.on('pointerout', pointerUpHandler);
    app.renderer.plugins.interaction.on('pointercancel', pointerUpHandler);

    state = loading;
    app.ticker.add(loop);

    if (screenfull.enabled) {
        screenfull.on('change', fullScreenChange);
    }

    centerCircle.text.text = 'begin';
    centerCircle.textStyle.fill = flameColor;
    //loadingProgress.tint = flameColor;
    loadingProgress.clear();
    loadingProgress.lineStyle(40, flameColor);
    loadingProgress.drawCircle(0, 0, centerCircleRadius*2 - 20);
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
    //velocities = {};
    downs = {};

    Object.keys(pointer_flame_sounds).forEach(e => {
        if (pointer_flame_sounds.hasOwnProperty(e)) {
            try {
                pointer_flame_sounds[e].volume = 0;
            } catch (err) {}
        }
    });
    Object.keys(pointer_fire_sounds).forEach(e => {
        if (pointer_fire_sounds.hasOwnProperty(e)) {
            try {
                pointer_fire_sounds[e].volume = 0;
            } catch (err) {}
        }
    });


    pointer_flame_sounds = {};
    pointer_flame_sounds.length = 0;
    pointer_fire_sounds = {};
    pointer_fire_sounds.length = 0;
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
        loadingProgress.scale.x = Math.min(0.35, loadingProgress.scale.x * 1.1);
        loadingProgress.scale.y = Math.min(0.35, loadingProgress.scale.y * 1.05);
    } else {
        loadingProgress.scale.x = Math.max(0.15, loadingProgress.scale.x * 0.9);
        loadingProgress.scale.y = Math.max(0.15, loadingProgress.scale.y * 0.95);
    }
}
function play(delta) {
    //if (pointerDown) {
    for (let id in downs) {
        if (!downs.hasOwnProperty(id)) {
            continue;
        }

        if (pointer_flame_sounds.hasOwnProperty(id)) {
            try {
                pointer_flame_sounds[id].volume *= Math.pow(0.95, delta);
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

        e.duration -= delta;
        if (e.duration < 0) {
            removes.push(e);
        }
    });

    removes.forEach(e => {
        sparkles.removeChild(e);
    });
}