const socket = io();

const userInput = document.getElementById("username");
const startBtn = document.getElementById("start");
const usersWrapper = document.getElementById("users");
const messagesWrapper = document.getElementById("messages");
const msgInput = document.getElementById("message-input");
const msgBtn = document.getElementById("message-btn");
const page1 = document.getElementById("page-1");
const page2 = document.getElementById("page-2");
const roomTitle = document.getElementById("room-title");

let name,
  users = [];

socket.on("connect", () => {
  console.log("connect");
});

const sendMessage = () => {
  const text = msgInput.value;
  msgInput.value = "";
  messagesWrapper.innerHTML += msgNode({ text });
  socket.emit("msg", text, (text) => {
    if (text) {
      messagesWrapper.innerHTML += msgNode({ text });
    }
  });
};

document.addEventListener("keypress", (e) => {
  if (e.key == "Enter") {
    sendMessage();
    msgInput.focus();
  }
});

startBtn.addEventListener("click", (e) => {
  e.preventDefault();
  name = userInput.value;

  page1.classList.toggle("hidden");
  page2.classList.toggle("hidden");

  join();
});

msgBtn.addEventListener("click", (e) => {
  e.preventDefault();
  sendMessage();
});

const msgNode = (msg) => `<p>${msg.name ? `${msg.name}: ` : ""}${msg.text}</p>`;

function join() {
  socket.emit("join", { name }, (err, data) => {
    if (err) messagesWrapper.innerHTML = msgNode({ text: err });
    else messagesWrapper.innerHTML = data.map(msgNode).join("");
  });
  socket.on("msg", (data) => {
    messagesWrapper.innerHTML += msgNode(data);
  });
  socket.on("disconnect", () => {
    messagesWrapper.innerHTML += msgNode({ text: "You were disconnected" });
  });
}
