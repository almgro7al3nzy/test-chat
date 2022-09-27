const users = [];

//انضم إلى المستخدم للدردشة
function newUser(id, username, room) {
  const user = { id, username, room };

  users.push(user);

  return user;
}

// احصل على المستخدم الحالي
function getActiveUser(id) {
  return users.find(user => user.id === id);
}

// يغادر المستخدم الدردشة
function exitRoom(id) {
  const index = users.findIndex(user => user.id === id);

  if (index !== -1) {
    return users.splice(index, 1)[0];
  }
}

// احصل على مستخدمي الغرفة
function getIndividualRoomUsers(room) {
  return users.filter(user => user.room === room);
}

module.exports = {
  newUser,
  getActiveUser,
  exitRoom,
  getIndividualRoomUsers
};