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

let SIZE = 1920;
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

let centerCircleRadius = 128;
let centerCircleGraphic = new Graphics();
centerCircleGraphic.beginFill(0x000000);
centerCircleGraphic.drawCircle(0, 0, centerCircleRadius);
centerCircleGraphic.endFill();

let flameColor = 0xffee99;

let centerCircle = new Sprite(app.renderer.generateTexture(centerCircleGraphic));
centerCircle.x = SIZE/2;
centerCircle.y = SIZE/2;

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
document.body.appendChild(centerCircle.button);

app.stage.addChild(centerCircle);

centerCircle.anchor.set(0.5, 0.5);
let loadingProgress = new Graphics();
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


loader.add('pebbles', 'images/pebbles.png')
    .add('pebbles_n', 'images/pebbles_n.png')
    .add('fire', 'sounds/fire.mp3')
    .add('flame', 'sounds/flame.mp3')
    .on('progress', loadProgressHandler)
    .load(setup);

function loadProgressHandler(loader, resource) {
    let angle = loader.progress/100 * 2 * Math.PI - Math.PI/2;
    loadingProgress.clear();
    loadingProgress.lineStyle(10, 0xffffff);
    loadingProgress.arc(0, 0, centerCircleRadius - 5, -Math.PI/2, angle);
    loadingProgress.endFill();
}

let state;
    max_duration = 30;
    max_height = 0.01;
    max_brightness = 10;

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
    fire_sound.volume = 0.5;

    flame_sound = resources.flame.sound;
    flame_sound.volume = 10;

    points = {};
    last_points = {};
    downs = {};
    sounds = {};

    app.renderer.plugins.interaction.on('pointermove', event => {
        if (state === play) {
            let point = event.data.global;
            point = new PIXI.Point((point.x - app.stage.x) / app.stage.scale.x, (point.y - app.stage.y) / app.stage.scale.y);
            points[event.data.pointerId] = point;
        }
    });

    app.renderer.plugins.interaction.on('pointerdown', event => {
        if (state === play) {
            let point = event.data.global;
            point = new PIXI.Point((point.x - app.stage.x)/app.stage.scale.x, (point.y - app.stage.y)/app.stage.scale.y);
            points[event.data.pointerId] = point;
            downs[event.data.pointerId] = true;

            sounds[event.data.pointerId] = flame_sound.play({loop: true, start: Math.random() * flame_sound.duration});
            sounds[event.data.pointerId].volume = 0.1;
        }
    });

    app.renderer.plugins.interaction.on('pointerup', event => {
        if (state === play) {
            downs[event.data.pointerId] = false;
            if (sounds.hasOwnProperty(event.data.pointerId)) {
                sounds[event.data.pointerId].stop();
            }
        }
    });
    app.renderer.plugins.interaction.on('pointerupoutside', event => {
        if (state === play) {
            downs[event.data.pointerId] = false;
            if (sounds.hasOwnProperty(event.data.pointerId)) {
                sounds[event.data.pointerId].stop();
            }
        }
    });
    app.renderer.plugins.interaction.on('pointerout', event => {
        if (state === play) {
            downs[event.data.pointerId] = false;
            if (sounds.hasOwnProperty(event.data.pointerId)) {
                sounds[event.data.pointerId].stop();
            }
        }
    });
    app.renderer.plugins.interaction.on('pointercancel', event => {
        if (state === play) {
            downs[event.data.pointerId] = false;
            if (sounds.hasOwnProperty(event.data.pointerId)) {
                sounds[event.data.pointerId].stop();
            }
        }
    });

    state = loading;
    app.ticker.add(loop);

    if (screenfull.enabled) {
        screenfull.on('change', fullScreenChange);
    }

    centerCircle.text.text = 'begin';
    centerCircle.textStyle.fill = flameColor;
    centerCircle.button.style.visibility = "visible";
    //loadingProgress.visible = false;
    centerCircle.button.onclick = fulllScreenButtonAction;
}

function resetPoints() {
    for (let id in sounds) {
        if (sounds.hasOwnProperty(id)) {
            try {
                sounds[id].stop()
            } catch {}
        }
    }
    points = {};
    last_points = {};
    downs = {};
    sounds = {};
}
function fulllScreenButtonAction(event) {
    requestFullScreen();

    resetPoints();
}

function fullscreenChangeHandler(event) {
    fullScreenChange();
    resize();
}

function fullScreenChange() {
    if (!screenfull.isFullscreen) {
        points = {};
        last_points = {};
        downs = {};
        sounds = {};

        state = loading;
        background.visible = false;
        centerCircle.visible = true;
    } else {
        state = play;
        background.visible = true;
        centerCircle.visible = false;
    }

}

function loop(delta){
    fullScreenChange();
    state(delta);
}
function loading(delta) {
    for (let id in sounds) {
        if (sounds.hasOwnProperty(id)) {
            try {
                sounds[id].stop()
            } catch {}
        }
    }
}
function play(delta) {
    //if (pointerDown) {
    for (let id in downs) {
        if (!downs.hasOwnProperty(id)) {
            continue;
        }

        let down = downs[id];
        let point = points[id];

        if (down === false) {
            continue;
        }

        if (last_points.hasOwnProperty(id)) {
            let last_point = last_points[id];
            let vx = point.x - last_point.x;
            let vy = point.y - last_point.y;
            let speed = Math.sqrt(vx*vx + vy*vy);

            try {
                sounds[id].volume = 0.6 * sounds[id].volume + 0.4 * Math.min(1, speed/100);
            } catch {}
        }

        for (let i = 0; i < 1; i++) {
            // Create the point light
            const light = new PIXI.lights.PointLight(flameColor, max_brightness); //, 300);
            light.lightHeight = max_height;
            light.x = point.x;
            light.y = point.y;

            let angle = Math.random() * 2 * Math.PI;

            light.vx = Math.cos(angle) * 2;
            light.vy = Math.sin(angle) * 2;

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
        e.vy -= 0.5;
        e.vy *= Math.pow(1.01, delta);

        e.lightHeight = max_height * e.duration/max_duration;
        e.brightness = max_brightness * e.duration/max_duration;
        try {
            e.sound.volume = e.duration/max_duration;
        } catch {
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