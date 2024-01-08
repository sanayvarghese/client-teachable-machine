const VIDEO = document.getElementById("video-feed");
const label = document.getElementById("center-text");
const CONTROL = document.getElementById("control");
var facingMode = "user";
var TMURL = window.location.origin + "/libraries/";
let model, webcam, labelContainer, maxPredictions;
let videoPlaying = false;
var maxid = 0;

// Display the error
function errorDisplay(err) {
  label.style = "color:red";
  label.innerText = err;
}

// Check if camera is supported
function hasGetUserMedia() {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

// Camera Controls
function control() {
  if (videoPlaying) {
    videoPlaying = false;
    VIDEO.pause();
    CONTROL.innerHTML = "<i class='fa-solid fa-play'></i>";
    console.log("pause");
  } else {
    console.log("play");
    videoPlaying = true;
    CONTROL.innerHTML = "<i class='fa-solid fa-stop'></i>";
    VIDEO.play();
  }
}

async function load() {
  var isOk = true;
  await fetch("config.yml")
    .then(function (response) {
      if (!response.ok) {
        isOk = false;
      }

      return response.text();
    })
    .then((yamlData) => {
      // Parse YAML data
      // console.log(yamlData);
      var parsedData = jsyaml.load(yamlData);
      TMURL =
        String(parsedData.TEACHABLE_MACHINE_URL) ||
        window.location.origin + "/libraries/";
      facingMode =
        String(parsedData.CAMERA_FACING).toLowerCase() == "front"
          ? "user"
          : "environment";

      if (!TMURL.endsWith("/")) TMURL += "/";
    })
    .catch((error) => {
      errorDisplay("Cannot file the config.yml file");
      isOk = false;

      return;
    });

  await fetch(TMURL + "model.json")
    .then(function () {
      if (!response.ok) {
        isOk = false;
      }
      return;
    })
    .catch((error) => {
      errorDisplay("Cannot file AI model files (URL NOT Found)");
      console.log("error");
      isOk = false;
      return;
    });
  if (!isOk) {
    return;
  }

  if (hasGetUserMedia()) {
    // getUsermedia parameters.
    const constraints = {
      video: {
        facingMode: { exact: facingMode },
      },
    };

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
    errorDisplay("Your Browser doesnt support camera!");
    return;
  }
}

load();

// Load the image model
async function init() {
  const modelURL = TMURL + "model.json";
  const metadataURL = TMURL + "metadata.json";

  model = await tmImage.load(modelURL, metadataURL);
  maxPredictions = model.getTotalClasses();
  loop();
}

async function loop() {
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
  if (maxProb < 0.75) return "...";

  maxid = maxItemid;
  return maxProbname;
}

async function predict() {
  const prediction = await model.predict(VIDEO);
  // if (maxid == 0) label.style = "color:#00cf0a";
  // else if (maxid == 1) label.style = "color:#cf0000";
  // else if (maxid == 2) label.style = "color:#ebe00e";
  // else label.style = "color:#fff";
  label.innerText = getMaxProbName(prediction);
}
