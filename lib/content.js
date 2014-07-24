// content related functions

var cheerio = require('cheerio'), unfluff = require('unfluff'), crypto = require('crypto');

var sites = require('./sites.js'), utils = require('./utils.js'), annotations = require('./annotations.js');

exports.indexContentItem = indexContentItem;

// Save an HTML content item, queueing content and creating annotations as required
// finally processes content
// if it's not an HTML item, do nothing and return.
// desc: { uri: uri, member: psMember, referer: referer, isHTML: browser_request.is_html, content: pageBuffer, contentType: contentType, headers: saveHeaders}
// options: { annotators: [], categories: []}
function indexContentItem(desc, callback, options) {
  options = options || {};
  // determine if it has an HTML title
  if (desc.state !== utils.states.content.queued) {
    var m = /<title.*?>(.*)<\/title>/mi.exec(desc.content);

    if ((m && m[1])) {
      desc.title = m[1].replace(/<.*?>/g);
    }
  }

  cItem = annotations.createContentItem(desc);

// find any existing instance
  GLOBAL.config.indexer.retrieveByURI(desc.uri, function(err, result) {
// it has been indexed
    if (result && result._source) {
      // transfer historical data
      var hItem = result._source;

      // update current item's history
      cItem.history.concat(hItem.history);
      delete hItem.history;
      cItem.history.push(hItem);
      // merge existing properties

      ['annotations', 'visitors', 'referers'].forEach(function(p) {
        // FIXME remove duplicates
        cItem[p] = cItem[p].concat(hItem[p]);
      });

    }
    cItem.headers = desc.headers;

    // add passed categories
    if (options.categories) {
      options.categories.forEach(function(category) {
        desc.annotations.push(annotations.createAnnotation({hasTarget: desc.uri, type: 'category', category: category, state: desc.state, annotatedBy: options.member}));
      });
    }
    GLOBAL.info('INDEXING'.purple, cItem);

// add additional data
    if (desc.member) {
      cItem.visitors.push({ member: desc.member, '@timestamp': new Date().toISOString() });
    }
    if (desc.referer) {
      cItem.referers.push(desc.referer);
    }

    GLOBAL.config.indexer._saveContentItem(cItem, function(err, res, cItem) {
      if (err) {
        GLOBAL.error('index saveContentitem failed', err);
      } else {
        if (cItem) {
          // designated for scraping

          GLOBAL.config.pubsub.requestAnnotate(cItem);
        }
      }
      callback(err, res, cItem);
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
  return { selector: 'body', content: desc.content, text: unfluff(desc.content)};
}

