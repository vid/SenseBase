// content related functions

var cheerio = require('cheerio'), unfluff = require('unfluff');

var sites = require('./sites.js'), search = require('./search.js');

exports.indexContentItem = indexContentItem;
exports.extractContent = extractContent;

// save a content item, queueing content and creating annotations as required
// desc: { uri: uri, member: psMember, referer: referer, isHTML: browser_request.is_html, content: pageBuffer, contentType: contentType, headers: saveHeaders}
function indexContentItem(desc, callback) {
  GLOBAL.config.indexer.saveHTMLContentItem(desc, function(err, res, cItem) {
    if (err) {
      GLOBAL.error('index saveContentitem failed', err);
    } else {
      // it was an html content item
      if (cItem) {
        // designated for scraping
        if (cItem.previousState === 'queued') {
          GLOBAL.info('queueing links', cItem.uri, 'relevance', cItem.queued.relevance);
          search.queueLinks(cItem);
        }
        GLOBAL.config.pubsub.requestAnnotate(desc.uri, desc.content);
      }
    }
  });
}

// find finer content areas if available
// extract content based on site definitions
function extractContent(uri, html, callback) {
  var $ = cheerio.load(html);
  // search all possible matches, returning first find
  var founds = sites.findMatch(uri);

  // use first found extractor
  founds.forEach(function(found) {
    if ($(found.selector)) {
      var content = $(found.selector).html();
      callback(uri, html, found.selector, content);
      return;
    }
  });
  // ok, let's try unfluff

  callback(uri, html, 'body', unfluff(html));

  /*
  var def = $('body').html() || html;
  callback(uri, html, 'body', def);
  */
}

