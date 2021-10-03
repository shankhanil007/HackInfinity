const PRE = "DELTA";
const SUF = "MEET";
var room_id;
var getUserMedia =
  navigator.getUserMedia ||
  navigator.webkitGetUserMedia ||
  navigator.mozGetUserMedia;
var local_stream;
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

var peer = null;
var currentPeer = null;
const videoGrid = document.getElementById("video-grid");
const socket = io();

socket.on("user-disconnected", (userId) => {
  console.log(userId);
  const video = document.getElementById(userId);
  video.remove();
});

var userName = "";
var exercise = "";
var loaded = false;
var loadedFlag = 0;
var room = "";
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
var landmarks;

window.addEventListener("DOMContentLoaded", () => {
  circle = new CircularProgressBar("pie");
  pie = document.querySelectorAll(".pie");
});

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
        percentage_meter(percentage);
        player.play();
      }, 5000);
    }
  });
}

//---------------------------------------------------------------------------------------

const canvasElement = document.getElementsByClassName("output_canvas")[0];
const canvasCtx = canvasElement.getContext("2d");

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
//----------------------------------------------------------------------------------------

function createRoom() {
  console.log("Creating Room");
  room = document.getElementById("room-input").value;
  if (room == " " || room == "") {
    alert("Please enter room number");
    return;
  }
  var userid = document.getElementById("user-id").value;
  peer = new Peer();
  peer.on("open", (id) => {
    console.log("Peer Connected with ID: ", id);
    userName = document.getElementById("user-name").value;
    socket.emit("new-user", { id, room, userName });
    hideModal();
    document.getElementById("meetArea").style.display = "block";
    if (document.getElementById("Tree").checked == true) pose_index = 2;
    else if (document.getElementById("Triangle").checked == true)
      pose_index = 1;

    console.log(pose_index);
    addVideoURL(pose_data[pose_index].video_url);

    getUserMedia(
      { video: true, audio: false },
      (stream) => {
        local_stream = stream;
        setLocalStream(local_stream);
      },
      (err) => {
        console.log(err);
      }
    );
    notify("Waiting for peer to join.");
  });

  peer.on("call", (call) => {
    call.answer(local_stream);
    const video = document.createElement("video");
    video.setAttribute("id", call.peer);
    call.on("stream", (stream) => {
      setRemoteStream(stream, video);
    });
    currentPeer = call;
  });
}

function joinRoom() {
  console.log("Joining Room");
  room = document.getElementById("room-input").value;
  if (room == " " || room == "") {
    alert("Please enter room number");
    return;
  }
  room_id = PRE + room + SUF;
  hideModal();
  document.getElementById("meetArea").style.display = "block";
  peer = new Peer();
  //   {
  //   key: "peerjs",
  //   host: "fitness-pro-404.herokuapp.com/",
  //   port: 443,
  //   path: "/",
  //   secure: true,
  // }
  peer.on("open", (id) => {
    console.log("Connected with Id: " + id);
    userName = document.getElementById("user-name").value;
    socket.emit("new-user", { id, room, userName });
    // $.getScript("users.js", function () {
    //   console.log(addUser(id));
    // });

    // $.post("/addpeer/" + id);

    getUserMedia(
      { video: true, audio: false },
      (stream) => {
        local_stream = stream;
        setLocalStream(local_stream);
        notify("Joining peer");

        peer.on("call", function (call) {
          // Answer the call, providing our mediaStream
          call.answer(local_stream);
          const video = document.createElement("video");
          video.setAttribute("id", call.peer);
          call.on("stream", (stream) => {
            setRemoteStream(stream, video);
          });
        });

        console.log(call);
        call.peers[room].forEach(function (id) {
          const calls = peer.call(id, stream);
          const video = document.createElement("video");
          video.setAttribute("id", id);
          calls.on("stream", (stream) => {
            setRemoteStream(stream, video);
          });
          calls.on("close", () => {
            console.log("Closed");
            video.remove();
          });
          currentPeer = calls;
        });
      },
      (err) => {
        console.log(err);
      }
    );
  });
}

function setLocalStream(stream) {
  let video = document.getElementById("local-video");
  video.srcObject = stream;
  video.autoplay = true;
  video.playsInline = true;
  video.muted = true;

  const camera = new Camera(video, {
    onFrame: async () => {
      await pose.send({ image: video });
    },
    width: 500,
    height: 450,
  });
  camera.start();
}

function setRemoteStream(stream, video) {
  video.srcObject = stream;
  video.autoplay = true;
  video.playsInline = true;
  video.muted = true;

  // video.srcObject = stream;
  // video.play();
  video.style.width = "40%";
  video.style.margin = "1.5em";
  videoGrid.append(video);
}

function hideModal() {
  document.getElementById("entry-modal").hidden = true;
}

function notify(msg) {
  let notification = document.getElementById("notification");
  notification.innerHTML = msg;
  notification.hidden = false;
  setTimeout(() => {
    notification.hidden = true;
  }, 3000);
}

// Learnt how to run methods from another JS file and how to make API requests from JS using jQuery
