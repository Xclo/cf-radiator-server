/*jslint node: true*/
"use strict";

var bodyParser = require('body-parser');
const async = require('async');
const Promise = require('bluebird');
const _ = require('lodash');
const axios = require('axios');

// var CloudController = require("cf-nodejs-client").CloudController;
// var CloudFoundryOrgs = require("cf-nodejs-client").Organizations;
// var CloudFoundrySpaces = require("cf-nodejs-client").Spaces;
// var CloudFoundryApps = require("cf-nodejs-client").Apps;
// CloudController = new CloudController();
// CloudFoundryOrgs = new CloudFoundryOrgs();
// CloudFoundrySpaces = new CloudFoundrySpaces();
// CloudFoundryApps = new CloudFoundryApps();

const CF = require("../services/CloudFoundry");
const CloudFoundry = new CF();

var Login = require('../services/Login');
Login = new Login();


module.exports = function (express) {

  var router = express.Router();
  router.use(bodyParser.json());
  router.use(bodyParser.urlencoded({ extended: false }));// parse application/x-www-form-urlencoded

  router.post('/login', (req, res) => {

    const username = req.body.username;
    const password = req.body.password;
    const api = req.body.api;

    if (!username || !password || !api) {
      res.status(400).send("Missing username, password or api endpoint");
      return;
    }

    Login.auth(api, username, password).then(function (result) {
      res.json(result);
    }).catch((error) => {
      console.log(error);
      res.send(error);
    });
  });

  router.post('/refreshToken', (req, res) => {
    const refreshToken = req.body.refresh_token;
    const api = req.body.api;

    if (!refreshToken || !api) {
      res.status(400).send("Missing refresh token or api endpoint");
      return;
    }

    Login.refresh(api, refreshToken).then(function (result) {
      res.json(result);
    }).catch((error) => {
      console.log(error);
      res.send(error);
    });
  });

  return router;
};
