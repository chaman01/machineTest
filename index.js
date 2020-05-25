const express = require("express"),
  bodyParse = require("body-parser"),
  mongoose = require("mongoose"),
  app = express(),
  User = require("./User"),
  validateSchema = require("./validater"),
  cors = require('cors'),
  DAO = require('./queries'),
  Joi = require('joi'),
  bcrypt = require("bcrypt"),
  http = require('http');
  jwt = require("jsonwebtoken");

var socketConnection = require('./socket');
var server = require("http").Server(app);

require("dotenv").config();
app.disable("x-powered-by"); ///security purpus
app.use(cors({ credentials: true, origin: true }));
app.use(bodyParse.json({ limit: "100mb" }));
app.use(bodyParse.urlencoded({ limit: "100mb", extended: true }));
app.use(
  require("express-session")({
    secret: "Once test",
    resave: false,
    saveUninitialized: false,
  })
);


app.post("/addUser", async (req, res) => {
  try {
    let schema = Joi.object().keys({
      email: Joi.string().email().required(),
      name: Joi.string().required(),
      phoneNumber: Joi.string().required(),
      password: Joi.string().required(),
      deviceToken: Joi.string().optional().allow("")
    });
    let payload = await validateSchema(req.body, schema, {
      presence: "required"
    })

    let [isEmailAlready, isPhoneAlready] = await Promise.all([
      User.findOne({ email: payload.email }, {}, { lean: true }),
      User.findOne({ phoneNumber: payload.phoneNumber }, {}, { lean: true })
    ]);

    if (isEmailAlready)
      return res.status(400).json({ msg: "Email is already exists", statusCode: 400 });

    if (isPhoneAlready)
      return res.status(400).json({ msg: "Phone number is already exists", statusCode: 400 });

    payload.loginTime = new Date().getTime();
    payload.password = await bcrypt.hashSync(payload.password, 10);
    let data = await DAO.saveData(User, payload);
    let tokenData = {
      scope: "user",
      role: "user",
      _id: data._id,
      loginTime: payload.loginTime
    };
    let token = await generateToken(tokenData);
    let dataToSend = {
      token: token,
      email: data.email,
      deviceToken: data.deviceToken,
      loginTime: data.loginTime,
      _id: data._id,
      name: data.name,
      phoneNumber: data.phoneNumber,
      createdAt: data.createdAt
    };
    return res
      .status(200)
      .json({ data: dataToSend, msg: "success", statusCode: 200, isMatch: true });

  } catch (err) {
    console.log("err  err err   ", err)
    res.status(400).json({ data: err, msg: "error", statusCode: 400 });
  }
});



app.post("/login", async (req, res) => {
  try {
    let schema = Joi.object().keys({
      email: Joi.string().email().required(),
      phoneNumber: Joi.string().required(),
      password: Joi.string().required(),
      deviceToken: Joi.string().optional().allow("")
    });
    let payload = await validateSchema(req.body, schema, {
      presence: "required"
    })

    let findUser = await DAO.getDataOne(User, { email: payload.email }, { password: 1, _id: 1 }, { lean: true });
    if (!findUser) throw "The email address you have entered is not registered with us.";

    let isMatched = await bcrypt.compareSync(
      payload.password,
      findUser.password
    );
    if (!isMatched)
      throw "The password you have entered is invalid";
    payload.loginTime = new Date().getTime();
    let dataToSet = {
      loginTime: payload.loginTime,
      deviceToken: payload.deviceToken,
      deviceType: payload.deviceType
    };
    let data = await DAO.findAndUpdate(User, { _id: findUser._id }, { $set: dataToSet }, { lean: true, new: true });
    let tokenData = {
      scope: "user",
      role: "user",
      _id: data._id,
      loginTime: payload.loginTime
    };
    let token = await generateToken(tokenData);
    let dataToSend = {
      token: token,
      email: data.email,
      deviceToken: data.deviceToken,
      loginTime: data.loginTime,
      _id: data._id,
      name: data.name,
      phoneNumber: data.phoneNumber,
      createdAt: data.createdAt
    };
    return res
      .status(200)
      .json({ data: dataToSend, msg: "success", statusCode: 200, isMatch: true });

  } catch (err) {
    console.log("err  err err   ", err)
    res.status(400).json({ data: err, msg: "error", statusCode: 400 });
  }
});

app.set("port", 3000);
mongoose.Promise = global.Promise;
mongoose.connect("mongodb://127.0.0.1:27017/machine_test", {
  useNewUrlParser: true,
  useCreateIndex: true,
  useFindAndModify: false,
});
mongoose.connection.on("error", function (err) {
  console.log("mongo db connection terminate " + err);
  process.exit();
});

mongoose.connection.once("open", function () {
  server.listen(app.get("port"), function (req) { });
  server = http.createServer(app);
  socketConnection.connectSocket(server);
  console.log("Node app is running on port", app.get("port"));
});


const generateToken = async val => {
  return new Promise((resolve, reject) => {
    try {
      let key;
      if (val.scope == "user") {
        key = process.env.JWT_SECRET_USER;
      } else {
        key = process.env.JWT_SECRET_ADMIN;
      }
      let token = jwt.sign({ data: val }, key, {
        algorithm: "HS256"
      });
      resolve(token);
    } catch (err) {
      throw err;
    }
  });
};


