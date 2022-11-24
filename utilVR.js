/**
 * derived from https://codepen.io/jason-buchheim/details/zYqYGXM
 * without speedfactor and hapticActuators
 *
 * Button map for Oculus Rift
 * 0 Trigger
 * 4 -> 'X' on left and 'A' on right
 * 5 -> 'Y' on left and 'B' on right
 *
 * Thumbstick Axis
 * 3 -> values from -1.0 (pushed) up to 1.0 (pulled)
 * 2 -> values from -1.0 (left) up to 1.0 (right)
 *
 *
 */

const prevGamePads = new Map();



var debugLog = false;
var axisThreshold = 0.7;
var stickFired = [];
stickFired['right2'] = false;
stickFired['right3'] = false;
stickFired['left2'] = false;
stickFired['left3'] = false;

function pollControllerEvents(renderer, eventMap) {
  var handedness = "unknown";

  //determine if we are in an xr session
  const session = renderer.xr.getSession();
  let i = 0;

  if (session) {

    //a check to prevent console errors if only one input source
    if (isIterable(session.inputSources)) {
      for (const source of session.inputSources) {
        if (source && source.handedness) {
          handedness = source.handedness; //left or right controllers
        }
        if (!source.gamepad) continue;
        const controller = renderer.xr.getController(i++);
        const old = prevGamePads.get(source);
        const data = {
          handedness: handedness,
          buttons: source.gamepad.buttons.map((b) => b.value),
          axes: source.gamepad.axes.slice(0)
        };
        if (old) {
          data.buttons.forEach((value, button) => {
            // handlers for buttons
            // When a button is pressed, its value changes from 0 to 1.
            // The purpose of the math.abs seems to be for checking whether it is still pressed. Not used for now.
            // Buttons seems to have only values 0 and 1
            if (value !== old.buttons[button] /*|| Math.abs(value) > 0.8*/) {
              if (debugLog) console.log(data.handedness + " button " + button + " value changed from " + old.buttons[button] + " to " + value);
              //check if it is 'all the way pushed'
              if (value === 1) {
                if (debugLog) console.log("Button" + button + "Down");
                checkEvent(data.handedness + "-button-" + button, eventMap);
              } else {
                 if (debugLog) console.log("Button" + button + "Up");
                 // No action currently for releasing a button
              }
            }
          });
          data.axes.forEach((value, axis) => {
            // handlers for thumbsticks
            // convert thumbstick action to button event
            if (Math.abs(value) > axisThreshold) {
              if (debugLog) console.log(data.handedness + " axis " + axis + " values exceeds threshold:", value);
              // avoid repeated events for one movement
              if (!stickFired[data.handedness+axis]) {
                  if (axis == 2) {
                    //left and right axis on thumbsticks
                    checkEvent(data.handedness + "-stick-" + ((value<0)?"left":"right"), eventMap);
                    stickFired[data.handedness+axis] = true;
                  }
                  if (axis == 3) {
                    //up and down axis on thumbsticks
                    checkEvent(data.handedness + "-stick-" + ((value<0)?"up":"down"), eventMap);
                    stickFired[data.handedness+axis] = true;
                  }
              }
            } else {
              stickFired[data.handedness+axis] = false;
            }
          });
        }
        prevGamePads.set(source, data);
      }
    }
  }
}

function isIterable(obj) {
  // checks for null and undefined
  if (obj == null) {
    return false;
  }
  return typeof obj[Symbol.iterator] === "function";
}

function checkEvent(eventKey, eventMap) {
    var eventFunction = eventMap.get(eventKey);
    if (eventFunction != null) {
        eventFunction();
    } else {
        if (debugLog) console.log("No event defined for " + eventKey);
    }
}