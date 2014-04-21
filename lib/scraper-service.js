// services that periodically checks for and requests queued content

var scraper = require('./scraper.js');

GLOBAL.config = require('../config.js').config;

setInterval(function() {
  var queuedLink = scraper.getQueuedLink(function(err, queuedLink) {
    console.log('scraping', queuedLink, 'of', queuedLink.total);
    scraper.scrapeLink(queuedLink.uri, function(err, res) {
      console.log('scraped', err, res ? res.length : 'no content');
    });
  });
}, 2000);


