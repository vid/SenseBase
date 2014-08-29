// service that periodically checks for and requests queued content
/*jslint node: true */
'use strict';

GLOBAL.config = require('../config.js').config;
GLOBAL.config.indexer = require('../lib/indexer.js');

var cron = require('cron');

checkCrons();

function checkCrons() {
  GLOBAL.config.indexer.retrieveSearches({}, function(err, res) {
    console.log(err, JSON.stringify(res, null, 2));
  });
  setTimeout(checkCrons, 5000);

}
