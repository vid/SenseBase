// services that periodically checks for and requests queued content

var https = require('https');

var scraper = require('./scraper.js'), indexer = require('./indexer.js'), utils = require('./utils.js');

GLOBAL.config = require('../config.js').config;

setInterval(function() { scraper.getQueuedLink(getLink)}, 2000);

function getLink(err, queuedLink) {
  console.log('scraping', queuedLink);
  // retrieve https directly
  if (queuedLink.uri.toString().indexOf('https') === 0) {
    var buffer = '';
    https.get(queuedLink.uri, function(res) {
      res.on('data', function(d) {
        buffer += d;
      });

      res.on('end', function() {
        var data = buffer.toString();
        console.log(data.substr(0, 500));
        indexer.saveHTMLContentItem({ uri: queuedLink.uri, content: data, member: utils.localUser.username}, function(err, res) {
          utils.passingError(err);
          console.log('https scraped', err, data ? data.length : 'no content');
        });
      }).on('error', function(e) {
        GLOBAL.error(e);
      });
    });
  } else {
    // use the proxy
    scraper.scrapeLink(queuedLink.uri, function(err, res) {
      console.log('scraped', err, res ? res.length : 'no content');
    });
  }
}

