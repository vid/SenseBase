// services that periodically checks for and requests queued content

var scraper = require('./scraper.js'), content = require('./content.js'), utils = require('./utils.js');

GLOBAL.config = require('../config.js').config;

setInterval(function() { scraper.getQueuedLink(getLink)}, 2000);
getLink(null, { uri: 'https://github.com/elasticsearch/elasticsearch/issues/2674'} );

function getLink(err, queuedLink) {
  console.log('scraping', queuedLink);
  // retrieve https directly
  if (queuedLink.uri.toString().indexOf('https') === 0) {
    utils.retrieveHTTPS(queuedLink.uri, function(err, data) {
      content.indexContentItem({ uri: queuedLink.uri, content: data, member: utils.localUser.username}, function(err, res) {
        utils.passingError(err);
        console.log('https scraped', err, data ? data.length : 'no content');
      });
    });
  } else {
    // use the proxy
    scraper.scrapeLink(queuedLink.uri, function(err, res) {
      console.log('scraped', err, res ? res.length : 'no content');
    });
  }
}

