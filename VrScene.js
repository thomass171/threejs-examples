/**
 * Optional parameter are
 * vrmode
 * 0) standalone camera carrier. camera/carrier NOT attached to avatar
 * 1) world transform (tricky and incomplete)
 * 4) carrier attached to avatar (default)
 * 5) no carrier, camera unattached and unpositioned
 * -1) VR disabled
 * lightmode
 * 0) simple lighting with one Hemi... and one Directional
 * 1) one pointlight
 *
 * Best working with mode 4, 'local' and offset -0.1, which results in a head height of appx 1.9m (1m avatar + 1m 'vr cube' - 0.1) above ground
 * 'local-floor', even with offset -0.9 leads to too high position at appx 2.9m above ground or above avatar.
 */

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
var container, world, worldOffset, carrier, mainControlPanel;
var camera, scene, crosshairraycaster, renderer, bar, box1, ground, wall;
var  avatar, carrierposition;
var INTERSECTED;
var crosshair;
var controller1, controller2, lineraycaster,intersected = [];
var tempMatrix;
var framecnt = 0;
var adjust = new THREE.Vector3();
var rotangle = 0;
const VRMODE_DISABLED = -1;
const VRMODE_CARRIER = 0;
const VRMODE_WORLDTRANSFORM = 1;
const VRMODE_CARRIERATTACHED = 4;
const VRMODE_PLAIN = 5;
var vrmode;
var initialAdjust = -0.1;
var lightmode;
var pointlight = null;


const parameters = {
    radius: 0.5,
    tube: 0.2,
    tubularSegments: 150,
    radialSegments: 20,
    p: 2,
    q: 3
};

const vrControllerEventMap = new Map();
vrControllerEventMap.set("right-button-4", function () {console.log("A pressed")});
vrControllerEventMap.set("right-button-5", function () {console.log("B pressed")});
vrControllerEventMap.set("right-stick-left", function () {turn(true)});
vrControllerEventMap.set("right-stick-right", function () {turn(false)});
vrControllerEventMap.set("right-stick-up", function () {console.log("Right stick up")});
vrControllerEventMap.set("right-stick-down", function () {console.log("Right stick down")});

class GridPanel {
    constructor (wcells, hcells) {
        this.texture = THREE.ImageUtils.loadTexture( "Iconset-LightBlue.png" );
        this.cellsize = 0.1;
        this.cellsize2 = this.cellsize / 2;
        this.buttons = [];
        this.width = wcells * this.cellsize;
        this.height = hcells * this.cellsize;
        // lower left
        this.celloffsetx = -this.width / 2;
        this.celloffsety = -this.height / 2;
        this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(this.width, this.height), new THREE.MeshLambertMaterial({ color:0 }));
    }

    // y from bottom
    addButton( x , y, iconx, icony, callback) {
        //var geometry = new THREE.PlaneGeometry(this.cellsize,this.cellsize);
        var geometry = new THREE.BufferGeometry();

        const indices = [];
        const vertices = [];
        const normals = [];

        const size = this.cellsize;
        const halfSize = size / 2;

        vertices.push( - halfSize, halfSize, 0 );
        normals.push( 0, 0, 1 );
        vertices.push( - halfSize, -halfSize, 0 );
        normals.push( 0, 0, 1 );
        vertices.push(  halfSize, -halfSize, 0 );
        normals.push( 0, 0, 1 );
        vertices.push(  halfSize, halfSize, 0 );
        normals.push( 0, 0, 1 );

        indices.push( 0, 1, 2,  2, 3, 0 );

        geometry.setIndex( indices );
        geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( vertices, 3 ) );
        geometry.setAttribute( 'normal', new THREE.Float32BufferAttribute( normals, 3 ) );

        var cnt = 16;
        var uvleftbottom = new THREE.Vector2( iconx / cnt,( cnt - icony - 1) / cnt);
        var uvrighttop = new THREE.Vector2(( iconx + 1) / cnt, ( cnt - icony) / cnt);
        var uvs = [];
        uvs = [uvleftbottom.x, uvrighttop.y,
            uvleftbottom.x,uvleftbottom.y,
            uvrighttop.x,uvleftbottom.y,
            uvrighttop.x,uvrighttop.y];
        geometry.setAttribute( 'uv', new THREE.Float32BufferAttribute( uvs, 2 ));

        var button = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ map : this.texture }));
        button.position.set(this.celloffsetx + x * this.cellsize + this.cellsize2,this.celloffsety + y * this.cellsize + this.cellsize2,0.01);
        this.mesh.add(button);
        this.buttons.push({b:button,c:callback});
    }

    processRayIntersections(ray) {

        this.buttons.forEach( btn => {
            //console.log("Probing button ",btn.b);
            var intersections = ray.intersectObject( btn.b );
            if ( intersections.length > 0 ) {
                //console.log("button clicked");
                btn.c();
                return true;
            }
        });
        return false;
    }
}

