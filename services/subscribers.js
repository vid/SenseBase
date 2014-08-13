// service that periodically checks for and requests queued content
/*jslint node: true */
'use strict';

var context = { config: require('../config.js').config };
console.log(context);
var auth = require('../lib/auth');
auth.setupUsers(context);
var pubsub = require('../lib/pubsub-client').init({ homepage: context.config.HOMEPAGE, clientID: auth.clientIDByUsername('system')});

pubsub.updateItem(function(result) {
  console.log('update', result);
});
