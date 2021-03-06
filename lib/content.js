// # Content
//
// Content related functions.
/*jslint node: true */

'use strict';

var cheerio = require('cheerio'), unfluff = require('unfluff'), crypto = require('crypto'), url = require('url'),
  _ = require('lodash'), diff = require('deep-diff').diff;

var pubsub = require('../lib/pubsub-client');

var sites = require('./sites.js'), utils = require('./utils.js'), annotations = require('./annotations.js');
var BASE_FIELDS = ['visitors', 'referers'];

exports.indexContentItem = indexContentItem;
exports.saveAnnotations = saveAnnotations;
exports.getRecognizedLinks = getRecognizedLinks;
exports.diffContentItems = diffContentItems;
exports.replaceThenMergeAnnotations = replaceThenMergeAnnotations;

/**
 * Save an HTML content item, queueing content and creating annotations as required
 *
 * If it's not an HTML item, do nothing and return.
 *
 * After processing, sends updated content notification.
 *
 * @param {object} desc:
 * @param {uri} uri
 * @param {string} content
 * @param {object} headers
 *
 * @param {object} context:
 * @param {string} member
 * @param {uri} refererer
 * @param {array} annotators
 * @param {array} categories
 * @param {boolean} queueOnly - only queue, don't update if item exists
 * @param {string} query - retrieve any existing to update by this query rather than by uri
 * NB only the first query result is processed.
 * @parama {array} preferSource - for a query, prefer any existing source's field values
 * @param {boolean} queueOnly don't index if it already exists (optional)
 * @param {boolean} updating don't notify content change (optional, for annotation)
 * @param {array} deleteExistingAnnotatedBy - delete existing annotations by this user

 * @param callback - err, result, cItem, wasUpdated
 * }
**/

function indexContentItem(desc, context, callback) {
// process result or new item
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
      console.log('failing', validated);
      callback({ error: validated });
      return;
    }
    var user = validated.user;
    desc.state = validated.state;

    // FIXME title assignment, retain manually assigned
    if (user.type === 'User') {
      desc.title = validated.title;
    } else if ((!desc.title || desc.title.match(/^Queued.*/)) && validated.extracted && validated.extracted.title) {
      desc.title = validated.extracted.title;
    }

    // if we're receiving an incomplete item, update it from existing
    try {
      cItem = annotations.createContentItem(desc);
    } catch (e) {
      utils.passingError(e);
      callback(e);
      return;
    }

    cItem.timestamp = new Date();

    // process existing properties
    if (hItem) {
      BASE_FIELDS.forEach(function(p) {
      //console.log(p.blue, 'cItem before', cItem[p].length);
        if (hItem[p]) {
          cItem[p] = cItem[p].concat(hItem[p].slice(0));
        }
        //console.log(p.blue, hItem[p].length, 'cItem after', cItem[p].length);
      });
      cItem.annotations = replaceThenMergeAnnotations(hItem.annotations, cItem.annotations);

      cItem.created = hItem.created;
    } else {
      cItem.created = cItem.timestamp;
    }

    if (context.deleteExistingAnnotatedBy) {
      var i = cItem.annotations.length;
      while (i--) {
        if (cItem.annotations[i].annotatedBy === context.deleteExistingAnnotatedBy) {
          cItem.annotations.splice(i, 1);
        }
      }
    }
    var na = annotationsFromTags(cItem, context);
    cItem.annotations = replaceThenMergeAnnotations(cItem.annotations, na);

    if (!cItem.content || cItem.content.length < 1) {
      delete cItem.sha1;
      delete cItem.text;
    } else {
      cItem.sha1 = crypto.createHash('sha1').update(cItem.content, 'utf8').digest('hex');
      cItem.text = utils.getTextFromHtml(cItem.content);

      // remove empty FIXME - shouldn't be empty nor mis-targets
      cItem.annotations = cItem.annotations.filter(function(a) {
        return a && a.hasTarget === cItem.uri;
      });
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

    var diffs;
    try {
      diffs = diffContentItems(hItem, cItem);
    } catch (e) {
      diffs = [{failed: e}];
    }
    if (diffs.length > 0) {
      GLOBAL.debug('UPDATING', JSON.stringify(diffs, null, 2));
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
                if (pubsub.getClientID() !== clientID) {
                  pubsub.init({ homepage: GLOBAL.config.HOMEPAGE, clientID: clientID });
                }
                pubsub.item.annotations.update(cItem.uri);
              });
            }
          }
          if (hItem && hItem.sha1 !== cItem.sha1) {
            GLOBAL.svc.indexer.saveItemHistory(cItem, utils.passingError);
          }
        }
        callback(err, res, cItem, true);
      });
    } else {
      GLOBAL.info('NOT UPDATED', diffs.length, diffs, 'lhs', hItem.annotations.length, cItem.annotations.length, JSON.stringify(hItem.annotations, null, 2), 'rhs', JSON.stringify(cItem.annotations, null, 2));
      callback(err, null, cItem, false);
    }
  };

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

// replace current annos with new then add remainder
// only users with needsValidation === false can overwrite annos
function replaceThenMergeAnnotations(annos, nannos) {
  var rannos = (annos || []).splice(0);
  var nanno, n, a, anno;
  // Iterate through annos, comparing one nanno at a time. if it's the same and the user doesn't need validation, replace anno with nano.
  for (a = 0; a < rannos.length; a++) {
    anno = rannos[a];
    for (n = nannos.length - 1; n > -1; n--) {
      nanno = nannos[n];
      if (anno.flattened === nanno.flattened) {
        var nuser = GLOBAL.svc.auth.getUserByUsername(nanno.annotatedBy);
        if (!nuser.needsValidation) {
          rannos[a] = nanno;
        }
        nannos.splice(n, 1);
      }
    }
  }
  return rannos.concat(nannos);
}

// Compare two content items, returning any difference
function diffContentItems(lhs, rhs) {
  var d = diff(lhs, rhs, function(key, value) {
    return value === 'visitors' || value === 'headers';
  });
  return d;
}

// Test an incoming desc and return a string with an error if not ok, or ok: true and desc values.
function validateIncomingContentItem(desc, context) {
  var ret = {ok: true};
  if (!context.member) {
    return 'NO MEMBER';
  }
  if (!desc.uri || desc.uri.indexOf('http') !== 0) {
    return 'indexContentItem not http ' + desc.uri;
  }

  ret.state = context.state || desc.state;

  ret.title = context.title || desc.title;

  // extract and process content
  if (!ret.queued && ret.state !== utils.states.content.queued) {
    if (!desc.content) {
      return 'no content for ' + JSON.stringify(desc, null, 2);
    }

// extract recognizable content
    var extracted = extractContent(desc);
    ret.extracted = { title: extracted.title };
    if (!ret.extracted.title && !desc.title) {
      GLOBAL.debug('not indexable content-type', desc.uri);
      return 'not indexable';
    }
  }

  ret.user = GLOBAL.svc.auth.getUserByUsername(context.member);
  if (!ret.user) {
    console.log(context.member, GLOBAL.config.users);
    return 'User not found ' + context.member;
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
      // add a root if it doesnt' have one
      anno.roots = anno.roots || [context.member];
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
