// ### Content
//
// Content related functions.
/*jslint node: true */

'use strict';

var cheerio = require('cheerio'), unfluff = require('unfluff'), crypto = require('crypto'), url = require('url'), _ = require('lodash');

var sites = require('./sites.js'), utils = require('./utils.js'), annotations = require('./annotations.js');

exports.indexContentItem = indexContentItem;
exports.getRecognizedLinks = getRecognizedLinks;

// Save an HTML content item, queueing content and creating annotations as required
//
// If it's not an HTML item, do nothing and return.
//
// After processing, sends updated content notification.
//
// `desc: { uri: uri, content: pageBuffer, contentType: contentType, headers: saveHeaders}`
//
// `context: { member: psMember, referer: referer, isHTML: browser_request.is_html, annotators: [], categories: [], queueOnly: boolean }`
//
// `queueOnly`: don't index if it already exists
function indexContentItem(desc, context, callback) {
  context = context || {};
  desc.state = context.state || desc.state;
  if (!context.member) {
    callback({error: utils.passingError('NO MEMBER')});
    return;
  }
  if (desc.state !== utils.states.content.queued) {
    // make sure there's content
    if (!desc.content) {
      callback({error: 'no content for ' + desc.state}, null, null);
      return;
    }

    // only index text or html
    var contentType = ((desc.headers ? desc.headers.headers['content-type'] : '') || '').split(';')[0];
    if (!context.isHTML && contentType !== 'text/html' && contentType !== 'text/text') {
      GLOBAL.debug('not indexable content-type', desc.uri, contentType);
      if (callback) {
        callback(null, null, null);
      }
      return;
    }

    // determine if it has an HTML title
    if (!desc.title && desc.state !== utils.states.content.queued) {
      var m = /<title.*?>(.*)<\/title>/mi.exec(desc.content);

      if ((m && m[1])) {
        desc.title = m[1].replace(/<.*?>/g);
      }
    }
  }

  desc.title = desc.title || '(no title)';

  var cItem = annotations.createContentItem(desc);
  // historical item
  var hItem;
// find any existing instance
  GLOBAL.config.indexer.retrieveByURI(desc.uri, function(err, result) {
// it has been indexed
    if (context.queueOnly) {
      GLOBAL.debug('already indexed', desc.uri);
      callback(null, null, null);
      return;
    }
    if (result && result._source) {
      // transfer historical data
      hItem = result._source;

      // merge existing properties
      ['annotations', 'visitors', 'referers'].forEach(function(p) {
        // FIXME remove duplicates
        cItem[p] = cItem[p].concat(hItem[p]);
      });
    } else {
      cItem.created = new Date();
    }

    // add passed categories
    if (context.categories) {
      context.categories.forEach(function(category) {
        //FIXME annotation state
        cItem.annotations.push(annotations.createAnnotation({hasTarget: desc.uri, type: 'category', category: category, state: desc.state, annotatedBy: context.member}));
      });
    }

    // update annotations
    if (cItem.uri.indexOf('http') !== 0) {
      throw new Error('indexContentItem not an http id ' + cItem.uri);
    }

    // determine and assign state
    cItem.previousState = cItem.state;
    if (!cItem.content || cItem.content.length < 1) {
      cItem.state = 'queued';
      delete cItem.sha1;
      delete cItem.text;
    } else {
      cItem.sha1 = crypto.createHash('sha1').update(cItem.content, 'utf8').digest('hex');
      cItem.text = utils.getTextFromHtml(cItem.content);
      if (cItem.annotationSummary) {
        cItem.state = 'annotated';
      } else {
        cItem.state = 'visited';
     }
    }
    // update annotation summary
    var annotationSummary = { validated: 0, unvalidated: 0, erased: 0 };
    (cItem.annotations || []).forEach(function(a) {
      if (a.state === utils.states.annotations.erased) {
        annotationSummary.erased = annotationSummary.erased + 1;
      } else if (a.state === utils.states.annotations.validated) {
        annotationSummary.validated = annotationSummary.validated + 1;
      } else {
        annotationSummary.unvalidated = annotationSummary.unvalidated + 1;
      }
    });

    cItem.annotationSummary = annotationSummary;

// add additional data
    if (desc.state !== utils.states.content.queued) {
      cItem.visitors.push({ member: context.member, 'timestamp': new Date().toISOString() });
    }
    if (context.referer) {
      cItem.referers.push(context.referer);
    }

    GLOBAL.config.indexer.saveContentItem(cItem, function(err, res, cItem) {
      if (err || !cItem) {
        GLOBAL.error('index saveContentitem failed', err);
      } else {
        if (cItem.state !== utils.states.content.queued) {
          var desc = _.clone(cItem);
          desc.text = utils.getTextFromHtml(cItem.content);
          desc.selector = 'body';
          GLOBAL.config.pubsub.itemIndexed(cItem, desc);
        }
        if (hItem && hItem.sha1 !== cItem.sha1) {
          GLOBAL.config.indexer.saveItemHistory(cItem, function(err, res) {
            utils.passingError(err);
          });
        }
      }
      callback(err, res, cItem);
    });
  });
}


// save an individual content item's annotations. accepts an item or array.
// FIXME: use versioning to detect collisions. if an exact annotation exists, save will fail
function saveAnnotations(target, newAnnos, callback) {
  if (!annotations || annotations.length < 1) {
    GLOBAL.error('trying to save 0 annotations');
    if (callback) { callback(); }
    return;
  }
  GLOBAL.config.indexer.retrieveByURI(target, function(err, res) {
    if (err) {
      if (callback) {
        callback(err);
      } else {
        throw(err);
      }
      return;
    }

    var cItem = res._source;
    // retrieve existing CI's annotations
    var curAnnos = cItem.annotations || [];
    //FIXME better duplicate detection
    curAnnos.forEach(function(ca) {
      if (newAnnos.indexOf(ca)) {
        delete curAnnos[ca];
      }
    });

    newAnnos = curAnnos.concat(newAnnos);
    cItem.annotations = newAnnos;
    indexContentItem(cItem, callback);
  });

}

// find finer content areas if available
// extract content based on site definitions
function extractContent(desc) {
  // search all possible matches, returning first find
  var founds = sites.findMatch(desc.uri);

  if (founds.length) {
      var $ = cheerio.load(desc.content);
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

// find recognized links in document and add found as queued
function getRecognizedLinks(cItem) {
  var founds = sites.findMatch(cItem.uri), $, links = {};

  founds.forEach(function(found) {
    ['navLinks', 'resultLinks'].forEach(function(type) {
      if (found[type]) {
        $ = $ || cheerio.load(cItem.content);
        links[type] = [];
        found[type].forEach(function(s) {
          $(s + ' a').map(function(i, link) {
            var href = $(link).attr('href');
            if (href) {
              // absolute-ize relative URLs
              if (href.indexOf('http://') !== 0) {
                href = url.resolve(cItem.uri, href);
              }
              links[type].push(href);
            }
          });
        });
      }
    });
  });
  return links;
}
