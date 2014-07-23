// content related functions

var cheerio = require('cheerio'), unfluff = require('unfluff');

var sites = require('./sites.js'), search = require('./search.js');

exports.indexContentItem = indexContentItem;

// Save an HTML content item, queueing content and creating annotations as required
// finally processes content
// if it's not an HTML item, do nothing and return.
// desc: { uri: uri, member: psMember, referer: referer, isHTML: browser_request.is_html, content: pageBuffer, contentType: contentType, headers: saveHeaders}
// options: { annotators: [] }
function indexContentItem(desc, callback) {
  // determine if it has an HTML title
  var m = /<title.*?>(.*)<\/title>/mi.exec(desc.content);

// no title
  if (!(m && m[1])) {
    GLOBAL.debug('not an html item', desc.uri);
    callback(false);
    return;
  } else {
    var title = m[1].replace(/<.*?>/g);
    GLOBAL.debug('INDEX', desc.uri, title, desc.content.length);
    desc.title = title;
    desc.content = extractContent(desc);
    desc.text = desc.text || utils.getTextFromHtml(cItem.content)
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
          GLOBAL.config.pubsub.requestAnnotate(cItem);
        }
      }
    });
  }
}

// find finer content areas if available
// extract content based on site definitions
function extractContent(desc) {
  // search all possible matches, returning first find
  var founds = sites.findMatch(desc.uri);

  if (founds.length) {
      var $ = cheerio.load(desc.html);
  // use first found extractor
    founds.forEach(function(found) {
      if ($(found.selector)) {
        var content = $(found.selector).html();
        return { selector: found.selector, content: content };
      }
    });
  }
  // ok, let's try unfluff
  return { selector: 'body', content: desc.content, text: unfluff(desc.html)};
}