function init() {
    logger.debug("init");

    var searchParams = new URLSearchParams(window.location.search);

    if (searchParams.has("vrmode")) {
        vrmode = 0 + parseInt(searchParams.get("vrmode"));
    } else {
        // 24.11.22 why was it VRMODE_CARRIER before, which is not the best?
        vrmode = VRMODE_CARRIERATTACHED;
    }
    logger.debug("vrmode=" + vrmode);

    if (searchParams.has("lightmode")) {
        lightmode = 0 + parseInt(searchParams.get("lightmode"));
    } else {
        lightmode = 0;
    }
    logger.debug("lightmode=" + lightmode);

    clock = new THREE.Clock();
    tempMatrix = new THREE.Matrix4();

    container = document.createElement( 'div' );
    document.body.appendChild( container );

    scene = new THREE.Scene();
    scene.background = new THREE.Color( 0x909090 );

    world = new THREE.Group();
    scene.add( world );

    camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 0.1, 10 );
    scene.add( camera );

    if (vrmode == VRMODE_PLAIN) {
        carrier = null;
        carrierposition = null;
    } else if (vrmode == VRMODE_WORLDTRANSFORM) {
        worldOffset = new THREE.Vector3(0,1,0);
        world.position.copy(worldOffset);
        // camera position is set by VR system. camera needs to be in scene for crosshair
        carrier = null;
    } else {
        // VRMODE_CARRIERATTACHED, VRMODE_CARRIER, VR_DISABLED
        worldOffset = null;
        carrier = new THREE.Object3D();
        carrierposition = new THREE.Vector3();
        carrier.add(camera);
        adjust.set( 0, initialAdjust, 0 );
        resetCarrier();
    }

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
    avatar.position.set(0,1,0);
    world.add(avatar);

    if (vrmode == VRMODE_CARRIERATTACHED || vrmode == VRMODE_DISABLED) {
        avatar.add(carrier);
    } else {
        scene.add(carrier);
    }

    addLight();

    var geometry = new THREE.BoxGeometry( 0.15, 0.15, 0.15 );
    box1 = new THREE.Mesh( geometry, new THREE.MeshLambertMaterial( { color:  0xff0000 } ) );
    box1.position.set(-1,1,-2);
    world.add(box1);

    bar = new THREE.Mesh( new THREE.BoxGeometry( 0.1, 0.1, 1 ), new THREE.MeshLambertMaterial( { color:  0x0000ff }) );
    bar.position.set(0,1,-2);
    world.add(bar);

    addGround();
    addWall();

    crosshairraycaster = new THREE.Raycaster();

    renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    container.appendChild( renderer.domElement );

    if (vrmode != VRMODE_DISABLED) {
        document.body.appendChild( VRButton.createButton( renderer ) );
        renderer.xr.enabled = true;
        logger.debug("ReferenceSpace=" + renderer.xr.getReferenceSpace());

        //not supported renderer.xr.setReferenceSpaceType( 'unbounded' );
        renderer.xr.setReferenceSpaceType( 'local' );
        //renderer.xr.setReferenceSpaceType( 'local-floor' );
    }

    // event registry
    renderer.domElement.addEventListener( 'mousedown', onMouseDown, false );
    renderer.domElement.addEventListener( 'mouseup', onMouseUp, false );
    renderer.domElement.addEventListener( 'touchstart', onMouseDown, false );
    renderer.domElement.addEventListener( 'touchend', onMouseUp, false );
    renderer.domElement.addEventListener( 'click', onMouseClick, true );

    window.addEventListener( 'resize', onWindowResize, false );

    function onDocumentKeyDown(event) {
        logger.debug("event" + event.keyCode);

        switch (event.keyCode) {
            case 37: /*curleft*/
                turn(true);
                turn(true);
                break;
            case 38: /*curup*/
                // not needed, because teleporting can be done by mouse click.
                break;
            case 39: /*curright*/
                turn(false);
                turn(false);
                break;
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
            case 89: /*y*/
                if (carrierposition != null) carrierposition.y += 0.1;
                resetCarrier();
                break;
            case 90: /*z*/
                if (carrierposition != null) carrierposition.y -= 0.1;
                resetCarrier();
                break;
            case 83: /*s*/
                if (pointlight != null) {
                    pointlight.position.setZ(pointlight.position.z + 1);
                }
                break;
            case 87: /*w*/
                if (pointlight != null) {
                    pointlight.position.setZ(pointlight.position.z - 1);
                }
                break;

        }
    }
    document.addEventListener("keydown", onDocumentKeyDown, false);

    if (vrmode != VRMODE_DISABLED) {
        //see WebVRManager.js
        // Controller need to be attached to Avatar or scene for having the correct height (might relate to ReferenceSpaceType).
        // Apparently can be used before WebVR becomes activ. With enabling VR they 'come alive'.
        // Adding a gamepad reference as described in https://discourse.threejs.org/t/listening-to-xr-touchpad-or-thumbstick-motion-controller-events/17545/2
        // is not needed for grabbing all events.
        controller1 = renderer.xr.getController( 0 );
        controller1.addEventListener( 'selectstart', onSelectStart );
        controller1.addEventListener( 'selectend', onSelectEnd );
        scene.add( controller1 );
        controller2 = renderer.xr.getController( 1 );
        controller2.addEventListener( 'selectstart', onSelectStart );
        controller2.addEventListener( 'selectend', onSelectEnd );
        scene.add( controller2 );
        var geometry = new THREE.BufferGeometry().setFromPoints( [ new THREE.Vector3( 0, 0, 0 ), new THREE.Vector3( 0, 0, - 1 ) ] );
        var line = new THREE.Line( geometry );
        line.name = 'line';
        line.scale.z = 5;
        controller1.add( line.clone() );
        controller2.add( line.clone() );
        lineraycaster = new THREE.Raycaster();

        if (carrier != null) {
            // otherwise controller are too high, because carrier is lowered
            carrier.add(controller1);
            carrier.add(controller2);
        }

        var cylinder = buildCylinder();
        controller1.add(cylinder);
    }

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
    world.add( igroup );

    const mesh = new HTMLMesh( gui.domElement );
    mesh.position.x = - 0.75;
    mesh.position.y = 1.5;
    mesh.position.z = - 1.5;
    //mesh.rotation.y = Math.PI / 4;
    mesh.scale.setScalar( 2 );
    igroup.add( mesh );

    mainControlPanel = new GridPanel(5,3);
    mainControlPanel.addButton(2,2,3,0,function(){adjusty(true);});
    mainControlPanel.addButton(0,1,1,0,function(){adjustx(true);});
    mainControlPanel.addButton(1,1,15,0,function(){turn(true);});
    mainControlPanel.addButton(2,1,13,0,function(){calibrate();});
    mainControlPanel.addButton(3,1,14,0,function(){turn(false)});
    mainControlPanel.addButton(4,1,2,0,function(){adjustx(false);});
    mainControlPanel.addButton(2,0,4,0,function(){adjusty(false);});
    mainControlPanel.addButton(1,0,10,0,function(){info();});
    mainControlPanel.mesh.position.set(0.4,1.5,-2);
    //for easy development
    //mainControlPanel.mesh.position.set(0,-1,-0.6);
    world.add(mainControlPanel.mesh);
}

