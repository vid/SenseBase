// content related functions

GLOBAL.config = require('../config.js').config;

var indexer = require('./indexer.js'), utils = require('./utils.js'), pubsub = require('./pubsub.js'), scraper = require('./scraper.js');

// save a content item, queueing content and creating annotations as required
// desc: { uri: uri, member: psMember, referer: referer, isHTML: browser_request.is_html, content: pageBuffer, contentType: contentType, headers: saveHeaders}
exports.indexContentItem = function(desc, callback) {
  indexer.saveHTMLContentItem(desc, function(err, res, cItem) {
    if (err) {
      GLOBAL.error('index saveContentitem failed', err);
    } else {
      // it was an html content item
      if (cItem) {
        // designated for scraping
        if (cItem.previousState === 'queued') {
          GLOBAL.info('queueing links', cItem.uri);
          scraper.queueLinks(cItem);
        }
        pubsub.requestAnnotate(desc.uri, desc.content);
      }
    }
  });
}

