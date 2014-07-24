// service that periodically checks for and requests queued content

GLOBAL.config = require('../config.js').config;
GLOBAL.config.indexer = require('../lib/indexer.js');
GLOBAL.config.pubsub = require('../lib/pubsub.js');

var search = require('../lib/search.js');

// watch for new links every 2 seconds
setInterval(function() { search.getQueuedLink(search.getLinkContents)}, 2000);