function turn(left) {
    console.log("turn ",left);
    const quaternion = new THREE.Quaternion();
    var angle = ((left)?1:-1) * Math.PI / 4;
    quaternion.setFromAxisAngle( new THREE.Vector3( 0, 1, 0 ), angle );
    rotangle += angle;

    //carrier.rotation.y += ((left)?1:-1) * Math.PI / 4;
    quaternion.setFromAxisAngle( new THREE.Vector3( 0, 1, 0 ), rotangle );
    //carrier.quaternion.copy(quaternion)
    avatar.quaternion.copy(quaternion)
    resetCarrier();
}

function adjustx(left) {
    adjust.x += ((left)?-1:1) * 0.1;
    resetCarrier();
}

function adjusty(up) {
    adjust.y += ((up)?1:-1) * 0.1;
    resetCarrier();
}

function calibrate() {
    console.log("before calibrate ",camera.position);
    camera.position.set(0,0,0);
    console.log("after calibrate ",camera.position);
}

function info() {
    console.log("camera.position= ",camera.position);
    logger.debug("ReferenceSpace=" + renderer.xr.getReferenceSpace());
}

function resetCarrier() {
    if (carrier != null) {
        var v = new THREE.Vector3();
        v.copy(carrierposition);
        v.add(adjust);
        console.log("resetCarrier ",carrierposition, adjust, v);
        carrier.position.set(v.x, v.y, v.z);

        var wp = new THREE.Vector3();
        camera.getWorldPosition(wp);
        console.log("camera world pos: ", wp);
    }
}

