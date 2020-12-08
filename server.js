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
const messages = [];
const isUserValid = name => name.match(/^[a-zA-Z_]{4,255}$/);
const shouldSaveLogs = process.argv.includes("-l");
const adminPassword = "cats";
const secret = "many";
const adminPasswordHash = hash(adminPassword);

if (shouldSaveLogs) console.log("Will save logs");

const savemsg = msg => {
  if (shouldSaveLogs)
    fs.writeFile("./logs.txt", `${msg}\n`, { flag: "a" }, err => {
      if (err) console.error(err);
    });
};
function hash(text) {
  return crypto
    .createHmac("sha256", secret)
    .update(text)
    .digest("hex");
}

io.on("connect", socket => {
  let name, isAdmin;
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
          io.to(`user:${name}`).emit("msg", { text: msg, user: name });
          io.to(`user:${user}`).emit("msg", { text: msg, user: name });
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
          isAdmin = true;
          cb("Now you are admin");
        } else if (text.startsWith("/disconnect ")) {
          if (!isAdmin) return cb("Not authorized");
          const user = text.slice(12).trim();
          for (const socketId in io.sockets.sockets) {
            const socket = io.sockets.sockets[socketId];
            if (socket.rooms[`user:${user}`]) {
              socket.disconnect();
              cb("User has been disconnected");
              break;
            }
          }
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
      users.delete(name);
    });
  });
});

app.use(morgan("tiny"));
app.use(express.static("./public"));

server.listen(3000, () => {
  console.log("Listening on 3000");
});
