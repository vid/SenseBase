// Main module for SenseBase.
/*jslint node: true */

'use strict';

var fs = require('fs'),
  http = require('http'),
  flash = require('connect-flash'),
  express = require('express'),
  util = require('util'),
  _ = require('lodash');

var utils = require('./lib/utils'), proxied = require('./lib/proxy-rewrite.js');
var pubsub, auth = require('./lib/auth');

// Start server with configuration.
exports.start = function(context, callback) {
  var config = context.config;
  // proxy rewriting
  config.onRequest = proxied.onRequest;
  config.onRetrieve = proxied.onRetrieve;
  config.inject = proxied.inject;
  config.sitebase = config.sitebase || '';

// Globally shared config.
  GLOBAL.config = config;
  var users;

  auth.setupUsers(GLOBAL, context.logins);
  pubsub = require('./lib/pubsub.js');
  GLOBAL.config.pubsub = pubsub;
  GLOBAL.config.auth = auth;
  config.indexer = require('./lib/indexer.js');
  config.pageCache = require('./lib/pageCache.js');

// Express stuff.
  var app = express();
  var actions = require('./lib/app-actions.js');

  app.configure(function() {
    app.use(express.cookieParser());
    app.use(express.bodyParser());
//    app.use(express.logger({stream: GLOBAL.config.logStream}));
    app.use(express.methodOverride());
    app.use(express.session({ secret: 'popsicle-fish' }));
    app.use(flash());
    app.use(actions);
    app.use(app.router);

    app.enable('trust proxy');
  });

  var server = app.listen(GLOBAL.config.HTTP_PORT || 9999);

  pubsub.start(server);

  var filterProxy = require('filter-proxy');

  filterProxy.start(GLOBAL.config);

// Interactive command line.

  var repl = require('repl');
  var r = repl.start({ prompt: GLOBAL.config.project + "> ", useGlobal: true});
  if (callback) {
    callback();
  }
};
