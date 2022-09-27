
const path = require('path');
const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const formatMessage = require('./helpers/formatDate')
const {
  getActiveUser,
  exitRoom,
  newUser,
  getIndividualRoomUsers
} = require('./helpers/userHelper');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

//تعيين الدليل العام
app.use(express.static(path.join(__dirname, 'public')));

// سيتم تشغيل هذه الكتلة عند اتصال العميل
io.on('connection', socket => {
  socket.on('joinRoom', ({ username, room }) => {
    const user = newUser(socket.id, username, room);

    socket.join(user.room);

    // عام أهلا وسهلا
    socket.emit('message', formatMessage("WebCage", 'Messages are limited to this room! '));

    // بث في كل مرة يتصل فيها المستخدمون
    socket.broadcast
      .to(user.room)
      .emit(
        'message',
        formatMessage("WebCage", `${user.username} has joined the room`)
      );

    //المستخدمون النشطون الحاليون واسم الغرفة
    io.to(user.room).emit('roomUsers', {
      room: user.room,
      users: getIndividualRoomUsers(user.room)
    });
  });

  //استمع إلى رسالة العميل
  socket.on('chatMessage', msg => {
    const user = getActiveUser(socket.id);

    io.to(user.room).emit('message', formatMessage(user.username, msg));
  });

  //يعمل عند قطع اتصال العميل
  socket.on('disconnect', () => {
    const user = exitRoom(socket.id);

    if (user) {
      io.to(user.room).emit(
        'message',
        formatMessage("WebCage", `${user.username} has left the room`)
      );

      // المستخدمون النشطون الحاليون واسم الغرفة
      io.to(user.room).emit('roomUsers', {
        room: user.room,
        users: getIndividualRoomUsers(user.room)
      });
    }
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));