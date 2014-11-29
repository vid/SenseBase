// service that periodically checks for and requests queued content
/*jslint node: true */
'use strict';

require(process.cwd() + '/index.js').setup();

var subscriptionLib = require('../lib/subscriptions');

var clientID = GLOBAL.svc.auth.clientIDByUsername('system');
var pubsub = require('../lib/pubsub-client').init({ homepage: GLOBAL.config.HOMEPAGE, clientID: clientID }), subscripionLib = require('../lib/subscriptions');
var _ = require('lodash');

// check on start
processSubscriptions();
// check every minute
setInterval(processSubscriptions, 60000);

// process any subscriptions in the last time period
function processSubscriptions() {
  pubsub.subscriptions.request({}, function(results) {
    if (results.hits) {
      var subscriptions = _.pluck(results.hits.hits, '_source');
      console.log(subscriptions);
    }
  });
}
