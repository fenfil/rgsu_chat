const express = require("express");
const socketio = require("socket.io");
const http = require("http");
const morgan = require("morgan");
const fs = require("fs");
const crypto = require("crypto");

const app = express();
const server = http.createServer(app);
const io = socketio(server);

const users = new Set();
const admins = new Set();
const messages = [];
const isUserValid = (name) => name.match(/^[a-zA-Z_]{4,255}$/);
const shouldSaveLogs = process.argv.includes("-l");
const adminPassword = "cats";
const secret = "many";
const adminPasswordHash = hash(adminPassword);

if (shouldSaveLogs) console.log("Will save logs");

const savemsg = (msg) => {
  if (shouldSaveLogs)
    fs.writeFile("./logs.txt", `${msg}\n`, { flag: "a" }, (err) => {
      if (err) console.error(err);
    });
};
function hash(text) {
  return crypto.createHmac("sha256", secret).update(text).digest("hex");
}
io.on("connect", (socket) => {
  let name;
  socket.on("join", ({ name: n }, cb) => {
    if (!isUserValid(n))
      return cb(
        "Name should be at least 4 letters length and 255 as max and contain only a-Z and _"
      );
    if (users.has(n)) return cb("User with such name have already joined");
    name = n;
    users.add(n);
    socket.join(`user:${n}`);
    cb(null, messages);
    io.emit("msg", { text: `New user connected! now online: ${users.size}` });

    socket.on("msg", (text, cb) => {
      if (text.startsWith("/")) {
        if (text == "/room") {
          return cb(Array.from(users));
        } else if (text.match(/\/msg .+ .+/)) {
          text = text.slice(text.indexOf(" ") + 1);
          const user = text.slice(0, text.indexOf(" "));
          const msg = text.slice(text.indexOf(" ") + 1);
          if (name === user || !users.has(user)) return cb("no such user");
          // io.to(`user:${name}`).emit("msg", { text: msg, user: name, private: true });
          io.to(`user:${user}`).emit("msg", {
            text: msg,
            user: name,
            private: true,
          });
          savemsg(`[private ${name}]: ${text}`);
        } else if (text.startsWith("/rename ")) {
          const newName = text.slice(8).trim();
          if (!isUserValid(newName))
            return cb(
              "Name should be at least 4 letters length and 255 as max and contain only a-Z and _"
            );
          if (users.has(newName))
            return cb("User with such name have already joined");
          socket.leave(`user:${name}`);
          socket.join(`user:${newName}`);
          users.delete(name);
          users.add(newName);
          name = newName;
          cb();
          socket.emit("msg", { text: `Your new name is ${newName}` });
        } else if (text.startsWith("/auth ")) {
          const password = text.slice(6).trim();
          if (adminPasswordHash !== hash(password)) return cb("Wrong password");
          admins.add(name);
          cb("Now you are admin");
        } else if (text.startsWith("/disconnect ")) {
          if (!admins.has(name)) return cb("Not authorized");
          const user = text.slice(12).trim();
          for (const socketId in io.sockets.sockets) {
            const socket = io.sockets.sockets[socketId];
            if (socket.rooms[`user:${user}`]) {
              socket.disconnect();
              cb("User has been disconnected");
              break;
            }
          }
        } else if (text.startsWith("/admins ")) {
          if (!admins.has(name)) return cb("Not authorized");
          cb(Array.from(admins).join(", "));
        } else {
          cb("Unknown command");
        }
        return;
      }
      savemsg(`[${name}]: ${text}`);
      messages.push({ text, name });
      io.emit("msg", { text, name });
    });
    socket.on("disconnect", () => {
      console.log("disconnect");

      users.delete(name);
    });
  });
});

app.use(morgan("tiny"));
app.use(express.static("./public"));

server.listen(3000, () => {
  console.log("Listening on 3000");
});

//bot

const socket = require("socket.io-client")("http://127.0.0.1:3000");

const getRandom = (...args) => {
  const r = (Math.random() * args.length) | 0;
  return args[r];
};

socket.on("connect", () => {
  console.log("bot connected");
  socket.emit("join", { name: "mr_bot" }, () => {
    socket.emit("msg", "/auth cats", () => {});
  });
});
socket.on("msg", async (msg) => {
  if (!msg.private) return;
  msg.text = msg.text.trim();
  const messages = () => [
    ["rand", '<img src="https://picsum.photos/200" />'],
    ["How is is going?", getRandom("Well, man", "going..")],
    ["Hi", getRandom("Hi, man", "Yeah hiiii", "Yoo")],
    [
      "admins",
      getRandom(Array.from(admins).join(", "), "admins? Who are they.."),
    ],
  ];

  const msgs = messages();
  const m = msgs.find((m) => m[0] == msg.text);

  if (msg.text == "help") {
    socket.emit("msg", `/msg ${msg.user} possible commands:`, (data) => {});
    msgs.forEach((m) => {
      socket.emit("msg", `/msg ${msg.user} '${m[0]}'`, (data) => {});
    });
  } else if (m) {
    socket.emit("msg", `/msg ${msg.user} ${m[1]}`, (data) => {});
  } else {
    socket.emit(
      "msg",
      `/msg ${msg.user} Hey man, keep calm, try typing '/msg mr_bot help'`,
      (data) => {}
    );
  }
});
