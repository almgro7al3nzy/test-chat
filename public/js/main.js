const chatForm = document.getElementById('chat-form');
const chatMessages = document.querySelector('.chat-messages');
const roomNumber = document.getElementById('room-name');
const userList = document.getElementById('users');

//احصل على اسم المستخدم والغرفة من URL
const { username, room } = Qs.parse(location.search, {
  ignoreQueryPrefix: true,
});

console.log({username, room})

const socket = io();

//انضم إلى غرف الدردشة
socket.emit('joinRoom', { username, room });
      socket.emit('add user', username);

//احصل على الغرفة والمستخدمين
socket.on('roomUsers', ({ room, users }) => {
  outputroomNumber(room);
  outputUsers(users);
});

//رسالة من الخادم
socket.on('message', (message) => {
  console.log(message);
  outputMessage(message);

  //حرك الفأرة لأسفل
  chatMessages.scrollTop = chatMessages.scrollHeight;
});

//إرسال الرسالة
chatForm.addEventListener('submit', (e) => {
  e.preventDefault();
    socket.emit('add user', username);

  //احصل على نص الرسالة
  let msg = e.target.elements.msg.value;

  msg = msg.trim();

  if (!msg) {
    return false;
  }

  //إرسال رسالة إلى الخادم
  socket.emit('chatMessage', msg);

  //مدخلات واضحة
  e.target.elements.msg.value = '';
  e.target.elements.msg.focus();
});

//رسالة الإخراج إلى DOM
function outputMessage(message) {
  const div = document.createElement('div');
  div.classList.add('message');
  const p = document.createElement('p');
  p.classList.add('meta');
  p.innerText = message.username;
  p.innerHTML += `<span>${message.time}</span>`;
  div.appendChild(p);
  const para = document.createElement('p');
  para.classList.add('text');
  para.innerText = message.text;
  div.appendChild(para);
  document.querySelector('.chat-messages').appendChild(div);

}

//أضف اسم الغرفة إلى DOM
function outputroomNumber(room) {
  roomNumber.innerText = room;
}

//أضف المستخدمين إلى DOM
function outputUsers(users) {
 console.log({users})
  userList.innerHTML = '';
  users.forEach((user) => {
    const li = document.createElement('li');
    li.innerText = user.username;
    userList.appendChild(li);

  });
}

//اطلب من المستخدم قبل مغادرة غرفة الدردشة
document.getElementById('leave-btn').addEventListener('click', () => {
  const leaveRoom = confirm('هل أنت متأكد أنك تريد مغادرة غرفة الدردشة؟');
  if (leaveRoom) {
    window.location = '../index.html';
  } else {
  }
});