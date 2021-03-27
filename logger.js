
var loggerWindow;
var logElement;

function openLoggerWindow() {
  loggerWindow = window.open("", "_blank", "toolbar=yes,scrollbars=yes,resizable=yes,top=500,left=500,width=400,height=400");
  if (loggerWindow != null) {
      loggerWindow.document.write("<p>Log output: </p><div id='logcontainer'><p></p>");

      logElement = loggerWindow.document.getElementById("logcontainer");
  }
}

class Logger {

  constructor() {
    this.debug("Welcome");
  }

  debug(msg) {
    logElement.innerHTML += msg + "<br>";
  }
}

openLoggerWindow();
