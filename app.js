const path = require("path");
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const passport = require("passport");
const User = require("./models/user");
const LocalStrategy = require("passport-local");
const passportLocalMongoose = require("passport-local-mongoose");
const methodOverride = require("method-override");
const Call = require("./call");
const leaderBoard = require("./models/leaderboard");
const app = express();
const cors = require("cors");
// var ExpressPeerServer = require("peer").ExpressPeerServer;
// var options = {
//   debug: true,
//   allow_discovery: true,
// };

mongoose.connect(
  "mongodb+srv://shankhanil007:12345@cluster0.azmz3.mongodb.net/myFirstDatabase?retryWrites=true&w=majority",
  { useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false }
);

app.use(cors());
app.use(bodyParser.urlencoded());
app.use(bodyParser.json());
app.use(methodOverride("_method"));
app.use(express.static(__dirname + "/public"));
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

// Video call connection
const server = app.listen(process.env.PORT || 3000, () =>
  console.log(`Server has started.`)
);

// let peerServer = ExpressPeerServer(server, options);
// app.use("/peerjs", peerServer);

var call = Call.create();
const users = {};

const io = require("socket.io")(server);

io.on("connection", (socket) => {
  console.log("Socket Connected");
  socket.on("new-user", ({ id, room, userName }) => {
    users[socket.id] = { id, room };
    call.addPeer(id, room);
    var entry = new leaderBoard({
      socketid: socket.id,
      room,
      name: userName,
      exercise: "-",
      score: "0",
    });
    entry.save();
  });

  socket.on("update_leaderboard", () => {
    socket.broadcast.emit("leaderboard-updates");
  });

  socket.on("start_game", ({ games, exerciseTime, breakTime }) => {
    socket.broadcast.emit("game_started", {
      gamess: games,
      exerciseTimes: exerciseTime,
      breakTimes: breakTime,
    });
  });

  socket.on("disconnect", () => {
    console.log("Socket Disonnected");

    if (users[socket.id] != undefined) {
      socket.broadcast.emit("user-disconnected", users[socket.id].id);
      call.removePeer(users[socket.id].id, users[socket.id].room);
    }
    leaderBoard.findOneAndRemove(
      { socketid: socket.id },
      function (err, details) {
        if (err) console.log(err);
        else {
          socket.broadcast.emit("leaderboard-updates");
        }
      }
    );
  });
});

//------------- Initialising passport ----------------

app.use(
  require("express-session")({
    secret: "This the secret message for authentication",
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use(function (req, res, next) {
  res.locals.currentUser = req.user;
  next();
});

function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/login");
}

//------------------------   Authentication Routes  -------------------------

app.get("/login", function (req, res) {
  res.render("login");
});
app.get("/signup", function (req, res) {
  res.render("signup");
});

app.post("/signup", function (req, res) {
  User.register(
    new User({
      username: req.body.username,
      name: req.body.name,
      phone: req.body.phone,
    }),
    req.body.password,
    function (err, user) {
      if (err) {
        console.log(err);
      }
      passport.authenticate("local")(req, res, function () {
        res.redirect("/" + req.user._id + "/streak");
      });
    }
  );
});

app.post(
  "/login",
  passport.authenticate("local", {
    failureRedirect: "/login",
  }),
  function (req, res) {
    res.redirect("/" + req.user._id + "/streak");
  }
);
app.get("/logout", function (req, res) {
  req.logout();
  res.redirect("/");
});

// ------------------------ Authentication Ends ------------------------------

app.get("/", (req, res) => {
  res.render("home");
});

app.get("/:id/streak", isLoggedIn, (req, res) => {
  User.findById(req.params.id, function (err, details) {
    if (err) console.log(err);
    else {
      res.render("streak", {
        name: details.name,
        streak: details.streak,
        points: details.points,
        ranking: details.ranking,
      });
    }
  });
});

app.get("/:id/friends", isLoggedIn, function (req, res) {
  User.findById(req.params.id)
    .populate("friends")
    .populate("pendingRequest")
    .exec(function (err, user_details) {
      if (err) console.log(err);
      else {
        res.render("friends", { user_details: user_details });
      }
    });
});

app.put("/:id/friendRequest", function (req, res) {
  User.findById(req.params.id, function (err, user1) {
    if (err) console.log(err);
    else {
      User.findById(req.body.id, function (err, user2) {
        if (err) console.log(err);
        else {
          user2.pendingRequest.push(user1);
          user2.save();
          res.redirect("/" + req.params.id + "/friends");
        }
      });
    }
  });
});

app.get("/:id1/:id2/makeFriends", function (req, res) {
  User.findById(req.params.id1, function (err, user1) {
    if (err) console.log(err);
    else {
      User.findById(req.params.id2, async function (err, user2) {
        if (err) console.log(err);
        else {
          user2.friends.push(user1);
          user2.save();
          user1.friends.push(user2);
          user1.save();
          User.findByIdAndUpdate(
            req.params.id2,
            { $pull: { pendingRequest: req.params.id1 } },
            { safe: true, multi: true },
            function (err, obj) {
              res.redirect("/" + req.params.id2 + "/friends");
            }
          );
        }
      });
    }
  });
});

app.get("/:id/compete", isLoggedIn, function (req, res) {
  User.findById(req.params.id, function (err, details) {
    if (err) console.log(err);
    else {
      res.render("compete", {
        call: call,
      });
    }
  });
});

app.get("/:id/exercise", isLoggedIn, function (req, res) {
  User.findById(req.params.id, function (err, details) {
    if (err) console.log(err);
    else {
      res.render("exercise", {
        call: call,
      });
    }
  });
});

app.get("/:id/leaderboard", function (req, res) {
  leaderBoard.find({ room: req.params.id }, function (err, details) {
    if (err) console.log(err);
    else {
      res.json(details);
    }
  });
});

app.get("/:id/updateScore/:score", function (req, res) {
  leaderBoard.findOne({ socketid: req.params.id }, function (err, details) {
    if (err) console.log(err);
    else {
      details.score = req.params.score;
      details.save();
      res.json("success");
    }
  });
});
