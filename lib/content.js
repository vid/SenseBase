// content related functions

var cheerio = require('cheerio'), unfluff = require('unfluff');

var sites = require('./sites.js'), search = require('./search.js'), utils = require('./utils.js');

exports.indexContentItem = indexContentItem;

// Save an HTML content item, queueing content and creating annotations as required
// finally processes content
// if it's not an HTML item, do nothing and return.
// desc: { uri: uri, member: psMember, referer: referer, isHTML: browser_request.is_html, content: pageBuffer, contentType: contentType, headers: saveHeaders}
// options: { annotators: [], categories: []}
function indexContentItem(desc, callback, options) {
  // determine if it has an HTML title
  if (desc.state !== utils.states.queued) {
    var m = /<title.*?>(.*)<\/title>/mi.exec(desc.content);

  // no title
    if (!(m && m[1])) {
      GLOBAL.debug('not an html item', desc.uri);
      callback(false);
      return;
    }
    desc.title = m[1].replace(/<.*?>/g);
  }
  desc.content = extractContent(desc);
  GLOBAL.debug('INDEX', desc.uri, desc.title, desc.content.length);
  //desc.text = desc.text || utils.getTextFromHtml(cItem.content)
  //
  if (options.categories) {
    options.categories.forEach(function(category) {
      desc.annotations.push(annotations.createAnnotation({hasTarget: desc.uri, type: 'category', category: category, state: desc.state, annotatedBy: options.member}));
    });
  }
  GLOBAL.config.indexer.saveContentItem(desc, function(err, res, cItem) {
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

