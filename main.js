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

let ratio = window.devicePixelRatio;
alert(ratio);

//Create a Pixi Application
let app = new Application({
    antialias: true,    // default: false
    transparent: false, // default: false
    resolution: ratio,       // default: 1
});

app.renderer.view.style.position = "absolute";
app.renderer.view.style.display = "block";
app.renderer.autoResize = true;

resize();
window.onresize = resize;
function resize() {
    app.renderer.resize(window.innerWidth, window.innerHeight);
}

//Add the canvas that Pixi automatically created for you to the HTML document
document.body.appendChild(app.view);

let stage = app.stage = new PIXI.display.Stage();

document.onclick = requestFullScreen;
document.onpointerdown = requestFullScreen;

function requestFullScreen(event) {
    //event.preventDefault();

    let docelem = document.documentElement;

    if (docelem.requestFullscreen) {
        docelem.requestFullscreen();
    }
    else if (docelem.mozRequestFullScreen) {
        docelem.mozRequestFullScreen();
    }
    else if (docelem.webkitRequestFullScreen) {
        docelem.webkitRequestFullScreen();
    }
    else if (docelem.msRequestFullscreen) {
        docelem.msRequestFullscreen();
    }
}

loader.add('pebbles', 'images/pebbles.png')
    .add('pebbles_n', 'images/pebbles_n.png')
    .add('fire', 'sounds/fire.mp3')
    .add('flame', 'sounds/flame.mp3')
    .load(setup);

let state;
    max_duration = 50;
    max_height = 0.01;
    max_brightness = 10;

let points, last_points, downs, sounds;
let flame_sound, fire_sound;
let sparkles;

function setup(loader, resources) {
    // Add the background diffuse color
    let diffuse;
    if (false) {
        diffuse = new Sprite(PIXI.Texture.WHITE);
        //diffuse.tint = 0xddffdd;
        diffuse.tint = 0x333333;
        diffuse.width = app.renderer.width;
        diffuse.height = app.renderer.height;
    } else {
        diffuse = new PIXI.extras.TilingSprite(
            resources.pebbles.texture,
            screen.width,
            screen.height,
        );
    }
    diffuse.parentGroup = diffuseGroup;

// Add the background normal map
    let normals;
    if (false) {
        normals = new Sprite(PIXI.Texture.WHITE);
        normals.tint = 0x8080ff;
        normals.width = app.screen.width;
        normals.height = app.screen.height;
    } else {
        normals = new PIXI.extras.TilingSprite(
            resources.pebbles_n.texture,
            screen.width,
            screen.height,
        );
    }
    normals.parentGroup = normalGroup;

    sparkles = new Container(); //ParticleContainer();

// Create a background container
    const background = new Container();
    background.addChild(
        normals,
        diffuse,
        sparkles
    );

    app.stage.addChild(
        // put all layers for deferred rendering of normals
        new Layer(diffuseGroup),
        new Layer(normalGroup),
        new Layer(lightGroup),
        // Add the lights and images
        background
    );

    fire_sound = resources.fire.sound;
    fire_sound.volume = 0.1;

    flame_sound = resources.flame.sound;
    flame_sound.volume = 2;

    points = {};
    last_points = {};
    downs = {};
    sounds = {};

    app.renderer.plugins.interaction.on('pointermove', event => {
        let point = event.data.global;
        point = new PIXI.Point(point.x, point.y);
        points[event.data.pointerId] = point;
    });

    app.renderer.plugins.interaction.on('pointerdown', event => {
        let point = event.data.global;
        point = new PIXI.Point(point.x, point.y);
        points[event.data.pointerId] = point;
        downs[event.data.pointerId] = true;
        sounds[event.data.pointerId] = flame_sound.play({loop: true, start: Math.random() * flame_sound.duration});
        sounds[event.data.pointerId].volume = 0;
    });

    app.renderer.plugins.interaction.on('pointerup', event => {
        //points[event.data.pointerId] = event.data.global;
        downs[event.data.pointerId] = false;
        if (sounds.hasOwnProperty(event.data.pointerId)) {
            sounds[event.data.pointerId].stop();
        }
    });
    app.renderer.plugins.interaction.on('pointerout', event => {
        //points[event.data.pointerId] = event.data.global;
        downs[event.data.pointerId] = false;
        if (sounds.hasOwnProperty(event.data.pointerId)) {
            sounds[event.data.pointerId].stop();
        }
    });

    state = play;
    app.ticker.add(delta => loop(delta));
}

function loop(delta){
    state(delta);
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

            if (sounds.hasOwnProperty(id)) {
                sounds[id].volume = 0.8 * sounds[id].volume + 0.2 * Math.min(1, speed/100);
            }
        }

        for (let i = 0; i < 1; i++) {
            // Create the point light
            const light = new PIXI.lights.PointLight(0xffffcc, max_brightness); //, 300);
            light.lightHeight = max_height;
            light.x = point.x;
            light.y = point.y;

            let angle = Math.random() * 2 * Math.PI;

            light.vx = Math.cos(angle) * 5;
            light.vy = Math.sin(angle) * 5;

            light.duration = Math.random() * max_duration;

            const start_time = Math.random() * (fire_sound.duration - light.duration/60);
            const end_time = start_time + light.duration/60;
            fire_sound.play({start: start_time, end: end_time});

            //let r = 1;
            //light.falloff = [1, 2/r, 1/r/r];
            sparkles.addChild(light);
        }

        last_points[id] = point;
    }

    sparkles.children.forEach(e => {
        e.x += e.vx * delta;
        e.y += e.vy * delta;

        //e.vx *= Math.pow(1.01, delta);
        e.vy -= 0.5;
        e.vy *= Math.pow(1.01, delta);

        e.lightHeight = max_height * e.duration/max_duration;
        e.brightness = max_brightness * e.duration/max_duration;

        e.duration -= delta;
        if (e.duration < 0) {
            sparkles.removeChild(e);
        }
    });
}