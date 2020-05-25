var mongoose = require("mongoose");
var ColorModel = new mongoose.Schema({
  like: [{ type:mongoose.Schema.Types.ObjectId }],
  color: Array,
});
module.exports = mongoose.model("ColorModel", ColorModel);
