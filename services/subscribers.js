// service that periodically checks for and requests queued content
/*jslint node: true */
'use strict';

require(process.cwd() + '/index.js').setup();

var clientID = GLOBAL.svc.auth.clientIDByUsername('system');
var pubsub = require('../lib/pubsub-client').init({ homepage: GLOBAL.config.HOMEPAGE, clientID: clientID }), subscripionLib = require('../lib/subscriptions');
var _ = require('lodash');

// retrieve subscriptions
pubsub.subscriptions.request({}, function(results) {
  if (results.hits) {
    var subscriptions = _.pluck(results.hits.hits, '_source');
  }
});
