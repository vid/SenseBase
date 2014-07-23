// content related functions

var cheerio = require('cheerio'), unfluff = require('unfluff');

var sites = require('./sites.js'), search = require('./search.js'), utils = require('./utils.js'), annotations = require('./annotations.js');

exports.indexContentItem = indexContentItem;

// Save an HTML content item, queueing content and creating annotations as required
// finally processes content
// if it's not an HTML item, do nothing and return.
// desc: { uri: uri, member: psMember, referer: referer, isHTML: browser_request.is_html, content: pageBuffer, contentType: contentType, headers: saveHeaders}
// options: { annotators: [], categories: []}
function indexContentItem(desc, callback, options) {
  options = options || {};
  // determine if it has an HTML title
  if (desc.state !== utils.states.queued) {
    var m = /<title.*?>(.*)<\/title>/mi.exec(desc.content);

  // no title
    if (!(m && m[1])) {
      GLOBAL.error('not an html item', desc.uri);
      // FIXME: deal with unqueued non html content
      callback(false);
      return;
    }
    desc.title = m[1].replace(/<.*?>/g);
  }
  if (desc.html) {
   desc.content = extractContent(desc);
  } else {
    delete desc.content;
  }
  // add passed categories
  if (options.categories) {
    options.categories.forEach(function(category) {
      desc.annotations.push(annotations.createAnnotation({hasTarget: desc.uri, type: 'category', category: category, state: desc.state, annotatedBy: options.member}));
    });
  }
  cItem = annotations.createContentItem(desc);
// find any existing instance
  GLOBAL.config.indexer.retrieveByURI(desc.uri, function(err, results) {
//    utils.passingError(err);
// it has been indexed
    if (results && results._source) {
      GLOBAL.info('INDEXING update', desc.uri);
      // transfer historical data
      var hItem = results._source;
      cItem.history.push(hItem);
      // merge existing properties
      ['annotations', 'visitors', 'referers', 'headers', 'history'].forEach(function(p) {
        // FIXME remove duplicates
        cItem[p] = cItem.concat(cItem[p], oItem[p]);
      });
    }

// add additional data
    if (desc.member) {
      cItem.visitors.push({ member: desc.member, '@timestamp': new Date().toISOString() });
    }
    if (desc.referer) {
      cItem.referers.push(desc.referer);
    }
    if (desc.headers) {
      cItem.headers = desc.headers;
    }
    GLOBAL.config.indexer._saveContentItem(cItem, function(err, res, cItem) {
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

