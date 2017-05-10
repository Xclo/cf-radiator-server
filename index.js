/*jslint node: true*/
"use strict";

var express = require('express');
var app = express();
var http = require('http').Server(app);
const config = require('./config');

if (config.skipSSLValidation) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

//REST API
// if (app.get('env') === 'production') {
//   app.set('trust proxy', 1) // trust first proxy
//   sess.cookie.secure = true // serve secure cookies
// }

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, api, authorization");
  next();
});

app.use('/api/auth/', require('./routes/LoginRoutes')(express));
app.use('/api/', require('./routes/ApiRoutes')(express));

//Server
console.log("PORT " + process.env.PORT) // Diego
var localPort = process.env.PORT || 5000;
http.listen(localPort, function () {
    console.log('Listening on *:' + localPort);
});
