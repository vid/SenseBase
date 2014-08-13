// service that periodically checks for and requests queued content
/*jslint node: true */
'use strict';

GLOBAL.config = require('../config.js').config;

var pubsub = require('../lib/pubsub-client');

pubsub.updateItem(function(result) {
  console.log('update', result);
});
