// Features
// 1) highlights red box when it is hit by crosshair
// 2) red box and blue balken can be grabbed and moved by trigger

// Find the latest version by visiting https://unpkg.com/three.
// 128 contains latest integration of GUI to VR.
//import * as THREE from 'https://unpkg.com/three@0.128.0/build/three.module.js';
import * as THREE from './three.js-r128/build/three.module.js';

// from https://threejs.org/docs/#manual/en/introduction/How-to-create-VR-content
import { VRButton } from './three.js-r128/examples/jsm/webxr/VRButton.js';
import { GUI } from './three.js-r128/examples/jsm/libs/dat.gui.module.js';
import { HTMLMesh } from './three.js-r128/examples/jsm/interactive/HTMLMesh.js';
import { InteractiveGroup } from './three.js-r128/examples/jsm/interactive/InteractiveGroup.js';
//needs GLTFLoader import { XRControllerModelFactory } from './three.js-r128/examples/jsm/webxr/XRControllerModelFactory.js';

// Threejs examples:
// https://github.com/mrdoob/three.js/blob/master/examples/webxr_vr_sandbox.html

var logger = new ConsoleLogger();

var clock;
var container;
var camera, scene, raycaster, renderer, balken, box1,ground;
var  avatar;
var isMouseDown = false;
var INTERSECTED;
//var group;
var crosshair;
var controller1, controller2, lineraycaster,intersected = [];
var tempMatrix;

const prevGamePads = new Map();
var speedFactor = [0.1, 0.1, 0.1, 0.1];
var framecnt = 0;

const parameters = {
    radius: 0.5,
    tube: 0.2,
    tubularSegments: 150,
    radialSegments: 20,
    p: 2,
    q: 3
};



