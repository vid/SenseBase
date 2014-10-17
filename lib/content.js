// # Content
//
// Content related functions.
/*jslint node: true */

'use strict';

var cheerio = require('cheerio'), unfluff = require('unfluff'), crypto = require('crypto'), url = require('url'), _ = require('lodash');

var pubsub = require('../lib/pubsub-client');

var sites = require('./sites.js'), utils = require('./utils.js'), annotations = require('./annotations.js');

exports.indexContentItem = indexContentItem;
exports.saveAnnotations = saveAnnotations;
exports.getRecognizedLinks = getRecognizedLinks;

/**
 * Save an HTML content item, queueing content and creating annotations as required
 *
 * If it's not an HTML item, do nothing and return.
 *
 * After processing, sends updated content notification.
 *
 * @param desc:
 * @param {uri} uri
 * @param {string} content
 * @param {object} headers
 *
 * @param context:
 * @param {string} member
 * @param {uri} refererer
 * @param {array} annotators
 * @param {array} categories
 * @param {boolean} queueOnly
 * @param {string} query - retrieve any existing to update by this query rather than by uri
 * NB only the first query result is processed.
 * @parama {string} preferSource - for a query, prefer any found source's field values
 *
 * @param {boolean} queueOnly don't index if it already exists (optional)
 * @param {boolean} updating don't notify content change (optional, for annotation)
 * }
**/

function indexContentItem(desc, context, callback) {
// find any existing instance
  var process = function(err, result) {
    var cItem, hItem;
// it has been indexed
    if (result && result._source) {
      if (context.queueOnly) {
        GLOBAL.debug('already indexed', desc.uri);
        callback();
        return;
      }
      // transfer historical data
      hItem = result._source;

      // if we're receiving an incomplete item, update it from existing
      if (!desc.created) {
        desc.created = hItem.created;
        desc.content = desc.content || hItem.content;
        desc.title = context.title || desc.title || hItem.title;
      }
    }

    var validated = validateIncomingContentItem(desc, context);
    if (!validated.ok) {
      console.log('failing indexContentItem', validated);
      callback({ error: validated });
      return;
    }
    var user = validated.user;
    desc.state = validated.state;
    desc.title = validated.title || desc.title;

    cItem = annotations.createContentItem(desc);

    cItem.timestamp = new Date();
    if (hItem) {
      // merge existing properties
      ['annotations', 'visitors', 'referers'].forEach(function(p) {
      //onsole.log(p.blue, 'cItem before', cItem[p].length);
        cItem[p] = cItem[p].concat(hItem[p]);
      //console.log(p.blue, hItem[p].length, 'cItem after', cItem[p].length);
      });
    } else {
      cItem.created = cItem.timestamp;
    }

    cItem.annotations = cItem.annotations.concat(annotationsFromTags(cItem, context));

    if (!cItem.content || cItem.content.length < 1) {
      delete cItem.sha1;
      delete cItem.text;
    } else {
      cItem.sha1 = crypto.createHash('sha1').update(cItem.content, 'utf8').digest('hex');
      cItem.text = utils.getTextFromHtml(cItem.content);
      // deduplicate
      cItem.annotations = _.uniq(cItem.annotations, 'flattened');
      cItem.annotationSummary = {};
      // update annotation summary
      _.forOwn(_.groupBy(cItem.annotations, 'state'), function(vals, key) { cItem.annotationSummary[key] = vals.length; });

      if (cItem.annotationSummary.validated > 0 || cItem.annotationSummary.unvalidated > 0) {
        cItem.state = 'annotated';
      } else {
        cItem.state = 'visited';
      }
    }

    GLOBAL.debug('saving ci'.blue, user.type, user.username, cItem.uri, 'new', (hItem === null), 'visitors'.blue, cItem.visitors.length, 'annos', cItem.annotations.length);
    if (user.type === 'User' && desc.state !== utils.states.content.queued) {
      cItem.visitors.push({ member: context.member, mode: context.mode || 'browser', 'timestamp': new Date().toISOString() });
    }
    if (context.referer) {
      cItem.referers.push(context.referer);
    }

    GLOBAL.svc.indexer.saveContentItem(cItem, function(err, res, cItems) {
      cItem = cItems[0];
      if (err || !cItem) {
        GLOBAL.error('index saveContentitem failed', err);
      } else {
        if (!context.updating && cItem.state !== utils.states.content.queued) {
          var desc = _.clone(cItem);
          desc.text = utils.getTextFromHtml(cItem.content);
          desc.selector = 'body';
          var clientID = GLOBAL.svc.auth.clientIDByUsername(user.username);
          if (!clientID) {
            GLOBAL.error('no clientID', user);
          } else {
            utils.indexDelay(function() {
              pubsub.init({ homepage: GLOBAL.config.HOMEPAGE, clientID: clientID }).item.annotations.update(cItem.uri);
            });
          }
        }
        if (hItem && hItem.sha1 !== cItem.sha1) {
          GLOBAL.svc.indexer.saveItemHistory(cItem, utils.passingError);
        }
      }
      callback(err, res, cItem);
    });
  }

// use query for finding existing to update
  if (context.query) {
    GLOBAL.svc.indexer.formQuery({ query: context.query }, function(err, res) {
      var result;
      if (!err && res && res.hits.total) {
        result = res.hits.hits[0];
        // prefer source fields over desc
        if (context.preferSource) {
          context.preferSource.forEach(function(field) {
            if (result._source[field]) {
              GLOBAL.debug('using result', field, result._source[field]);
              desc[field] = result._source[field];
            }
          });
        }
      }
      process(err, result);
    });
// use URI
  } else {
    GLOBAL.svc.indexer.retrieveByURI(desc.uri, process);
  }
}

