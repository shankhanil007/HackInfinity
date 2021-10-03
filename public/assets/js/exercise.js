const videoElement = document.getElementsByClassName("input_video")[0];
const canvasElement = document.getElementsByClassName("output_canvas")[0];
const canvasCtx = canvasElement.getContext("2d");
var stage = "";
var counter = 0;
var flag = 0;
var exercise = "";

function find_angle(A, B, C) {
  var AB = Math.sqrt(Math.pow(B[0] - A[0], 2) + Math.pow(B[1] - A[1], 2));
  var BC = Math.sqrt(Math.pow(B[0] - C[0], 2) + Math.pow(B[1] - C[1], 2));
  var AC = Math.sqrt(Math.pow(C[0] - A[0], 2) + Math.pow(C[1] - A[1], 2));
  return Math.acos((BC * BC + AB * AB - AC * AC) / (2 * BC * AB));
}

function lifting() {
  stage = "";
  counter = 0;
  flag = 0;
  exercise = "lifting";
  document.getElementById("image").src =
    "https://icon-library.com/images/sport-sports_129-512_15021.png";
}

function skipping() {
  stage = "";
  counter = 0;
  flag = 0;
  exercise = "skipping";
  document.getElementById("image").src =
    "https://lh3.googleusercontent.com/proxy/RXVNuwSrjKPVOrla3X1CiJwv3uZ50jYimWYEXMUNdlGkp9sxni1YnuCrMpmiQXmtrCRE9yS4b6s4qRlhXMxNsBPa3oBOyMWPxkYoKsAfXYASB5efDB4GZd5N-ggGCmkBdSoyUE94DAF-6hg8EvzPxoypXp9MX8PgtVXQNQ";
}

function onResults(results) {
  if (!results.poseLandmarks) {
    return;
  }

  canvasCtx.save();
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  canvasCtx.drawImage(
    results.image,
    0,
    0,
    canvasElement.width,
    canvasElement.height
  );
  drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, {
    color: "#00FF00",
    lineWidth: 4,
  });

  drawLandmarks(canvasCtx, results.poseLandmarks, {
    color: "#FF0000",
    lineWidth: 2,
  });

  if (exercise.localeCompare("skipping") == 0) {
    let shoulder = results.poseLandmarks[11].y;
    //   console.log(shoulder);
    if (shoulder < 0.3 && flag == 1) {
      flag = 0;
      counter += 1;
      document.getElementById("result").innerHTML = "Count : " + counter;
    } else if (shoulder >= 0.45) {
      flag = 1;
    }
  } else if (exercise.localeCompare("lifting") == 0) {
    let shoulder = [results.poseLandmarks[11].x, results.poseLandmarks[11].y];
    let elbow = [results.poseLandmarks[13].x, results.poseLandmarks[13].y];
    let wrist = [results.poseLandmarks[15].x, results.poseLandmarks[15].y];
    let angle = find_angle(shoulder, elbow, wrist);
    if (angle > 2) {
      stage = "down";
      document.getElementById("result").innerHTML =
        "Count : " + counter + " DOWN";
    }
    if (
      angle < 1 &&
      (stage.localeCompare("") == 0 || stage.localeCompare("down") == 0)
    ) {
      stage = "up";
      counter += 1;

      document.getElementById("result").innerHTML =
        "Count : " + counter + " UP";
    }
  }

  canvasCtx.restore();
}

const pose = new Pose({
  locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
  },
});
pose.setOptions({
  modelComplexity: 1,
  smoothLandmarks: true,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5,
});
pose.onResults(onResults);

function join() {
  const camera = new Camera(videoElement, {
    onFrame: async () => {
      await pose.send({ image: videoElement });
    },
    width: 500,
    height: 450,
  });
  camera.start();
}
