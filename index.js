// Main module for SenseBase.
/*jslint node: true */

'use strict';

var fs = require('fs'),
  http = require('http'),
  flash = require('connect-flash'),
  express = require('express'),
  util = require('util');

var utils = require('./lib/utils');

var pubsub, search = require('./lib/search.js'), content = require('./lib/content.js');

// Runtime users.
var users;

// Load local configuration if available.
if (fs.existsSync('./local-site.json')) {
  users = require('./local-site.json').logins;
} else {
// Use default included configuration.
  users = require('./site.json').logins;
}

// Start server with configuration.
exports.start = function(config, callback) {
  GLOBAL.authed = GLOBAL.authed || {}; //FIXME  use auth scheme that works behind proxies
  config.users = users;
  config.indexer = require('./lib/indexer.js');
// Proxy operation.
  config.pageCache = require('./lib/pageCache.js');
// Proxy operation.
  config.onRequest = require('./lib/auth.js');
// Proxy operation.
//
// Proxy has requested a content item.
  config.onRetrieve = {
    process: function(uri, referer, is_html, pageBuffer, contentType, saveHeaders, browser_request) {
      var status = browser_request.proxy_received.statusCode;
      if (status != 200) {
        GLOBAL.debug('non-200 status', status, uri);
        return;
      }
      // FIXME don't save binaries
      GLOBAL.config.pageCache.cache(uri, referer, is_html, pageBuffer, contentType, saveHeaders, browser_request);
      var psMember = browser_request.psMember.username;
      var desc = { uri: uri, referer: referer, isHTML: browser_request.is_html, content: pageBuffer, contentType: contentType, headers: saveHeaders};
      content.indexContentItem(desc, { categories: ['proxy'], member: psMember});
    }
  };
// Proxy operation.
// Inject SenseBase controls.
  config.inject = function(content) {
    if (content.toString().match(/<\/body/i)) {
      GLOBAL.debug('injecting iframe');
      // add a div in case there is none, and a div to enable placing the iframe inline
      content = content.toString()//replace(/(<body.*?>)/im, '<div style="margin: 0; padding: 0" id="SBEnclosure">$1')
        .replace(/<\/body/im, '<div id="sbIframe" ' +
         'style="z-index: 899; position: fixed; right: 1em; top: 0; width: 20em; height: 90%; color: black; background: #ffe; filter:alpha(opacity=90); opacity:0.9; border: 0">' +
         '<iframe style="width: 100%; height: 100%" src="/__wm/injected-iframe.html"></iframe></div></body');
//<div id="SBInsie"></div><script src="' + GLOBAL.config.HOMEPAGE + 'inject.js"></script></body');
    }
    return content;
  };
  config.sitebase = config.sitebase || '';
// Globally shared config.
  GLOBAL.config = config;
  pubsub = require('./lib/pubsub.js');
  GLOBAL.config.pubsub = pubsub;

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