// Test an incoming desc and return a string with an error if not ok, or ok: true and desc values.
function validateIncomingContentItem(desc, context) {
  var ret = {ok: true};
  if (!context.member) {
    return 'NO MEMBER';
  }
  if (!desc.uri || desc.uri.indexOf('http') !== 0) {
    return 'indexContentItem not an http id ' + desc.uri;
  }

  ret.state = context.state || desc.state;

  if (!ret.queued && ret.state !== utils.states.content.queued) {
    if (!desc.content) {
      return 'no content for ' + desc.state;
    }

// extract recognizable content
    var extracted = extractContent(desc);
    ret.title = extracted.title || desc.title;
    if (!ret.title) {
      GLOBAL.debug('not indexable content-type', desc.uri);
      return 'not indexable';
    }
  } else {
    ret.title = desc.title;
  }

  ret.user = GLOBAL.svc.auth.getUserByUsername(context.member);
  if (!ret.user) {
    console.log(context.member, GLOBAL.config.users);
    return 'User not found';
  }
  return ret;
}

// add contextual category annotations
//FIXME annotation state
// FIXME rename categories to tags
function annotationsFromTags(cItem, context) {
  var ret = [], anno;
  if (context.categories) {
    context.categories.forEach(function(tag) {
      //  complete anno
      if (tag.type) {
        anno = tag;
      } else {
        anno = {hasTarget: cItem.uri, type: 'category', category: tag};
      }
      anno.hasTarget = cItem.uri;
      anno.state = utils.states.annotations.validated;
      anno.annotatedBy = context.member;
      ret.push(annotations.createAnnotation(anno));

    });
  }
  return ret;
}

// save an individual content item's annotations. accepts an item or array.
// FIXME: use versioning to detect collisions.
function saveAnnotations(target, context, newAnnos, callback) {
  if (!annotations || annotations.length < 1) {
    GLOBAL.error('trying to save 0 annotations');
    callback();
    return;
  }
  GLOBAL.svc.indexer.retrieveByURI(target, function(err, res) {
    if (err) {
     callback(err);
      return;
    }

    if (!res._source) {
      callback({error: 'target doesn\'t exist'});
      return;
    }
    var cItem = res._source;
    var desc = { uri: target, annotations: newAnnos, title: cItem.title, state: cItem.state };
    context.updating = true;
    indexContentItem(desc, context, function(err, res, rItem) {
      if (err) {
        console.log('saveAnnotations err'.red, err);
      }
      callback(err, res, rItem);
    });
  });
}

// find finer content areas if available
// extract content based on site definitions
function extractContent(desc) {
  /*
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
  var uf = unfluff(desc.content);
  return { selector: 'body', content: desc.content, text: uf.text, title: uf.title };
  */
  var title = getTitle(desc.content, '<title') || getTitle(desc.content, '<TITLE');

  return { selector: 'body', content: desc.content, text: 'NOTEXTRACTED', title: title };
}

// Get an HTML title the old-fashioned way.
function getTitle(content, tag) {
  if (!content) {
    return;
  }
  var ts = content.indexOf(tag);
  if (ts < 0) {
    return;
  }
  var te = content.indexOf('>', ts);
  var cs = content.indexOf('<', te + 1);
  var title = content.substring(te + 1, cs);
  return title.trim();
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
