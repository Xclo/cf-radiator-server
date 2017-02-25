/*jslint node: true*/
"use strict";

var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
const async = require('async');
const Promise = require('bluebird');
const _ = require('lodash');
const rp = require('request-promise');

var CloudController = require("cf-nodejs-client").CloudController;
var CloudFoundryOrgs = require("cf-nodejs-client").Organizations;
var CloudFoundrySpaces = require("cf-nodejs-client").Spaces;
var CloudFoundryApps = require("cf-nodejs-client").Apps;
CloudController = new CloudController();
CloudFoundryOrgs = new CloudFoundryOrgs();
CloudFoundrySpaces = new CloudFoundrySpaces();
CloudFoundryApps = new CloudFoundryApps();

var Login = require('../services/Login');
Login = new Login();


module.exports = function (express) {

  var router = express.Router();
  router.use(bodyParser.json());
  router.use(bodyParser.urlencoded({ extended: false }));// parse application/x-www-form-urlencoded

  function loggedIn(req, res, next) {
    if (req.session.username === undefined) {
      res.redirect('/auth');
      return;
    } else {
      next();
    }
  }

  router.get('/', loggedIn, function (req, res) {
		console.log("GET /apps/")

    let session = req.session;
    Login.auth(session.endpoint, session.username, session.password).then(function (result) {
      let token = {
        token_type: result.token_type,
        access_token: result.access_token
      }

      CloudFoundryOrgs.setEndPoint(session.endpoint);
      CloudFoundrySpaces.setEndPoint(session.endpoint);
      CloudFoundryApps.setEndPoint(session.endpoint);
      CloudFoundryOrgs.setToken(token);
      CloudFoundrySpaces.setToken(token);
      CloudFoundryApps.setToken(token);

      CloudFoundryOrgs.getOrganizations().then((orgs) => {
        return new Promise((resolve, reject) => {
          async.map(orgs.resources, function(o, callback) {
            callback(null, {
              guid: o.metadata.guid,
              name: o.entity.name,
              spaces: []
            })
          }, function(err, orgs) {
            resolve(orgs);
          })
        });
      }).then((orgs) => {
        return new Promise((resolve, reject) => {
          CloudFoundrySpaces.getSpaces().then(function(spaces) {
            spaces.resources.forEach((space) => {
              let org = orgs.find(function(o) {
                return o.guid === space.entity.organization_guid
              });

              var spaceInfo = {
                name: space.entity.name,
                guid: space.metadata.guid,
              }
              org.spaces.push(spaceInfo);
            });
            resolve(orgs);
          });
        }).then((orgs) => {
          return new Promise((resolve, reject) => {
            var spacePromises = [];
            orgs.forEach((org) => {
              org.spaces.forEach((space) => {
                let spacePromise = new Promise((resolve, reject) => {
                  CloudFoundrySpaces.getSpaceApps(space.guid).then((apps) => {
                    let appInfoReturn = [];
                    apps.resources.forEach((app) => {
                        let appInfo = {
                          org: {
                            guid: org.guid,
                            name: org.name
                          },
                          space: {
                            guid: space.guid,
                            name: space.name
                          },
                          app: {
                            guid: app.metadata.guid,
                            name: app.entity.name
                          }
                        };
                        appInfoReturn.push(appInfo);
                    });
                    resolve(appInfoReturn);
                  })
                });
                spacePromises.push(spacePromise);
              });
            });

            Promise.all(spacePromises).then((apps) => {
              resolve(_.flattenDeep(apps))
            });
          });
        });
      }).then((apps) => {
        return new Promise((resolve, reject) => {
          var appPromises = [];
          apps.forEach((app) => {
            let appPromise = new Promise((resolve, reject) => {
              CloudFoundryApps.getStats(app.app.guid).then(function(result) {
                if (result["0"].state === "RUNNING") {
                  var url = "http://" + result["0"].stats.uris[0];
                  app.app.url = url + '/health';
                  resolve(app);
                } else {
                  resolve(null);
                }
              }).catch(function (err) {
                resolve(null);
              });
            });
            appPromises.push(appPromise);
          });
          Promise.all(appPromises).then((apps) => {
            resolve(_.without(apps, null));
          })
        });
      }).then((apps) => {
        return new Promise((resolve, reject) => {
          var healthPromises = [];
          apps.forEach((app) => {
            let healthPromise = new Promise((resolve, reject) => {
              rp(app.app.url).then((resp) => {
                app.app.healthy = true;
                resolve(app);
              }).catch(() => {
                app.app.healthy = false;
                resolve(app);
              })
            })
            healthPromises.push(healthPromise);
          });
          Promise.all(healthPromises).then((apps) => {
            resolve(apps);
          })
        });
      }).then((apps) => {
        res.json(apps);
      });
    });

	});

    return router;
};
