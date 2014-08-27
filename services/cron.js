// service that periodically checks for and requests queued content
/*jslint node: true */
'use strict';

GLOBAL.config = require('../config.js').config;
GLOBAL.config.indexer = require('../lib/indexer.js');

var cron = require('cron');

setInterval(checkCrons, 5000);

function checkCrons() {
  GLOBAL.config.indexer.retrieveSearches('demo', function(err, res) {
    console.log(err, res);
  });

}
