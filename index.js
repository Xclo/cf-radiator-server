/*jslint node: true*/
"use strict";

var express = require('express');
var app = express();
var http = require('http').Server(app);
var session = require('express-session');
// var RedisStore = require('connect-redis')(session);

//REST API
var sess = {
    // store: new RedisStore({}),
    secret: 'O16OkF1Yv@aINL4Y6b5MnhYUA0q30R6MZu5@#abBo^n6oFAIh5',
    resave: false,
    saveUninitialized: true
    // cookie: {secure: true}
}

if (app.get('env') === 'production') {
  app.set('trust proxy', 1) // trust first proxy
  sess.cookie.secure = true // serve secure cookies
}

app.use(session(sess));

app.use('/', require('./routes/ApiRoutes')(express));
app.use('/auth/', require('./routes/LoginRoutes')(express));
app.use(express.static(__dirname + '/public'));

//Templating
app.set('views', './views');
app.engine('jade', require('jade').__express);
app.set('view engine', 'jade');

//Server
console.log("PORT " + process.env.PORT) // Diego
var localPort = process.env.PORT || 5000;
http.listen(localPort, function () {
    console.log('Listening on *:' + localPort);
});
