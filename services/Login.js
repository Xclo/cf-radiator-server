/*jslint node: true*/
"use strict";

// var CloudController = require("cf-nodejs-client").CloudController;
// var CloudFoundryUsersUAA = require("cf-nodejs-client").UsersUAA;
// var request = require('request');


// CloudController = new CloudController();
// CloudFoundryUsersUAA = new CloudFoundryUsersUAA();

const CF = require("../services/CloudFoundry");
const CloudFoundry = new CF();


function Login() {
  return undefined;
}

Login.prototype.auth = function (api, username, password) {
    return new Promise(function (resolve, reject) {
      try {
        CloudFoundry.getInfo(api).then(function (result) {
          let authorization_endpoint = result.data.authorization_endpoint;
            return resolve(CloudFoundry.login(authorization_endpoint, username, password));
          }).catch(function (reason) {
            return reject(reason);
          });
      } catch (error) {
        console.log(error);
        return reject(error);
      }
    });
};

Login.prototype.refresh = function (api, refresh_token) {
    return new Promise(function (resolve, reject) {
      try {
        CloudFoundry.getInfo(api).then(function (result) {
          let authorization_endpoint = result.data.authorization_endpoint;
            return resolve(CloudFoundry.refresh(authorization_endpoint, refresh_token));
          }).catch(function (reason) {
            return reject(reason);
          });
      } catch (error) {
        console.log(error);
        return reject(error);
      }
    });
};

module.exports = Login;