function init() {
    logger.debug("init");

    clock = new THREE.Clock();
    tempMatrix = new THREE.Matrix4();

    container = document.createElement( 'div' );
    document.body.appendChild( container );

    scene = new THREE.Scene();
    scene.background = new THREE.Color( 0x909090 );

    //var group = new THREE.Group();
    //scene.add( group );

    camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 0.1, 10 );
    //camera will be attached to avatar
    //scene.add( camera );

    crosshair = new THREE.Mesh(
        new THREE.RingGeometry( 0.02, 0.04, 32 ),
        new THREE.MeshBasicMaterial( {
            color: 0xffffff,
            opacity: 0.5,
            transparent: true
        } )
    );
    crosshair.position.z = - 2;
    camera.add( crosshair );

    //avatar = new THREE.Object3D();
    avatar = new THREE.Mesh( new THREE.BoxGeometry( 0.1, 0.1, 0.1 ), new THREE.MeshLambertMaterial( { color:  0x00ff00 } ) );
    //Seit r97 muss avatar auf den Ground avatar.position.set(0,1,0);
    //Im Sitzen ist er trotzdem zu hoch, weil er von der Kalibrierungshöhe (190) ausgeht.
    //Darum noch 70 runter. Dann passt es gut, auch wenn man die green box nicht mehr sieht.
    avatar.position.set(0,-0.7,0);
    avatar.add(camera);
    scene.add(avatar);

    scene.add( new THREE.HemisphereLight( 0x606060, 0x404040 ) );

    var light = new THREE.DirectionalLight( 0xffffff );
    light.position.set( 1, 1, 1 ).normalize();
    scene.add( light );

    var geometry = new THREE.BoxGeometry( 0.15, 0.15, 0.15 );
    box1 = new THREE.Mesh( geometry, new THREE.MeshLambertMaterial( { color:  0xff0000 } ) );
    box1.position.set(-1,1,-2);
    scene.add(box1);

    balken = new THREE.Mesh( new THREE.BoxGeometry( 0.1, 0.1, 1 ), new THREE.MeshLambertMaterial( { color:  0x0000ff }) );
    balken.position.set(0,1,-2);
    scene.add(balken);

    geometry = new THREE.PlaneGeometry( 5, 5 );
    ground = new THREE.Mesh( geometry, new THREE.MeshLambertMaterial( { color:  0x888888 } ) );
    ground.position.set(0,0,0);
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    raycaster = new THREE.Raycaster();

    renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    container.appendChild( renderer.domElement );

    document.body.appendChild( VRButton.createButton( renderer ) );
    renderer.vr.enabled = true;

    renderer.domElement.addEventListener( 'mousedown', onMouseDown, false );
    renderer.domElement.addEventListener( 'mouseup', onMouseUp, false );
    renderer.domElement.addEventListener( 'touchstart', onMouseDown, false );
    renderer.domElement.addEventListener( 'touchend', onMouseUp, false );

    window.addEventListener( 'resize', onWindowResize, false );

    function onDocumentKeyDown(event) {
        logger.debug("event" + event.keyCode);

        switch (event.keyCode) {
            case 66: /*b*/
                avatar.position.setX(avatar.position.x+1);
                //camera.position.set( 15, -10, 120 );
                logger.debug("x="+avatar.position.x);
                break;
            case 67: /*c*/
                avatar.position.setX(avatar.position.x-1);
                //camera.position.set( 15, -10, 120 );
                logger.debug("x="+avatar.position.x);
                break;
        }
    }
    document.addEventListener("keydown", onDocumentKeyDown, false);


    //see WebVRManager.js
    // Controller need to be attached to Avatar, damit die Höhe passt.
    //Die kann man offenbar schon anlegen, bevor WebVR aktiv ist. Erst beim enableVR werden die dann mit Leben gefüllt.
    controller1 = renderer.xr.getController( 0 );
    controller1.addEventListener( 'selectstart', onSelectStart );
    controller1.addEventListener( 'selectend', onSelectEnd );
    avatar.add( controller1 );
    controller2 = renderer.xr.getController( 1 );
    controller2.addEventListener( 'selectstart', onSelectStart );
    controller2.addEventListener( 'selectend', onSelectEnd );
    avatar.add( controller2 );
    var geometry = new THREE.BufferGeometry().setFromPoints( [ new THREE.Vector3( 0, 0, 0 ), new THREE.Vector3( 0, 0, - 1 ) ] );
    var line = new THREE.Line( geometry );
    line.name = 'line';
    line.scale.z = 5;
    controller1.add( line.clone() );
    controller2.add( line.clone() );
    lineraycaster = new THREE.Raycaster();

    var cylinder = buildCylinder();
    controller1.add(cylinder);

    // GUI
    function onChange() {}

    const gui = new GUI( { width: 300 } );
    gui.add( parameters, 'radius', 0.0, 1.0 ).onChange( onChange );
    gui.add( parameters, 'tube', 0.0, 1.0 ).onChange( onChange );
    gui.add( parameters, 'tubularSegments', 10, 150, 1 ).onChange( onChange );
    gui.add( parameters, 'radialSegments', 2, 20, 1 ).onChange( onChange );
    gui.add( parameters, 'p', 1, 10, 1 ).onChange( onChange );
    gui.add( parameters, 'q', 0, 10, 1 ).onChange( onChange );
    gui.domElement.style.visibility = 'hidden';

    const igroup = new InteractiveGroup( renderer, camera );
    scene.add( igroup );

    const mesh = new HTMLMesh( gui.domElement );
    mesh.position.x = - 0.75;
    mesh.position.y = 1.5;
    mesh.position.z = - 1.5;
    //mesh.rotation.y = Math.PI / 4;
    mesh.scale.setScalar( 2 );
    igroup.add( mesh );
}

function onMouseDown() {
    isMouseDown = true;
}

function onMouseUp() {
    isMouseDown = false;
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
}

function animate() {
    // r97: setAnimationLoop instead of animate
    renderer.setAnimationLoop( render );
}

