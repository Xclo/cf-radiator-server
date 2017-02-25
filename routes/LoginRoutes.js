/*jslint node: true*/
"use strict"

var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

//Routes
var Login = require('../services/Login');
Login = new Login();

module.exports = function (express) {

    var router = express.Router();
    router.use(bodyParser.json());
    router.use(bodyParser.urlencoded({extended: false}));

    function nocache(req, res, next) {
        res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
        res.header('Expires', '-1');
        res.header('Pragma', 'no-cache');
        next();
    }

    router.get('/', nocache, function (req, res) {

        console.log("GET /auth/login");

        res.render('login/login.jade');
    });

    router.post('/login', function (req, res) {

        console.log("POST /login");

        var endpoint = req.body.endpoint;
        var username = req.body.username;
        var password = req.body.password;

        var back = {
            path:"/auth/",
            text:"Login"
        }

        Login.auth(endpoint, username, password).then(function (result) {
          let session = req.session;
          // session.authToken = result;
          session.endpoint = endpoint;
          session.username = username;
          session.password = password;
          res.redirect('/');
        }).catch(function (reason) {

            //Parse output to detect "unauthorized" case
            try{
                var result = JSON.parse(reason);
                console.log(result);
                if(result.error === "unauthorized"){
                    res.render('global/globalError', {pageData: {error: result.error, back:back}});
                }else {
                    res.render('global/globalError', {pageData: {error: result, back:back}});
                }
            //Endpoint case
            }catch (error) {
                res.render('global/globalError', {pageData: {error: reason, back:back}});
            }

        //Others
        }).catch(function (reason) {
            res.render('global/globalError', {pageData: {error: reason, back:back}});
        });
    });

    router.get('/logout', nocache, function (req, res) {

        console.log("GET /logout");

        req.session.destroy();
        res.redirect('/');
    });

    return router;
};
