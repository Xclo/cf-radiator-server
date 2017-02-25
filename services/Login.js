/*jslint node: true*/
"use strict";

var CloudController = require("cf-nodejs-client").CloudController;
var CloudFoundryUsersUAA = require("cf-nodejs-client").UsersUAA;
var request = require('request');


CloudController = new CloudController();
CloudFoundryUsersUAA = new CloudFoundryUsersUAA();

function Login() {
  return undefined;
}

Login.prototype.auth = function (endpoint, username, password) {
    CloudController.setEndPoint(endpoint);
    return new Promise(function (resolve, reject) {
      try {
        CloudController.getInfo().then(function (result) {
          let token_endpoint = result.token_endpoint;
          let authorization_endpoint = result.authorization_endpoint;
          CloudFoundryUsersUAA.setEndPoint(authorization_endpoint);
            return resolve(CloudFoundryUsersUAA.login(username, password));
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
