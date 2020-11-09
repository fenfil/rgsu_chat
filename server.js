const express = require("express");
const socketio = require("socket.io");
const http = require("http");
const morgan = require("morgan");

const app = express();
const server = http.createServer(app);
const io = socketio(server);

const users = new Set();
const messages = [];

io.on("connect", socket => {
  let name;
  socket.on("join", ({ name: n }, cb) => {
    name = n;
    users.add(n);
    cb(messages);
  });
  socket.on("msg", (text, cb) => {
    if (text.startsWith("/")) {
      if (text == "/room") {
        return cb(Array.from(users));
      }
      return cb("Unknown command");
    }
    messages.push({ text, name });
    io.emit("msg", { text, name });
  });
  socket.on("disconnect", () => {
    users.delete(name);
  });
});

app.use(morgan("tiny"));
app.use(express.static("./public"));

server.listen(3000, () => {
  console.log("Listening on 3000");
});
