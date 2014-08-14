// service that periodically checks for and requests queued content
/*jslint node: true */
'use strict';

var context = { config: require('../config.js').config };
var auth = require('../lib/auth');
auth.setupUsers(context);
var clientID = auth.clientIDByUsername('system');
var pubsub = require('../lib/pubsub-client').init({ homepage: context.config.HOMEPAGE, clientID: clientID }), subscripionLib = require('../lib/subscriptions');
var _ = require('lodash');

// retrieve subscriptions
  pubsub.retrieveSubscriptions({for: '*'}, function(results) {
    if (results.hits) {
      var subscriptions = _.pluck(results.hits.hits, '_source');
    }
  });
pubsub.updateItem(function(result) {
  console.log('update', result.uri, result.annotations);
});
