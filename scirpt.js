const VIDEO = document.getElementById("video-feed");
const label = document.getElementById("center-text");
const CONTROL_STOP = document.getElementById("stop");
const INPUT_SELECT = document.getElementById("input-select");
const FILE_CONTAINER = document.getElementById("file-container");
const CAMERA = document.getElementById("camera");
const CAMERA_CONTROL = document.getElementById("camcontrol");
const FILE_INPUT = document.getElementById("file-input");
const FILE_NAME = document.getElementById("file-name");
const IMAGE_DISPLAY = document.getElementById("image-display");
const IMAGE_CONTAINER = document.getElementById("image-container");
const CONTROL_SWITCH = document.getElementById("switch");

var DATA = VIDEO;

var facingMode = "user";
var TMURL = window.location.origin + "/libraries/";
let model, webcam, labelContainer, maxPredictions;
let videoPlaying = false;
var maxid = 0;
let shouldContinueLoop = true;
let currentInput = "webcam";

IMAGE_CONTAINER.style = "display:none";

// Display the error
function errorDisplay(err) {
  label.style = "color:red";
  label.innerText = err;
}

// Check if camera is supported
function hasGetUserMedia() {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

// Function to stop the current stream
function stopStream() {
  if (VIDEO.srcObject) {
    let tracks = VIDEO.srcObject.getTracks();
    tracks.forEach((track) => track.stop());
  }
}

// Function to switch the camera
function switchCamera() {
  shouldContinueLoop = false;
  stopStream(); // Stop the previous stream

  facingMode = facingMode !== "user" ? "user" : "environment";
  const constraints = {
    video: {
      facingMode: facingMode,
    },
  };
  if (facingMode === "environment") {
    VIDEO.classList.remove("flip-video");
  } else {
    VIDEO.classList.add("flip-video");
  }
  navigator.mediaDevices
    .getUserMedia(constraints)
    .then(function (stream) {
      VIDEO.srcObject = stream;

      VIDEO.addEventListener("loadeddata", function () {
        videoPlaying = true;
        shouldContinueLoop = true;
        loop();
      });
    })
    .catch(function (error) {
      console.error("Error switching camera:", error);
    });
}

CONTROL_SWITCH.addEventListener("click", switchCamera);

async function load() {
  var isOk = true;

  try {
    // Fetch the config.yml file
    const response = await fetch("config.yml");

    if (response.status == 404) {
      throw new Error("Config.yml file not found");
    }

    const yamlData = await response.text();

    // Parse YAML data
    var parsedData = await jsyaml.load(yamlData);
    TMURL =
      String(parsedData.TEACHABLE_MACHINE_URL) ||
      window.location.origin + "/libraries/";
    facingMode =
      String(parsedData.DEFAULT_CAMERA_FACING).toLowerCase() == "front"
        ? "user"
        : "environment";

    if (!TMURL.endsWith("/")) TMURL += "/";
  } catch (error) {
    errorDisplay("Error loading config.yml file: " + error.message);
    isOk = false;
  }

  if (isOk) {
    // Fetch the model.json file only during initialization
    try {
      const modelURL = TMURL + "model.json";
      const metadataURL = TMURL + "metadata.json";

      model = await tmImage.load(modelURL, metadataURL);
      maxPredictions = model.getTotalClasses();
    } catch (error) {
      errorDisplay("Error loading AI model files: " + error.message);
      isOk = false;
    }
  }

  if (isOk && hasGetUserMedia()) {
    // getUserMedia parameters.
    const constraints = {
      video: {
        facingMode: facingMode,
      },
    };
    if (facingMode === "environment") {
      VIDEO.classList.remove("flip-video");
    } else {
      VIDEO.classList.add("flip-video");
    }
    // Activate the webcam stream.
    navigator.mediaDevices.getUserMedia(constraints).then(function (stream) {
      VIDEO.srcObject = stream;

      VIDEO.addEventListener("loadeddata", function () {
        videoPlaying = true;
        init();
      });
    });
  } else {
    console.warn("getUserMedia() is not supported by your browser");
    errorDisplay("Your Browser doesn't support camera!");
    return;
  }
}

load();

// Load the image model
async function init() {
  loop();
}

async function loop() {
  if (!shouldContinueLoop) {
    return;
  }
  await predict();
  window.requestAnimationFrame(loop);
}

function getMaxProbName(data) {
  let maxProbname = null;
  let maxProb = -1;
  let maxItemid = 1;

  for (const item of data) {
    if (item.probability > maxProb) {
      maxProb = item.probability;
      maxProbname = item.className;
      maxItemid = data.indexOf(item);
    }
  }
  if (maxProb < 0.7) return "...";

  maxid = maxItemid;
  return maxProbname;
}

function control() {
  if (videoPlaying) {
    videoPlaying = false;
    VIDEO.pause();
    CONTROL_STOP.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 384 512"><path fill="currentColor" d="M73 39c-14.8-9.1-33.4-9.4-48.5-.9S0 62.6 0 80v352c0 17.4 9.4 33.4 24.5 41.9S58.2 482 73 473l288-176c14.3-8.7 23-24.2 23-41s-8.7-32.2-23-41z"/></svg>';
    console.log("pause");
  } else {
    console.log("play");
    videoPlaying = true;
    CONTROL_STOP.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 384 512"><path fill="currentColor" d="M0 128c0-35.3 28.7-64 64-64h256c35.3 0 64 28.7 64 64v256c0 35.3-28.7 64-64 64H64c-35.3 0-64-28.7-64-64z"/></svg>';
    VIDEO.play();
  }
}

async function predict() {
  const prediction = await model.predict(DATA);
  // console.log(prediction);

  label.innerText = getMaxProbName(prediction);
}

FILE_INPUT.addEventListener("change", (e) => {
  console.log("e");
  FILE_NAME.innerText = e.target.files[0].name;
  if (currentInput == "file") {
    console.log("id");

    const file = e.target.files[0];
    console.log(file);
    IMAGE_DISPLAY.src = URL.createObjectURL(file);
    IMAGE_CONTAINER.style = "display:block";
    IMAGE_DISPLAY.onload = () => {
      DATA = IMAGE_DISPLAY;
      // shouldContinueLoop = true;
      predict();
    };
    console.log("PRedicted");
  }
});

INPUT_SELECT.addEventListener("change", (e) => {
  videoPlaying = false;
  shouldContinueLoop = false;
  label.innerText = "...";
  // FILE_INPUT.value = "";
  console.log(e);
  if (e.target.value == "webcam") {
    IMAGE_CONTAINER.style = "display:none";
    FILE_CONTAINER.style = "display:none;";
    CAMERA.style = "display:block;";
    CAMERA_CONTROL.style = "display:block;";

    if (currentInput == e.target.value) {
      return;
    }
    currentInput = "webcam";
    stopStream();
    const constraints = {
      video: {
        facingMode: facingMode,
      },
    };
    if (facingMode === "environment") {
      VIDEO.classList.remove("flip-video");
    } else {
      VIDEO.classList.add("flip-video");
    }
    navigator.mediaDevices
      .getUserMedia(constraints)
      .then(function (stream) {
        VIDEO.srcObject = stream;

        VIDEO.addEventListener("loadeddata", function () {
          videoPlaying = true;
          shouldContinueLoop = true;
          loop();
        });
      })
      .catch(function (error) {
        console.error("Error switching camera:", error);
      });
    DATA = VIDEO;
  } else if (e.target.value == "file") {
    FILE_CONTAINER.style = "display:block;";
    CAMERA.style = "display:none;";
    CAMERA_CONTROL.style = "display:none;";
    currentInput = "file";
    label.innerText = "...";
    if (IMAGE_DISPLAY.getAttribute("src") != "") {
      DATA = IMAGE_DISPLAY;
      predict();
      IMAGE_CONTAINER.style = "display:block";
    }
  }
});
