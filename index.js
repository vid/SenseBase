// Main module for SenseBase.
/*jslint node: true */

'use strict';

var fs = require('fs'),
  http = require('http'),
  flash = require('connect-flash'),
  express = require('express');

var utils = require('./lib/utils'), proxied = require('./lib/proxy-rewrite.js'), pageCache = require('./lib/pageCache.js'),
  pubsub = require('./lib/pubsub.js'), auth = require('./lib/auth'), indexer = require('./lib/indexer.js');

exports.setup = setup;

// Start server with configuration.
exports.start = function(context, callback) {
  setup(context);
  var config = GLOBAL.config;

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

  filterProxy.start(proxied);

// Interactive command line.

  var repl = require('repl');
  var r = repl.start({ prompt: GLOBAL.config.project + "> ", useGlobal: true});
  if (callback) {
    callback();
  }
};

// Set up the GLOBAL environment with configuration and services
//
// Defaults to directory config and users if no context is passed.
//
// pubsub will need to be started on its own.

function setup(context) {
  if (GLOBAL.config) {
    console.log('already configured');
    console.trace();
    return;
  }
  if (!context) {
    context = require('./config.js');
  }

  GLOBAL.config = context.config;

  var svc = { pubsub: pubsub, auth: auth, indexer: indexer, pageCache: pageCache };

  GLOBAL.svc = svc;
  auth.setupUsers(GLOBAL, context.logins);
}
