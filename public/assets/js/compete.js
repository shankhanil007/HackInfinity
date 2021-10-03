const PRE = "DELTA";
const SUF = "MEET";
var room_id;
var getUserMedia =
  navigator.getUserMedia ||
  navigator.webkitGetUserMedia ||
  navigator.mozGetUserMedia;
var local_stream;

var peer = null;
var currentPeer = null;
const videoGrid = document.getElementById("video-grid");
const socket = io();

socket.on("user-disconnected", (userId) => {
  console.log(userId);
  const video = document.getElementById(userId);
  video.remove();
});

socket.on("leaderboard-updates", () => {
  console.log("Update");
  leaderBoard();
});

var userName = "";
var stage = "";
var counter = 0;
var score = 0;
var flag = 0;
var exercise = "";
var loaded = false;
var loadedFlag = 0;
var room = "";
var finished = false;
var gamecount = 0;
var exerciseTime = 0;
var breakTime = 0;
var games = [];

socket.on("game_started", ({ gamess, exerciseTimes, breakTimes }) => {
  exerciseTime = parseFloat(exerciseTimes);
  breakTime = parseFloat(breakTimes);
  for (var i of gamess) {
    games.push(i);
  }
  console.log(games);
  console.log(parseFloat(exerciseTime));
  console.log(parseFloat(breakTime));
  startgame();
});

function find_angle(A, B, C) {
  var AB = Math.sqrt(Math.pow(B[0] - A[0], 2) + Math.pow(B[1] - A[1], 2));
  var BC = Math.sqrt(Math.pow(B[0] - C[0], 2) + Math.pow(B[1] - C[1], 2));
  var AC = Math.sqrt(Math.pow(C[0] - A[0], 2) + Math.pow(C[1] - A[1], 2));
  return Math.acos((BC * BC + AB * AB - AC * AC) / (2 * BC * AB));
}

