const userModal = require('./User');
chatModel = require('./chat')
Service = require('./queries'),
  mongoose = require('mongoose'),
  async = require('async');

let socketInfo = {};
let io;
exports.connectSocket = function (server) {
  io = require('socket.io')(server);

  io.on('connection', function (socket) {
    console.log("socket id is....", socket.id, '<<<<<<<<Id>>>>>', socket.handshake.query.Id);

    if (socket.id) {
      socketInfo[socket.handshake.query.Id] = socket.id;
      updateData(userModal, { _id: socket.handshake.query.Id }, { socketId: socket.id }, {}, (err) => { });

    } else {
      io.emit('error', 'Socket is not connected')
    }

    socket.on('sendMessage', function (data, cb) {
      if (data.senderId && data.receiverId) {
        saveMessagee(data, function (err, result) {
          let socketCallback = {};
          if (err) {
            console.log(err);
            cb(socketCallback)
          } else {
            let populate = [
              {
                path: 'senderId',
                match: {},
                select: 'name phoneNumber',
                options: {},
              },
              {
                path: 'receiverId',
                match: {},
                select: 'name phoneNumber',
                options: {},
              }
            ];

            getRequiredPopulate(chatModel, {}, {}, { lean: true }, populate)
              .then(data => {
                socketCallback = {
                  message: data[data.length - 1]
                };
              })
          }
        })
      } else {
        console.log("data not in format");
      }
    });
  });

};


const saveMessagee = function (data, callback) {
  let saveChat;
  let c1 = { senderId: data.senderId, receiverId: data.receiverId };
  let c2 = { receiverId: data.senderId, senderId: data.receiverId };

  async.auto({
    saveMessageInDb: function (cb) {
      let criteria = { $or: [c1, c2] };
      let dataToSend = {};
      getData(chatModel, criteria, { conversationId: 1 }, { lean: true, limit: 1 }, (err, res) => {
        if (res.length > 0) {
          dataToSend = {
            receiverId: data.receiverId,
            senderId: data.senderId,
            message: data.message,
            timeStamp: data.timeStamp,
            conversationId: res[0].conversationId
          };
          saveDataForChat(chatModel, dataToSend, function (err, res) {
            saveChat = res;
            cb(null, saveChat);
          })

        } else {
          dataToSend = {
            receiverId: data.receiverId,
            senderId: data.senderId,
            message: data.message,
            timeStamp: data.timeStamp,
            conversationId: mongoose.Types.ObjectId()
          };
          saveDataForChat(chatModel, dataToSend, function (err, res) {
            saveChat = res;
            cb(null, saveChat);
          })
        }
      })
    },
    sendSocketMessage: ['saveMessageInDb', function (err, cb) {
      let to = socketInfo[data.receiverId]   //=socket.id;

      let socketCallback = {};
      getData(userModal, { _id: data.receiverId }, { socketId: 1 }, { lean: true }, (err, res) => {
        if (res[0].socketId) {
          let populate = [
            {
              path: 'senderId',
              match: {},
              select: 'name phoneNumber',
              options: {},
            },
            {
              path: 'receiverId',
              match: {},
              select: 'name phoneNumber',
              options: {},
            }
          ];

          getRequiredPopulate(chatModel, {}, {}, { lean: true }, populate)
            .then(data => {
              console.log("9999999999999999999999999   00000000000000000000000   ", data[data.length - 1])
              socketCallback = {
                message: data[data.length - 1]
              };
              io.to(res[0].socketId).emit("reciveMessage", socketCallback);
            })
        }
      })

      let criteria = { receiverId: data.receiverId };
      let populate = [
        {
          path: 'senderId',
          match: {},
          select: "name",
          options: {}
        },
        {
          path: 'receiverId',
          match: {},
          select: { deviceToken: 1, fullName: 1 },
          options: {}
        }
      ];
      cb(null)
    }],

  }, function (err) {
    if (err) {
      callback(err);
    } else {
      callback(null, saveChat)
    }
  });

};






let saveDataForChat = function (model, data, callback) {
  new model(data).save((err, result) => {
    if (err) return callback(err);
    callback(null, result);
  })
};


let findAndUpdate = function (model, conditions, update, options, callback) {
  model.findOneAndUpdate(conditions, update, options, function (error, result) {
    if (error) {
      return callback(error);
    }
    return callback(null, result);
  })
};

function updateData(collection, criteria, dataToUpdate, option) {
  return new Promise((resolve, reject) => {
    findAndUpdate(collection, criteria, dataToUpdate, option, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result)
      }
    });
  });
}


let getData = function (model, query, projection, options, callback) {
  model.find(query, projection, options, (err, data) => {
    if (err) return callback(err);
    else return callback(null, data);
  });
};

function getRequiredPopulate(collection, criteria, project, option, populate) {
  return new Promise((resolve, reject) => {
    populateData(collection, criteria, project, option, populate, (err, result) => {
      if (err) {
        reject(err);
      } else {
        if (result.length)
          resolve(result);
        else resolve([])
      }
    });
  });
}



let populateData = function (model, query, projection, options, collectionOptions, callback) {
  model.find(query, projection, options).populate(collectionOptions).exec(function (err, data) {
    if (err) return callback(err);
    return callback(null, data);
  });
};