// content related functions

var cheerio = require('cheerio'), unfluff = require('unfluff'), crypto = require('crypto');

var sites = require('./sites.js'), utils = require('./utils.js'), annotations = require('./annotations.js');

exports.indexContentItem = indexContentItem;

// Save an HTML content item, queueing content and creating annotations as required
// finally processes content
// if it's not an HTML item, do nothing and return.
// desc: { uri: uri, content: pageBuffer, contentType: contentType, headers: saveHeaders}
// update: { member: psMember, referer: referer, isHTML: browser_request.is_html, annotators: [], categories: []}
function indexContentItem(desc, update, callback) {
  // only index text or html
  var contentType = (desc.headers.headers['content-type'] || '').split(';')[0];
  console.log(desc.uri, contentType);
  if (contentType !== 'text/html' && contentType !== 'text/text') {
    GLOBAL.debug('no content');
    if (callback) {
      callback(null, null, null);
    }
    return;
  }
  if (desc.state !== utils.states.content.queued && !desc.content) {
    GLOBAL.debug('not indexable content-type', contentType);
    if (callback) {
      callback(null, null, null);
    }
    return;
  }
  if (!desc.member) { utils.passingError('PASSED MEMBER')};
  update = update || {};
  // determine if it has an HTML title
  if (!desc.title && desc.state !== utils.states.content.queued) {
    var m = /<title.*?>(.*)<\/title>/mi.exec(desc.content);

    if ((m && m[1])) {
      desc.title = m[1].replace(/<.*?>/g);
    }
  }

  if (!desc.title) {
    desc.title =  desc.uri;
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
    if (update.categories) {
      update.categories.forEach(function(category) {
        //FIXME annotation state
        desc.annotations.push(annotations.createAnnotation({hasTarget: desc.uri, type: 'category', category: category, state: desc.state, annotatedBy: update.member}));
      });
    }

// add additional data
    if (update.member) {
      cItem.visitors.push({ member: update.member, '@timestamp': new Date().toISOString() });
    }
    if (update.referer) {
      cItem.referers.push(update.referer);
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
      if (callback) {
        callback(err, res, cItem);
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
  return { selector: 'body', content: desc.content, text: unfluff(desc.content)};
}