function onSelectStart( event ) {
    logger.debug("onSelectStart");
    var controller = event.target;
    var intersections = getControllerRayIntersectionsOfBoxOrBalken( controller );
    if ( intersections.length > 0 ) {
        //grab box or balken
        var intersection = intersections[ 0 ];
        tempMatrix.getInverse( controller.matrixWorld );
        var object = intersection.object;
        object.matrix.premultiply( tempMatrix );
        object.matrix.decompose( object.position, object.quaternion, object.scale );
        object.material.emissive.b = 1;
        controller.add( object );
        controller.userData.selected = object;
    }
}

function onSelectEnd( event ) {
    var controller = event.target;
    if ( controller.userData.selected !== undefined ) {
        // release box or balken
        var object = controller.userData.selected;
        object.matrix.premultiply( controller.matrixWorld );
        object.matrix.decompose( object.position, object.quaternion, object.scale );
        object.material.emissive.b = 0;
        scene.add( object );
        controller.userData.selected = undefined;
    }
}

function getControllerRayIntersectionsOfBoxOrBalken( controller ) {
    tempMatrix.identity().extractRotation( controller.matrixWorld );
    lineraycaster.ray.origin.setFromMatrixPosition( controller.matrixWorld );
    lineraycaster.ray.direction.set( 0, 0, -1 ).applyMatrix4( tempMatrix );
    return lineraycaster.intersectObjects( /*group.children*/[box1,balken] );
}

function intersectObjects( controller ) {
    // Do not highlight when already selected
    if ( controller.userData.selected !== undefined ) return;
    var line = controller.getObjectByName( 'line' );
    var intersections = getControllerRayIntersectionsOfBoxOrBalken( controller );
    if ( intersections.length > 0 ) {
        var intersection = intersections[ 0 ];
        var object = intersection.object;
        object.material.emissive.r = 1;
        intersected.push( object );
        line.scale.z = intersection.distance;
    } else {
        line.scale.z = 5;
    }
}

function cleanIntersected() {
    while ( intersected.length ) {
        var object = intersected.pop();
        object.material.emissive.r = 0;
    }
}

function render() {
    var delta = clock.getDelta() * 60;

    //18.10.18: THREE.VRController.update();

    if ( isMouseDown === true ) {
        //var cube = room.children[ 0 ];
        //room.remove( cube );

        //cube.position.set( 0, 0, - 0.75 );
        //cube.position.applyQuaternion( camera.quaternion );
        //cube.userData.velocity.x = ( Math.random() - 0.5 ) * 0.02 * delta;
        //cube.userData.velocity.y = ( Math.random() - 0.5 ) * 0.02 * delta;
        //cube.userData.velocity.z = ( Math.random() * 0.01 - 0.05 ) * delta;
        //cube.userData.velocity.applyQuaternion( camera.quaternion );
        //room.add( cube );
    }

    // find controller intersection
    cleanIntersected();
    intersectObjects( controller1 );
    intersectObjects( controller2 );

    // find crosshair intersections (box1 only?)
    raycaster.setFromCamera( { x: 0, y: 0 }, camera );
    var intersects = raycaster.intersectObjects( [box1] );
    if ( intersects.length > 0 ) {
        if ( INTERSECTED != intersects[ 0 ].object ) {
            if ( INTERSECTED ) INTERSECTED.material.emissive.setHex( INTERSECTED.currentHex );

            INTERSECTED = intersects[ 0 ].object;
            INTERSECTED.currentHex = INTERSECTED.material.emissive.getHex();
            INTERSECTED.material.emissive.setHex( 0xff0000 );
        }

    } else {
        if ( INTERSECTED ) INTERSECTED.material.emissive.setHex( INTERSECTED.currentHex );
        INTERSECTED = undefined;
    }

    renderer.render( scene, camera );
    framecnt++;
}

function buildCylinder() {
    var geometry = new THREE.CylinderGeometry( 0.05, 0.05, 0.1, 32 );
    var material = new THREE.MeshBasicMaterial( {color: 0xffff00} );
    var cylinder = new THREE.Mesh( geometry, material );
    return cylinder;
}


init();
animate();