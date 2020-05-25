const mongoose = require('mongoose'),
    Schema = mongoose.Schema,

 Chats = new Schema({
    conversationId:{type:Schema.ObjectId},
    senderId : {type: Schema.ObjectId, ref: 'users', index : true, require : true},
    receiverId : {type: Schema.ObjectId, ref: 'users'},
    message: {type: String,default:""},
    imageUrl:{type: String,default:""},
    sentAt : {type : Number},
    isDelivered : {type : Boolean, default : false},
    createdAt: {type: Number, default: Date.now()}
}, {timestamp: true});

module.exports = mongoose.model('Chats', Chats)
