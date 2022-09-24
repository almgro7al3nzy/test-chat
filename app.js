/**
 * @author Joyce Hong
 * @email soja0524@gmail.com
 * @create date 2019-09-02 20:51:10
 * @modify date 2019-09-02 20:51:10
 * @desc socket.io server !
 */

const express = require('express');
const bodyParser = require('body-parser');


const socketio = require('socket.io')
var app = express();

// parse application / x-www-form-urlencoded
// {extended: true}: دعم الكائن المتداخل
// يُرجع البرامج الوسيطة التي تقوم فقط بتحليل النصوص المشفرة بعنوان url و
// سيحتوي هذا الكائن على أزواج مفتاح - قيمة ، حيث يمكن أن تكون القيمة a
// سلسلة أو مصفوفة (عندما يكون التمديد خطأ) ، أو أي نوع (عندما يكون التمديد صحيحًا)
app.use(bodyParser.urlencoded({ extended: true }));

// هذه البرامج الوسيطة المرتجعة التي تحلل json فقط وتنظر فقط في الطلبات التي يكون فيها نوع المحتوى
// header يطابق خيار النوع.
// عند استخدام req.body -> هذا باستخدام أداة تحليل الجسم لأنه سيتم تحليله
// جسم الطلب للشكل الذي نريده
app.use(bodyParser.json());


var server = app.listen(3000,()=>{
    console.log('Server is running on port number 3000')
})


//Chat Server

var io = socketio.listen(server)

io.on('connection',function(socket) {

     // في اللحظة التي يتصل فيها أحد عميلك بخادم socket.io ، سيحصل على معرف المقبس
    // دعونا نطبع هذا.
    console.log(`Connection : SocketId = ${socket.id}`)
// نظرًا لأننا سنستخدم اسم المستخدم من خلال اتصال مقبس كامل ، فلنجعله عالميًا.   
    var userName = '';
    
    socket.on('subscribe', function(data) {
        console.log('subscribe trigged')
        const room_data = JSON.parse(data)
        userName = room_data.userName;
        const roomName = room_data.roomName;
    
        socket.join(`${roomName}`)
        console.log(`Username : ${userName} joined Room Name : ${roomName}`)
        
       
         // دع المستخدم الآخر يتلقى إشعارًا بأن المستخدم دخل الغرفة ؛
        // يمكن استخدامه للإشارة إلى أن الشخص قد قرأ الرسائل. (مثل تحويل "غير المقروء" إلى "قراءة")

        // TODO: تحتاج إلى الاختيار
        //io.to: يمكن للمستخدم الذي انضم الحصول على حدث ؛
        //socket.broadcast.to: ستتلقى الرسالة جميع المستخدمين باستثناء المستخدم الذي انضم
        // socket.broadcast.to (`$ {roomName}`) .emit ('newUserToChatRoom'، userName)؛
        io.to(`${roomName}`).emit('newUserToChatRoom',userName);

    })

    socket.on('unsubscribe',function(data) {
        console.log('unsubscribe trigged')
        const room_data = JSON.parse(data)
        const userName = room_data.userName;
        const roomName = room_data.roomName;
    
        console.log(`Username : ${userName} leaved Room Name : ${roomName}`)
        socket.broadcast.to(`${roomName}`).emit('userLeftChatRoom',userName)
        socket.leave(`${roomName}`)
    })

    socket.on('newMessage',function(data) {
        console.log('newMessage triggered')

        const messageData = JSON.parse(data)
        const messageContent = messageData.messageContent
        const roomName = messageData.roomName

        console.log(`[Room Number ${roomName}] ${userName} : ${messageContent}`)
        // Just pass the data that has been passed from the writer socket

        const chatData = {
            userName : userName,
            messageContent : messageContent,
            roomName : roomName
        }
        socket.broadcast.to(`${roomName}`).emit('updateChat',JSON.stringify(chatData)) // Need to be parsed into Kotlin object in Kotlin
    })

    // socket.on('typing',function(roomNumber){ //Only roomNumber is needed here
    //     console.log('typing triggered')
    //     socket.broadcast.to(`${roomNumber}`).emit('typing')
    // })

    // socket.on('stopTyping',function(roomNumber){ //Only roomNumber is needed here
    //     console.log('stopTyping triggered')
    //     socket.broadcast.to(`${roomNumber}`).emit('stopTyping')
    // })

    socket.on('disconnect', function () {
        console.log("One of sockets disconnected from our server.")
    });
})

module.exports = server; //Exporting for test