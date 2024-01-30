# threejs VR examples

# VrScene

## Features
 1) highlights red box when it is hit by crosshair
 2) red box and blue bar can be increased by left/right controller trigger and mouse button
 3) teleport by mouse or left/right controller trigger click on ground
 4) rotate by menu, cursor keys or by right controller thumbstick
 5) yellow cylinder at left controller, green one at right controller
 6) red box and bar can be grabbed by left and right controller and repositioned

# textures
wovado from https://opengameart.org/content/stone-wall-1.
cethiel from https://opengameart.org/content/tileable-bricks-ground-textures-set-1

# Lighting

Bar and box are unshaded, but still need light. The wall is shaded. With lighmode 1 its brighter in
the mid and darker left and right. Teleport nearer and walk along the wall by 'c'/'b'
to see the effect. Or move the point light on z-axis by 's'/'w'.

# Changelog

25.7.23:
- key controls CURLEFT,CURRIGHT added
- VR_DISABLED added
- Textured wall added
24.01.24:
- grabbing
- ArScene added for Quest 3 passthrough

# FpsScene

Simple for now, but should meet ThreeJs example games_fps.html (https://threejs.org/examples/#games_fps)
one day using model collision-world.glb and VR.

# Running for development

As simple HTTP server can be launched by

```
/usr/local/opt/php@7.3/bin/php -S localhost:8009
```

and than the page opened in a browser by
```
http://localhost:8009/VrScene.html
```
Unfortunately this cannot be used for WebXR as this requires HTTPS. For development purposes
it might be an option to disable the need for HTTPS
for the dev server. This is done by:

* enter URL 'chrome://flags'
* Enable 'insecure origins treated as secure'
* Enter the IP of the dev server like 'http://192.168.98.150'