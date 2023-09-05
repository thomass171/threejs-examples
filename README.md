# threejs VR examples

#VrScene

## Features
 1) highlights red box when it is hit by crosshair
 2) red box and blue bar can be increased by trigger of right controller
 3) teleport by click on ground
 4) rotate by menu or by right controller thumbstick
 5) Mouse clicking on the ground also teleports

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

# FpsScene

Simple for now, but should meet ThreeJs example games_fps.html (https://threejs.org/examples/#games_fps)
one day using model collision-world.glb and VR.