function fetchResult() {
  fetch(`http://localhost:3000/${socket.id}/updateScore/${score}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  })
    .then((response) => response.json())
    .then((json) => {
      socket.emit("update_leaderboard");
      leaderBoard();
    });
}

function thirty() {
  var countDownTarget = new Date().getTime() + breakTime * 60 * 1000;
  console.log(breakTime * 60);
  function showClock(target) {
    const distance = target - new Date().getTime();
    const mins =
      distance < 0
        ? 0
        : Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const secs = distance < 0 ? 0 : Math.floor((distance % (1000 * 60)) / 1000);

    // Output the results
    document.getElementById("timer").innerHTML = "0" + mins + ": " + secs;
  }

  showClock(countDownTarget);

  // Update the count down every 1 second
  var x = setInterval(function () {
    showClock(countDownTarget);
    if (countDownTarget - new Date().getTime() < 0) {
      exercise = "";
      document.getElementById("timer").innerHTML = "00:00";
      fetchResult();
      clearInterval(x);
      if (gamecount == games.length) {
        complete();
      } else {
        timer();
        callGame(gamecount);
        gamecount += 1;
      }
    }
  }, 1000);
}

function timer() {
  var countDownTarget = new Date().getTime() + exerciseTime * 60 * 1000;

  function showClock(target) {
    const distance = target - new Date().getTime();
    const mins =
      distance < 0
        ? 0
        : Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const secs = distance < 0 ? 0 : Math.floor((distance % (1000 * 60)) / 1000);

    // Output the results
    document.getElementById("timer").innerHTML = "0" + mins + ": " + secs;
  }

  showClock(countDownTarget);

  var x = setInterval(function () {
    showClock(countDownTarget);
    if (countDownTarget - new Date().getTime() < 0) {
      exercise = "";
      document.getElementById("timer").innerHTML = "00:00";
      fetchResult();
      clearInterval(x);
      if (gamecount != games.length) {
        thirty();
        rest();
      } else {
        complete();
      }
    }
  }, 1000);
}

function lifting() {
  stage = "";
  counter = 0;
  flag = 0;
  exercise = "lifting";
  document.getElementById("exerciseType").innerHTML = "Exercise : LIFTING";
  document.getElementById("result").innerHTML = "Count : 0";
  document.getElementById("image").src = "/assets/img/2.jpg";
}

function skipping() {
  stage = "";
  counter = 0;
  flag = 0;
  exercise = "skipping";
  document.getElementById("exerciseType").innerHTML = "Exercise : SKIPPING";
  document.getElementById("result").innerHTML = "Count : 0";
  document.getElementById("image").src = "/assets/img/3.png";
}

function situps() {
  stage = "";
  counter = 0;
  flag = 0;
  exercise = "situps";
  document.getElementById("exerciseType").innerHTML = "Exercise : SIT UPS";
  document.getElementById("result").innerHTML = "Count : 0";
  document.getElementById("image").src = "/assets/img/13.png";
}

function complete() {
  stage = "";
  counter = 0;
  flag = 0;
  finished = true;
  document.getElementById("timer").innerHTML = "00:00";
  document.getElementById("exerciseType").innerHTML = "COMPLETED";
  document.getElementById("result").innerHTML = "";
  document.getElementById("image").src = "/assets/img/4.jpg";
}

function leaderBoard() {
  var winner = "";
  var max = -1;

  fetch(`http://localhost:3000/${room}/leaderboard`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  })
    .then((response) => response.json())
    .then((json) => {
      var table = document.getElementById("leaderboard");
      $("#leaderboard").find("tr:not(:first)").remove();
      for (var i = 0; i < json.length; i++) {
        if (json[i].score > max) {
          max = json[i].score;
          winner = json[i].name;
        }

        var tr = document.createElement("tr");
        var td1 = document.createElement("td");
        var td3 = document.createElement("td");

        var text1 = document.createTextNode(json[i].name);
        var text3 = document.createTextNode(json[i].score);
        td1.appendChild(text1);
        td3.appendChild(text3);
        tr.appendChild(td1);
        tr.appendChild(td3);
        table.appendChild(tr);
      }

      if (gamecount == games.length) {
        document.getElementById("winner").innerHTML = "Winner : " + winner;
      }
    });
}

function startgame() {
  finished = false;
  timer();
  callGame(gamecount);
  gamecount += 1;
}

function startgameHOST() {
  socket.emit("start_game", { games, exerciseTime, breakTime });
  finished = false;
  timer();
  callGame(gamecount);
  gamecount += 1;
}

function callGame(count) {
  if (games[count].localeCompare("lifting") == 0) lifting();
  else if (games[count].localeCompare("skipping") == 0) skipping();
  else if (games[count].localeCompare("situps") == 0) situps();
  else complete();
}

function rest() {
  document.getElementById("exerciseType").innerHTML = "Rest Period";
  document.getElementById("result").innerHTML = "";
  document.getElementById("image").src = "/assets/img/5.jpg";
}

//---------------------------------------------------------------------------------------

const canvasElement = document.getElementsByClassName("output_canvas")[0];
const canvasCtx = canvasElement.getContext("2d");

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

  loaded = true;

  if (loaded == true && loadedFlag == 0) {
    console.log("loaded");
    leaderBoard();
    loadedFlag = 1;
  }

  if (exercise.localeCompare("skipping") == 0 && finished == false) {
    let shoulder = results.poseLandmarks[11].y;
    //   console.log(shoulder);
    if (shoulder < 0.4 && flag == 1) {
      flag = 0;
      counter += 1;
      score += 1;
      document.getElementById("result").innerHTML = "Count : " + counter;
    } else if (shoulder >= 0.45) {
      flag = 1;
    }
  } else if (exercise.localeCompare("lifting") == 0 && finished == false) {
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
      score += 1;

      document.getElementById("result").innerHTML =
        "Count : " + counter + " UP";
    }
  } else if (exercise.localeCompare("situps") == 0 && finished == false) {
    let shoulder = results.poseLandmarks[11].y * 100;
    console.log(shoulder);
    if (shoulder < 50 && flag == 1) {
      flag = 0;
      counter += 1;
      score += 1;
      document.getElementById("result").innerHTML = "Count : " + counter;
    } else if (shoulder >= 75) flag = 1;
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
  //   {
  //   key: "peerjs",
  //   host: "fitness-pro-404.herokuapp.com/",
  //   port: 443,
  //   path: "/",
  //   secure: true,
  // }
  peer.on("open", (id) => {
    console.log("Peer Connected with ID: ", id);
    userName = document.getElementById("user-name").value;
    socket.emit("new-user", { id, room, userName });
    socket.emit("update_leaderboard");
    hideModal();
    document.getElementById("meetArea").style.display = "block";
    document.getElementById("startgame").style.display = "block";
    exerciseTime = parseFloat(document.getElementById("exerciseTime").value);
    breakTime = parseFloat(document.getElementById("breakTime").value);

    if (document.getElementById("lifting").checked == true)
      games.push("lifting");
    if (document.getElementById("skipping").checked == true)
      games.push("skipping");
    if (document.getElementById("situps").checked == true) games.push("situps");

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
    socket.emit("update_leaderboard");
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
