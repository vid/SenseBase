// reset all ElasticSearch schemas and data


GLOBAL.config = require('../config.js').config;

var reset = require('../lib/reset.js');
reset.resetAll();


