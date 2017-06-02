"use strict";
const axios = require('axios');
const rp = require('request-promise');

const tokenType = 'bearer';

function CloudFoundry() {
  return undefined;
}

CloudFoundry.prototype.getApps = (api, authorization, filter) => {

  const url = `${api}/v2/apps`;
  let qs = {};

  console.log("Query String Filter: " + filter)
  if (filter) {
    qs = filter;
  }
  const options = {
    method: "GET",
    url: url + "?q=" + qs,
    headers: {
      Authorization: `${authorization}`
    },
    validateStatus: (status) => {
      return status === 200
    }
  };
  return axios(options);
  // return rp(options);
}

CloudFoundry.prototype.getAppSummary = (api, authorization, guid, filter) => {

  const url = `${api}/v2/apps/${guid}/summary`;
  let qs = {};

  if (filter) {
    qs = filter;
  }
  const options = {
    method: "GET",
    url: url,
    headers: {
      Authorization: `${authorization}`
    },
    q: qs,
    validateStatus: (status) => {
      return status === 200
    }
  };
  return axios(options);
}

CloudFoundry.prototype.login = (api, username, password) => {

  const url = `${api}/oauth/token`;

  const options = {
    method: "POST",
    url: url,
    headers: {
      Authorization: "Basic Y2Y6",
      "Content-Type": "application/x-www-form-urlencoded"
    },
    form: {
      grant_type: "password",
      client_id: "cf",
      username: username,
      password: password
    },
    json: true
  };
  return rp(options);
}

CloudFoundry.prototype.refresh = (api, refresh_token) => {

  const url = `${api}/oauth/token`;

  const options = {
    method: "POST",
    url: url,
    headers: {
      Authorization: "Basic Y2Y6",
      "Content-Type": "application/x-www-form-urlencoded"
    },
    form: {
      grant_type: "refresh_token",
      refresh_token: refresh_token
    },
    json: true
  };
  return rp(options);
}

CloudFoundry.prototype.getInfo = (api) => {
  const url = `${api}/v2/info`;
  return axios.get(url);
}

module.exports = CloudFoundry;
