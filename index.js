// main module for SenseBase
// meant to be modular but that needs some work.

var fs = require('fs'), 
  http = require('http'),
  flash = require('connect-flash'),
  express = require('express'),
  util = require('util');
  
var utils = require('./lib/utils');

var pubsub, scraper = require('./lib/scraper.js'), content = require('./lib/content.js');

var users;

if (fs.existsSync('./local-site.json')) {
  users = require('./local-site.json').logins;
} else {
  users = require('./site.json').logins;
}

// start server with a configuration file
exports.start = function(config) {
  GLOBAL.authed = GLOBAL.authed || {}; //FIXME  use auth scheme that works behind proxies
  config.users = users;
  config.indexer = require('./lib/indexer.js');
  config.pageCache = require('./lib/pageCache.js');
  config.onRequest = require('./lib/auth.js');
  // proxy has requested a content item.  need to update its anntotatoin and if it was queued add any links
  config.onRetrieve = {
    process: function(uri, referer, is_html, pageBuffer, contentType, saveHeaders, browser_request) {
      var status = browser_request.proxy_received.statusCode;
      if (status != 200) {
        GLOBAL.debug('non-200 status', status, uri);
        return;
      }
      GLOBAL.config.pageCache.cache(uri, referer, is_html, pageBuffer, contentType, saveHeaders, browser_request);
      var psMember = browser_request.psMember.username;
      var desc = { uri: uri, member: psMember, referer: referer, isHTML: browser_request.is_html, content: pageBuffer, contentType: contentType, headers: saveHeaders}
      content.indexContentItem(desc);
    }
  };
  config.inject = function(content) {
    if (content.toString().match(/<\/body/i)) {
      GLOBAL.debug('injecting iframe');
      // add a div in case there is none, and a div to enable placing the iframe inline
      content = content.toString().replace(/(<body.*?>)/im, '<div style="margin: 0; padding: 0" id="SBEnclosure">$1')
        .replace(/<\/body/im, '</div><div id="SBInsie"></div><script src="/__wm/injected.js"></script></body');
    }
    return content;
  };
  config.sitebase = config.sitebase || '';
  // globally shared context
  GLOBAL.config = config;
  pubsub = require('./lib/pubsub.js');
  GLOBAL.config.pubsub = pubsub;

  // Express stuff
  var app = express();
  var actions = require('./lib/app-actions.js');
  
  app.configure(function() {
    app.set('views', __dirname + '/views');
    app.set('view engine', 'ejs');
    app.use(express.cookieParser());
    app.use(express.bodyParser());
    app.use(express.logger({stream: GLOBAL.config.logStream}));
    app.use(express.methodOverride());
    app.use(express.session({ secret: 'popsicle-fish' }));
    app.use(flash());
    app.use(GLOBAL.config.sitebase, actions);
    app.use(app.router);

    app.enable('trust proxy');
  });



  
  var server = app.listen(GLOBAL.config.HTTP_PORT || 9999);
  
  pubsub.start(server);
  
  var filterProxy = require('filter-proxy');
  
  filterProxy.start(GLOBAL.config); 
  
  // interactive command line
  
  repl = require("repl");
  r = repl.start({ prompt: GLOBAL.config.project + "> ", useGlobal: true});
};
