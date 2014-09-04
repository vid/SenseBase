// reset all ElasticSearch schemas and data
/*jslint node: true */

'use strict';

require(process.cwd() + '/index.js').setup();

var reset = require('../lib/reset.js');
reset.resetAll();
