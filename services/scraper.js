// service that periodically checks for and requests queued content

GLOBAL.config = require('../config.js').config;
GLOBAL.config.indexer = require('../lib/indexer.js');

var scraper = require('../lib/scraper.js');

// watch for new links every 2 seconds
setInterval(function() { scraper.getQueuedLink(scraper.getLink)}, 2000);
