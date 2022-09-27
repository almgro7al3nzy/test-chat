const { response } = require("express");

const usersMap = new Map();

//تستخدم الوظيفة لتتبع المستخدمين الذين انضموا إلى الخادم
function addUser(id, username, battery, latitude, longitude, callback){
    newName(username, (response) => {
       if(!response){
        return callback(true, false);
       }else{
        const admin = (usersMap.size === 0) ? true : false; 
        const user = {
            username: username,
            battery: battery,
            latitude: latitude,
            longitude: longitude,
            admin: admin
        };
        usersMap.set(id, user);
        return callback(false, admin);  
       }
    });
}

//تحقق مما إذا كان الاسم جديدًا في الخريطة
function newName(name, callback){
    for(let [, user] of usersMap){
        if (name === user.username){
            return callback(false);
        }
    }
    return callback(true);
}


// ابحث عن المستخدم في الخريطة 
function getUsername(id, callback){
    if(usersMap.has(id)){
        return callback(false, usersMap.get(id).username);
    }else{
        return callback(true, null);
    }
}

//تحقق مما إذا كان يجب أن يكون هناك مسؤول جديد بناءً على مستوى البطارية
function newAdmin(id, battery, callback){    
    getAdminBattery((response) =>{
        if(response.id === id){
            getMaxBattery((response) => {
                if(battery < response.battery){
                    return callback(true, {id: response.id, battery: response.battery});
                }else{
                    return callback(false, null);
                }
            });
        }else if(battery > response.battery){
            return callback(true, {id: id, battery: battery});
        }else{
            return callback(false, null);
        }
    });     
}

//احصل على أقصى طاقة للبطارية في الخريطة
function getMaxBattery(callback){
    var maxBattery = 0;
    var maxUserId = 0;
    for(let [key, user] of usersMap){
        if(user.battery > maxBattery){
            maxBattery = user.battery;
            maxUserId = key;
        }
    }
    return callback({id: maxUserId, battery: maxBattery});
}

//احصل على مستخدم بأقصى طاقة للبطارية ، يجب أن يكون المسؤول
function getAdminBattery(callback){
    var adminBattery = 0;
    var adminUser = 0;
    for(let [key, user] of usersMap){
        if(user.admin){
            adminBattery = user.battery;
            adminUser = key;
        }
    }
    return callback({id: adminUser, battery: adminBattery})
}

//تحديث من هو المسؤول
function updateAdmin(newAdminId, callback){
    for(let [key, user] of usersMap){
        user.admin = (key === newAdminId) ? true: false;
    }
    return callback();
}

// تحديث البطارية للمستخدم
function updateBattery(id, battery, callback){
    for(let [key, user] of usersMap){
        if(key === id){
            user.battery = battery;
        }
    }
    return callback();
}

// احصل على جميع المستخدمين الموجودين حاليًا في الخادم
function getAllUsers(callback){
    const usersArray = [];
    for(let [, user] of usersMap){
        usersArray.push(user);
    }
    return callback(usersArray);
}

// احصل على المستخدمين الذين سيخدمون كخدم
// يجب أن تكون في نطاق كيلومتر واحد من المسؤول وبطارية لا تقل عن 20٪
function filterServants(admin_id, callback){
    const uselessServants = [];
    getAdminLocation((err, response) => {
        if(!err){
            const admin_latitude = response.latitude;
            const admin_longitutde = response.longitude;
            for(let [key, user] of usersMap){
                userWithinRange(admin_latitude, admin_longitutde, user.latitude, 
                    user.longitude, (response) => {
                        if(key === admin_id || user.battery < 20 || !response){
                            uselessServants.push(key);
                            usersMap.delete(key);  
                        }
                });
            }
        }
    });
    
    return callback(uselessServants);
}

// احصل على الموقع (خطوط الطول والعرض) للمستخدم الإداري
function getAdminLocation(callback){
    for(let [, user] of usersMap){
        if(user.admin){
            return callback(false, {latitude: user.latitude, longitude: user.longitude});
        }
    }
    return callback(true, null);
}

//تحقق مما إذا كان المستخدم في نطاق المشرف (كيلومتر واحد)
function userWithinRange(admin_lat, admin_long, serv_lat, serv_long, callback){
    const earthRadius = 6371;
    const distLat = toRadians(admin_lat-serv_lat);     // In radians
    const distLong = toRadians(admin_long-serv_long);
    const a = Math.pow(Math.sin(distLat/2), 2) +
        Math.cos(toRadians(admin_lat)) * Math.cos(toRadians(serv_lat)) *
        Math.pow(Math.sin(distLong/2),2);
    const c = 2 * Math.atan(Math.sqrt(a), Math.sqrt(1-a));
    const distance = earthRadius * c; 
    if(distance > 0.1){
        return callback(false);
    }else{
        return callback(true);
    }
}

// تحويل درجة إلى راديان
function toRadians(degrees){
    return degrees * (Math.PI/180);
}

// احصل على عدد الخدم المتبقين
function getNumServant(){
    return usersMap.size;
}

module.exports = {
    addUser,
    getUsername,
    getAllUsers,
    newAdmin,
    updateAdmin,
    updateBattery,
    getAdminBattery,
    filterServants,
    getNumServant
}