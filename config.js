const config = {
  skipSSLValidation: true,
  foundations: [
    {
      "name": "PWS",
      "api": "https://api.run.pivotal.io"
    },
    {
      "name": "Brian's Install",
      "api": "https://api.run.pcf.cloud"
    }
  ]
}

module.exports = config;
