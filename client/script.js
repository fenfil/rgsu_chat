const socket = io("http://localhost:3000");
const userInput = document.getElementById("username");
const roomInput = document.getElementById("room");
const startBtn = document.getElementById("start");
const usersWrapper = document.getElementById("users");
const messagesWrapper = document.getElementById("messages");
const msgInput = document.getElementById("message-input");
const msgBtn = document.getElementById("message-btn");
const page1 = document.getElementById("page-1");
const page2 = document.getElementById("page-2");
const roomTitle = document.getElementById("room-title");

let name,
  room,
  users = [];

socket.on("connect", () => {
  console.log("connect");
});

startBtn.addEventListener("click", e => {
  e.preventDefault();
  name = userInput.value;
  room = roomInput.value;

  page1.classList.toggle("hidden");
  page2.classList.toggle("hidden");

  roomTitle.innerText = `Room: ${room}`;

  join();
});
msgBtn.addEventListener("click", e => {
  e.preventDefault();
  const text = msgInput.value;
  msgInput.value = "";
  socket.emit("msg", text);
});

const userNode = user => `<span>${user}</span>`;
const msgNode = msg => `<p>${msg.name}: ${msg.text}</p>`;
const updateUsers = () =>
  (usersWrapper.innerHTML = users.map(userNode).join(""));

function join() {
  socket.emit("join", { room, name }, data => {
    users = data.users;
    messagesWrapper.innerHTML = data.messages.map(msgNode).join("");
    updateUsers();
  });
  socket.on("msg", data => {
    messagesWrapper.innerHTML += msgNode(data);
  });
  socket.on("user_joined", name => {
    console.log("join", name);

    users.push(name);
    updateUsers();
  });
  socket.on("user_left", name => {
    const i = users.indexOf(name);
    if (i !== -1) users.splice(i, 1);
    updateUsers();
  });
}
