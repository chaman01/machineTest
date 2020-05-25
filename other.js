var mongoose = require("mongoose");
var passportLocalMongoose = require("passport-local-mongoose");

var other = new mongoose.Schema({
  address: String,
});
module.exports = mongoose.model("other", other);
