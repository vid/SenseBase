// reset all ElasticSearch schemas and data
/*jslint node: true */

'use strict';


GLOBAL.config = require('../config.js').config;

var reset = require('../lib/reset.js');
reset.resetAll();