function onMouseDown() {}

function onMouseUp() {}

function onMouseClick( event ) {

    var p = new THREE.Vector2();
    p.x = ( event.clientX / window.innerWidth ) * 2 - 1;
    p.y = - ( event.clientY / window.innerHeight ) * 2 + 1;

    var raycaster = new THREE.Raycaster();
    raycaster.setFromCamera( p, camera );
    processRayIntersections(raycaster);
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
    //console.log("camera.pos=",camera.position);

    var controller = event.target;
    processRayIntersections(getControllerRay( controller));
}

function processRayIntersections(ray) {

    if (mainControlPanel.processRayIntersections(ray)) {
        // already processed
        return;
    }
    var intersections = ray.intersectObjects([box1,bar]);
    if ( intersections.length > 0 ) {
        //grab box or bar
        var intersection = intersections[ 0 ];
        var object = intersection.object;
        object.scale.multiplyScalar(1.1);
        /*tempMatrix.getInverse( controller.matrixWorld );
        object.matrix.premultiply( tempMatrix );
        object.matrix.decompose( object.position, object.quaternion, object.scale );
        object.material.emissive.b = 1;
        // object changes space here and will "jump" down.
        controller.add( object );
        controller.userData.selected = object;*/
    } else {
        intersections = ray.intersectObjects( [ground] );
        if ( intersections.length > 0 ) {
            //teleport
            var intersection = intersections[ 0 ];
            var p = intersection.point;

            //console.log("teleport target=",p);

            if (vrmode == VRMODE_WORLDTRANSFORM) {
                var xoffset = world.position.x - p.x;
                world.translateX(-p.x);
                world.translateZ(-p.z);
            } else {
                if (vrmode == VRMODE_CARRIERATTACHED) {
                    avatar.position.x = p.x;
                    avatar.position.z = p.z;
                } else {
                    if (carrier != null) {
                        var xoffset = p.x - carrier.position.x;
                        var zoffset = p.z - carrier.position.z;
                        carrierposition.x = p.x;
                        carrierposition.z = p.z;
                        resetCarrier();
                    }
                }
            }
        }
    }
}

function onSelectEnd( event ) {
    var controller = event.target;
    if ( controller.userData.selected !== undefined ) {
        // release box or bar
        var object = controller.userData.selected;
        object.matrix.premultiply( controller.matrixWorld );
        object.matrix.decompose( object.position, object.quaternion, object.scale );
        object.material.emissive.b = 0;
        scene.add( object );
        controller.userData.selected = undefined;
    }
}

function getControllerRay( controller ) {
    tempMatrix.identity().extractRotation( controller.matrixWorld );
    lineraycaster.ray.origin.setFromMatrixPosition( controller.matrixWorld );
    lineraycaster.ray.direction.set( 0, 0, -1 ).applyMatrix4( tempMatrix );
    return lineraycaster;
}

function intersectObjects( controller ) {
    // Do not highlight when already selected
    if ( controller.userData.selected !== undefined ) return;
    var line = controller.getObjectByName( 'line' );
    var intersections = getControllerRayIntersections( controller, [box1,bar] );
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

    // find controller intersection
    cleanIntersected();
    //10.5.21 needed? intersectObjects( controller1 );
    //10.5.21 needed?intersectObjects( controller2 );

    // find crosshair intersections (box1 only)
    crosshairraycaster.setFromCamera( { x: 0, y: 0 }, camera );
    var intersects = crosshairraycaster.intersectObjects( [box1] );
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

    pollControllerEvents(renderer, vrControllerEventMap);
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
    var geometry = new THREE.PlaneGeometry( 10, 10, 10, 10 );
    var groundmat = new THREE.MeshLambertMaterial( { color:  0x884444,wireframe:true } );
    ground = new THREE.Mesh( geometry, groundmat );
    ground.position.set(0,0,0);
    ground.rotation.x = -Math.PI / 2;
    world.add(ground);
}

function addWall() {
    var geometry = new THREE.PlaneGeometry( 10, 1, 10, 1 );
    //
    var texture = new THREE.TextureLoader().load("textures/wovado/stone_wall02-diffuse_map.png");
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set( 10, 1 );
    //var wallmat = new THREE.MeshLambertMaterial( { color:  0x880044,wireframe:false } );
    var wallmat = new THREE.MeshLambertMaterial( { map:  texture,wireframe:false } );
    wall = new THREE.Mesh( geometry, wallmat );
    wall.position.set(0,0.5,-10/2);
    //wall.rotation.x = -Math.PI / 2;
    world.add(wall);
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