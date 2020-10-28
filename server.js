const express = require("express");
const socketio = require("socket.io");
const http = require("http");
const morgan = require("morgan");

const app = express();
const server = http.createServer(app);
const io = socketio(server);

const rooms = {};

io.on("connect", socket => {
  let room, name;
  socket.on("join", ({ room: r, name: n }, cb) => {
    room = r;
    name = n;
    if (rooms[room]) rooms[room].users.push(name);
    else rooms[room] = { users: [name], messages: [] };

    io.to(`room:${room}`).emit("user_joined", name);
    socket.join(`room:${room}`);
    cb(rooms[room]);
  });
  socket.on("msg", text => {
    rooms[room].messages.push({ text, name });
    io.to(`room:${room}`).emit("msg", { text, name });
  });
  socket.on("disconnect", () => {
    if (!rooms[room]) return;

    const i = rooms[room].users.indexOf(name);
    rooms[room].users.splice(i, 1);
    io.to(`room:${room}`).emit("user_left", name);
  });
});

app.use(morgan("tiny"));
app.use(express.static("./public"));

server.listen(3000, () => {
  console.log("Listening on 3000");
});
