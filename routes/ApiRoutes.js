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

  function loggedIn(req, res, next) {
    if (req.session.username === undefined) {
      res.redirect('/auth');
      return;
    } else {
      next();
    }
  }

  router.get('/', loggedIn, function (req, res) {
    let session = req.session;
    Login.auth(session.endpoint, session.username, session.password).then(function (result) {
      let token = {
        token_type: result.token_type,
        access_token: result.access_token
      }
      console.log(token);

      CloudFoundryOrgs.setEndPoint(session.endpoint);
      CloudFoundrySpaces.setEndPoint(session.endpoint);
      CloudFoundryApps.setEndPoint(session.endpoint);
      CloudFoundryOrgs.setToken(token);
      CloudFoundrySpaces.setToken(token);
      CloudFoundryApps.setToken(token);

      CloudFoundryOrgs.getOrganizations().then((orgs) => {
        return getOrgs(orgs);
      }).then((orgs) => {
        return getSpaces(orgs).then((orgs) => {
          return getAppInfo(orgs);
        });
      }).then((apps) => {
        return getHealthURLs(apps);
      }).then((apps) => {
        return performHealthCheck(apps);
      }).then((apps) => {
        res.json(apps);
      });
    });

	});

  router.post('/api/login', (req, res) => {

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

  router.post('/api/refreshToken', (req, res) => {
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

  router.get('/apps', validateApiToken, (req, res) => {
    const api = req.api;
    const authorization = req.authorization;

    getApps(api, authorization).then((apps) => {
      return getAppSummaries(api, authorization, apps);
    }).then((apps) => {
      // console.log(apps);
      res.json(apps);
    }).catch((error) => {
      handleError(res, error);
    });
	});

  router.get('/apps/:guid/health', validateApiToken, (req, res) => {

  });

  function validateApiToken(req, res, next) {
    const api = req.headers.api;
    const authorization = req.headers.authorization;

    if (!api || !authorization) {
      res.status(400).send("Missing api endpoint or token");
      return;
    }
    req.api = api;
    req.authorization = authorization;

    next();
  }

  function handleError(res, error) {
    console.log(error);
    console.log(error.response)
    if (error.response && error.response.status === 401) {
        res.status(401).send("unauthorized");
    } else {
        res.status(500).send("error");
    }

  }

  router.get('/stub/apps', (req, res) => {
    res.json(
    {
      "apps" : [
        {
          name: 'Google',
          url: 'https://google.com',
          guid: 1
        },
        {
          name: 'Yahoo',
          url: 'https://yahoo.com',
          guid: 2
        },
        {
          name: 'Microsoft',
          url: 'https://microsoft.com',
          guid: 3
        },
        {
          name: 'Github',
          url: 'https://github.com',
          guid: 4
        },
        {
          name: 'Twitter',
          url: 'https://twitter.com',
          guid: 5
        },
        {
          name: 'Facebook',
          url: 'https://facebook.com',
          guid: 6
        }
      ]
    });
  });



    router.get('/stub/app/:guid', (req, res) => {
      res.json(
        {
          name: 'Google',
          url: 'https://google.com',
          guid: 1,
          appInfo: {
            buildpack: 'java',
            staged:'25-Apr-2017',
            org: 'Pivotal',
            space: 'Dev',
            services: [
              {
                serviceInstance: 'a-redis',
                serviceName: 'Redis',
                plan: 'shared'
              },
              {
                serviceInstance: 'a-mySql',
                serviceName: 'MySql',
                plan: '100MB'
              }
            ]
          },
          health: {
            status: 'UP'
          },
          metrics: {
            disk: '100 MB',
            cpu: '70%',
            tps: '100'
          }
        });
    });




  function getAppSummaries(api, authorization, apps) {
    return new Promise((resolve, reject) => {
      let summaryPromises = [];
      apps.forEach((app) => {
        summaryPromises.push(CloudFoundry.getAppSummary(api, authorization, app.metadata.guid));
      })

      Promise.all(summaryPromises).then((responses) => {
        // if (_.every(responses, {status: 200})) {
          responses.forEach((response) => {
            let app = _.find(apps, (app) => {
                return app.metadata.guid === response.data.guid;
            });
            if (response.data.routes.length > 0) {
              app.route = `https://${response.data.routes[0].host}.${response.data.routes[0].domain.name}`
            }

            app.running_instances = response.data.running_instances;
            app.docker_image = response.data.docker_image;

            app.services = [];
            if (response.data.services.length > 0) {
              response.data.services.forEach((service) => {
                let s = {
                  name: service.name
                }
                if (service.service_plan) {
                  s.plan = service.service_plan.name,
                  s.service = service.service_plan.service.label
                }
                app.services.push(s);
              });
            }
          });
          resolve(apps)
        // } else {
          // reject('bad');
        // }
      }).catch((error) => {
        reject(error);
      });
    });

  }

  function getAppSummary(api, authorization, app) {

  }


  function getApps(api, token) {
    return new Promise((resolve, reject) => {
      CloudFoundry.getApps(api, token).then((response) => {
        let apps = response.data.resources.map((app) => {
          return {
            metadata: app.metadata,
            name: app.entity.name,
            buildpack: app.entity.buildpack,
            instances: app.entity.instances,
            memory: app.entity.memory,
            disk_quota: app.entity.disk_quota,
            state: app.entity.state,
            health_check_type: app.entity.health_check_type,
            health_check_http_endpoint: app.entity.health_check_http_endpoint
          }
        });
        resolve(apps);
      }).catch((error) => {
        reject(error);
      });
    });
  }

  const getOrgs = (orgs) => {
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
  }

  const getSpaces = (orgs) => {
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
    })
  }

  const getAppInfo = (orgs) => {
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
  }

  const getHealthURLs = (apps) => {
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
          }).catch((err) => {
            resolve(null);
          });
        });
        appPromises.push(appPromise);
      });
      Promise.all(appPromises).then((apps) => {
        resolve(_.without(apps, null));
      })
    });
  }

  const performHealthCheck = (apps) => {
    return new Promise((resolve, reject) => {
      var healthPromises = [];
      apps.forEach((app) => {
        let healthPromise = new Promise((resolve, reject) => {
          axios(app.app.url).then((resp) => {
            app.app.healthy = true;
            try {
                app.app.health = JSON.parse(resp);
            } catch (e) {

            }

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
  }

  return router;
};
