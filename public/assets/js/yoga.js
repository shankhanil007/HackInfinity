const controls = [
  "play-large", // The large play button in the center
  "restart", // Restart playback
  "rewind", // Rewind by the seek time (default 10 seconds)
  "play", // Play/pause playback
  "fast-forward", // Fast forward by the seek time (default 10 seconds)
  "progress", // The progress bar and scrubber for playback and buffering
  "current-time", // The current time of playback
  "duration", // The full duration of the media
  "mute", // Toggle mute
  "volume", // Volume control
  "captions", // Toggle captions
  "settings", // Settings menu
  "pip", // Picture-in-picture (currently Safari only)
  "airplay", // Airplay (currently Safari only)
  "download", // Show a download button with a link to either the current source or a custom URL you specify in your options
  "fullscreen", // Toggle fullscreen
];

const pose_data = [
  { pose: "mountain", stop_time: "1.217", video_url: "2HTvZp5rPrg" },
  { pose: "triangle1", stop_time: "1.933", video_url: "2JXjoNLYvxc" },
  { pose: "tree", stop_time: "0.683", video_url: "Dic293YNJI8" },
  { pose: "cobra", stop_time: "1.183", video_url: "MaFPNfHlaOk" },
];

const player = new Plyr("#player", { controls });
window.player = player;
const msg = new SpeechSynthesisUtterance(
  "Checking your pose. Please hold the pose for a moment"
);
var pie;
var circle;
var pose_index = 0;
var percentage = 0;
var speak_count = 0;

document.getElementById("pose").addEventListener("change", () => {
  pose_index = parseInt(document.getElementById("pose").value);
  addVideoURL(pose_data[pose_index].video_url);
  var video = document.getElementById("video");
  video.currentTime = 0;
  percentage = 0;
  percentage_meter(0);
  if (pose_index == 1) {
    document.getElementById("mountain").style.display = "none";
    document.getElementById("triangle").style.display = "block";
  }
});

window.addEventListener("DOMContentLoaded", () => {
  circle = new CircularProgressBar("pie");
  pie = document.querySelectorAll(".pie");
});

function speak() {
  if (speak_count == 0) {
    window.speechSynthesis.speak(msg);
    speak_count++;
  }
}

function percentage_meter(value) {
  pie.forEach((el, index) => {
    const options = {
      index: index + 1,
      percent: value,
    };
    circle.animationTo(options);
  });
}

// Play
function play() {
  player.play();
  var video = document.getElementById("video");
  if (video.paused === true) {
    video.play();
  } else {
    video.pause();
    video.play();
  }
  video.addEventListener("timeupdate", function () {
    if (
      this.currentTime >=
      Math.round(parseFloat(pose_data[pose_index].stop_time) * 60)
    ) {
      player.pause();
      this.pause();
      speak();
      var count = 10;
      while (count != 0) {
        $.ajax({
          type: "GET",
          url: "http://localhost:8000/landmarks",
          data: {
            results: JSON.stringify(landmarks.poseLandmarks),
            expected_pose: pose_data[pose_index].pose,
          },
          contentType: "application/json",
          dataType: "json",
          success: function (data) {
            data = JSON.parse(data);
            console.log(data);
            if (parseInt(data.accuracy) > percentage) {
              percentage = parseInt(data.accuracy);
            }
          },
        });
        count--;
      }
      setTimeout(function () {
        if (percentage == 0) {
          const msg = new SpeechSynthesisUtterance(
            "Incorrect Pose. Please perform the correct pose!"
          );
          window.speechSynthesis.speak(msg);
        } else {
          percentage_meter(percentage);
          player.play();
        }
      }, 5000);
    }
  });
}

function addVideoURL(url) {
  player.source = {
    type: "video",
    sources: [
      {
        src: url,
        provider: "youtube",
      },
    ],
  };
}

// ----------------------------------------------------------------------------------
const videoElement = document.getElementsByClassName("input_video")[0];
const canvasElement = document.getElementsByClassName("output_canvas")[0];
const canvasCtx = canvasElement.getContext("2d");
var landmarks;

function onResults(results) {
  if (!results.poseLandmarks) {
    return;
  }

  landmarks = results;

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
// ----------------------------------------------------------------------------------
