const { response } = require('express');
const express = require('express');
const app = express();
const path = require('path');
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const port = process.env.PORT || 3000;
const { addUser, 
  getAllUsers,
  newAdmin, 
  updateAdmin,
  getUsername,
  updateBattery,
  filterServants,
  getNumServant
  } = require('./users');

server.listen(port, () => {
  console.log(`Server listening at port ${port}`);
});
// views is directory for all template files
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.use(express.static(path.join(__dirname, 'public')));

// خريطة لتتبع الخادم المتصل
// في البداية سيكون الجميع في هذه الخريطة
const servantsMap = new Map();

//لتتبع من هو المسؤول عند بدء الخدمةs
let admin = null;

let sessionStarted = false;

// يتصل المستخدم بمنفذ socket.io
io.on('connection', (socket) => {
  socket.on('login', (data) =>{
    if(!sessionStarted){
      addUser(socket.id, data.username, data.battery, 
        data.latitude, data.longitude, (err, response) => {
          if(err){
            socket.emit('login results', {results: false});   // المستخدم غير قادر على تسجيل الدخول
          }else if(!response){ 
             // لن يكون المستخدم مسؤولاً بشكل افتراضي عند إضافته إلى الخريطة ، ما لم يكن هو الأول
            // لذا دعنا نتحقق مما إذا كان يجب أن يكون المسؤول الجديد
            newAdmin(socket.id, data.battery, (newAdmin, response) => {  
              if(newAdmin){   
                // تم التأكيد على أن المستخدم الجديد يجب أن يكون المسؤول الجديد ، لذا قم بتحديث الخريطة والمستخدم
                updateAdmin(socket.id, () => {
                  // دع الآخرين يعرفون عن المستخدم الجديد ، وهو المسؤول
                  socket.broadcast.emit('userAdded', ({ ...data, admin: true}));        
                });              
              }else{
                // لم يتغير المشرف
                socket.broadcast.emit('userAdded', ({...data, admin: false}));
              }
            });
            socket.emit('login results', {results: true});
            servantsMap.set(socket.id, socket);
          }else{
            // إذا كان هو أول مستخدم يقوم بتسجيل الدخول ، فسيتم تحديد دور المسؤول له
            socket.broadcast.emit('userAdded', ({...data, admin: true}));
            socket.emit('login results', {results: true});
            servantsMap.set(socket.id, socket);
          }
        });
    }else{
      socket.emit('lobby closed', '');
    }
  });

  socket.on('joinLobby', () => {
    getAllUsers((users) => {
      socket.emit('lobbyUsers', users);
    });
  });

  socket.on('battery change', (battery) => {
    updateBattery(socket.id, battery, () => {     
      newAdmin(socket.id, battery, (newAdmin, response) => {
        if(newAdmin){   
          // تم التأكيد على أنه يجب أن يكون هناك مسؤول جديد ، قم بتحديث الخريطة
          updateAdmin(response.id, () => {
// دع المستخدمين الآخرين يعرفون أن المستخدم الذي تغيرت بطاريته هو المسؤول الآن
              getUsername(response.id, (err, response) => {
                if(!err){
                  console.log('Update admin');
                  socket.emit('update admin', {username: response});
                  socket.broadcast.emit('update admin', {username: response});
                }
              });               
          });              
        }
        getUsername(socket.id, (err, response) => {
          // Update user values, battert is the only one that has changed
          if(!err){
            var userVal = {
              username: response,
              battery: battery
            };      
            console.log('Update user');
            socket.emit('update user', (userVal));
            socket.broadcast.emit('update user', (userVal));
          }
        });       
      });
    });    
  });

  //بمجرد أن ينتهي المعلم من كتابة المصفوفات
  socket.on('start master', () => {
    admin = socket;
    filterServants(socket.id, (response)=> {
      for(let [key, servant] of servantsMap){
        if(response.includes(key)){
          servant.emit('rejected', '');
          servantsMap.delete(key);
        }else{
          servant.emit('go servant', {id: key});
        }
      }
    });
    socket.emit('go admin', {servants: servantsMap.size});
    sessionStarted = true;
  });

  socket.on('new matrices', (data) => {
    var firstMatrix = JSON.parse(data[0]);
    var secondMatrix = JSON.parse(data[1]);
    var firstRows = data[2];
    var secondRows = data[3];
    var secondColumns = data[4];
    var distributed = data[5];
    if(distributed){
      var numServants = getNumServant();
      var rowsPerServant = firstRows/numServants;
      var servantRows = [];
      var servants = [];
      var s = 0;
      for(let [key, value] of servantsMap){
        if(key !== socket.id){
          servants.push(value);
        }
      }
      for(var i = 0; i < firstMatrix.length; i++){
        servantRows.push(firstMatrix[i]);
        if((i+1)%rowsPerServant === 0){
          var matricesInfo = {
            finalRows: rowsPerServant,
            secondRows: secondRows,
            secondColumns: secondColumns,
            firstMatrix: servantRows,
            secondMatrix: secondMatrix,
            firstRow: i-(i%rowsPerServant),
            lastRow: i 
          };
          servants[s].emit('servant matrices', matricesInfo);
          servantRows = [];
          s++;
        }
      }
    }else{
       // السيد لا يوزع المصفوفات بين الخدم
      // يرسل مصفوفات كاملة لكل خادم لأغراض الاختبار
      var matricesInfo = {
        firstColumns: secondRows,
        secondColumns: secondColumns,
        firstMatrix: firstMatrix,
        secondMatrix: secondMatrix
      }
      for(let [key, servant] of servantsMap){
        if(key !== socket.id){
          servant.emit('servant test', matricesInfo);
        }
      }
    }
  });

// أرسل الخدم نتائجهم من مضاعفة المصفوفة
  // أعط النتائج للسيد
  socket.on('multiplication result', (data) => {
    admin.emit('partial results', (data));
  });

  // TODO: disconnect
});

    // when the client emits 'new message', this listens and executes
    socket.on('new message', (data) => {
        // we tell the client to execute 'new message'
        socket.broadcast.emit('new message', {
          username: socket.username,
          message: data
        });
    });
    //console.log(socket.id, "a user connected to server!");

    // when the client emits 'add user', this listens and executes
    socket.on('add user', (username) => {
        if (addedUser) return;

        // we store the username in the socket session for this client
        socket.username = username;
        ++numUsers;
        addedUser = true;
        socket.emit('login', {
          numUsers: numUsers
        });
        // echo globally (all clients) that a person has connected
        socket.broadcast.emit('user joined', {
          username: socket.username,
          numUsers: numUsers
        });
    });

    // when the client emits 'typing', we broadcast it to others
      socket.on('typing', () => {
        socket.broadcast.emit('typing', {
          username: socket.username
        });
      });

      // when the client emits 'stop typing', we broadcast it to others
      socket.on('stop typing', () => {
        socket.broadcast.emit('stop typing', {
          username: socket.username
        });
      });

    socket.on('disconnect', function () {
        if (addedUser){
            --numUsers;

            // echo globally that this client has left
            socket.broadcast.emit('user left', {
                username: socket.username,
                numUsers: numUsers
            });
        }
    });
});

server.listen(app.get('port'), function(){
    console.log("Server is now running...");
    console.log("Port is on", app.get('port'))
});