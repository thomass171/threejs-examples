/**
 * Optional parameter are
 */

// Find the latest version by visiting https://unpkg.com/three.
import * as THREE from './three.js-r128/build/three.module.js';

import { VRButton } from './three.js-r128/examples/jsm/webxr/VRButton.js';
import { HTMLMesh } from './three.js-r128/examples/jsm/interactive/HTMLMesh.js';
import { InteractiveGroup } from './three.js-r128/examples/jsm/interactive/InteractiveGroup.js';
//needs GLTFLoader import { XRControllerModelFactory } from './three.js-r128/examples/jsm/webxr/XRControllerModelFactory.js';
//
import { FirstPersonControls } from './three.js-r128/examples/jsm/controls/FirstPersonControls.js';
import Stats from './three.js-r128/examples/jsm/libs/stats.module.js'

var logger = new ConsoleLogger();

var clock;
var container, world, worldOffset;
var camera, scene, renderer, bar, box1, ground, wall;

var tempMatrix;
var framecnt = 0;
var adjust = new THREE.Vector3();
var rotangle = 0;

var vrmode;
var initialAdjust = -0.1;
var lightmode = 0;
var pointlight = null;
var cycle = 0;
var maxCycle = 2;

var controls, stats;


function init() {
    logger.debug("init");

    var searchParams = new URLSearchParams(window.location.search);


    clock = new THREE.Clock();
    tempMatrix = new THREE.Matrix4();

    container = document.createElement( 'div' );
    document.body.appendChild( container );

    scene = new THREE.Scene();
    scene.background = new THREE.Color( 0x909090 );

    world = new THREE.Group();
    scene.add( world );

    camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 0.1, 10 );
    camera.position.set(0,1,0);
    scene.add( camera );


    addLight();

    var geometry = new THREE.BoxGeometry( 0.15, 0.15, 0.15 );
    box1 = new THREE.Mesh( geometry, new THREE.MeshLambertMaterial( { color:  0xff0000 } ) );
    box1.position.set(-1,1,-2);
    world.add(box1);

    bar = new THREE.Mesh( new THREE.BoxGeometry( 0.1, 0.1, 1 ), new THREE.MeshLambertMaterial( { color:  0x0000ff }) );
    bar.position.set(0,1,-2);
    world.add(bar);

    addGround();

    renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    container.appendChild( renderer.domElement );

    window.addEventListener( 'resize', onWindowResize, false );

    controls = new FirstPersonControls( camera, renderer.domElement );
    controls.movementSpeed = 1.50;
    controls.lookSpeed = 0.1;

    stats = new Stats();
    stats.showPanel( 0 ); // 0: fps, 1: ms, 2: mb, 3+: custom
    document.body.appendChild( stats.dom );
    //stats.begin();
}

function info() {
    console.log("camera.position= ",camera.position);
    logger.debug("ReferenceSpace=" + renderer.xr.getReferenceSpace());
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );

    controls.handleResize();
}

function animate() {
    // r97: setAnimationLoop instead of animate
    renderer.setAnimationLoop( render );
}

function render() {
    var delta = clock.getDelta() * 60;

    // without stats there seems to be no regular rerender (stuttering scene).
    stats.update();
    controls.update( clock.getDelta() );

    //pollControllerEvents(renderer, vrControllerEventMap);
    renderer.render( scene, camera );
    framecnt++;
}

function buildCylinder() {
    var geometry = new THREE.CylinderGeometry( 0.05, 0.05, 0.1, 32 );
    var material = new THREE.MeshBasicMaterial( {color: 0xffff00} );
    var cylinder = new THREE.Mesh( geometry, material );
    return cylinder;
}

function addGround() {
    var groundmat = new THREE.MeshLambertMaterial( { color:  0x884444,wireframe:true } );
    ground = new THREE.Mesh(  new THREE.PlaneGeometry( 10, 10, 10, 10 ), groundmat );
    ground.position.set(0,0,0);
    ground.rotation.x = -Math.PI / 2;
    world.add(ground);
}

function addLight() {

    switch (lightmode) {
        case 0: /*default*/
            logger.debug("Adding default light");
            world.add( new THREE.HemisphereLight( 0x606060, 0x404040 ) );
            var light = new THREE.DirectionalLight( 0xffffff );
            light.position.set( 1, 1, 1 ).normalize();
            world.add( light );
            break;
        case 1:
            logger.debug("Adding point light");
            pointlight = new THREE.PointLight( 0xffffff );
            pointlight.position.set( -2, 1, -3 ).normalize();
            world.add( pointlight );
            break;
    }
}

init();
animate();