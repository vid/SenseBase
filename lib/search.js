// search functions

var cheerio = require('cheerio'), url = require('url'), url = require('url');

var sites = require('./sites.js'), indexer = require('./indexer.js'), annotations = require('./annotations.js'), utils = require('./utils.js'),
  contentLib = require('./content.js'), searchAPIs = require('./search-apis.js');

// delay for page scrapes in ms
var DELAY_SECONDS = 10, MAX_ATTEMPTS = 4;
exports.getRecognizedLinks = getRecognizedLinks;
exports.queueSearcher = queueSearcher;
exports.queueLinks = queueLinks;
exports.queueLink = queueLink;
exports.getQueuedLink = getQueuedLink;
exports.getLink = getLink;
exports.scrapeLink = scrapeLink;

// find recognized links in document and add found as queued
function getRecognizedLinks(cItem) {
  var founds = sites.findMatch(cItem.uri), $, links = {};
  console.log('founds', founds);

  founds.forEach(function(found) {
    ['navLinks', 'resultLinks'].forEach(function(type) {
      if (found[type]) {
        $ = $ || cheerio.load(cItem.content);
        links[type] = [];
        found[type].forEach(function(s) {
          $(s + ' a').map(function(i, link) {
            var href = $(link).attr('href')
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

// add relevant links from cItem
function queueLinks(cItem) {
  if (!cItem.queued || !cItem.queued.categories) {
    GLOBAL.error('missing queued || queued.categories', cItem.uri, cItem.queued);
    return;
  }
  var relevance = cItem.queued.relevance;
  if (relevance > 0) {
    relevance--;
    var links = getRecognizedLinks(cItem);
    var categories = cItem.queued.categories;
    // FIXME: add callback
    for (var type in links) {
    var typeLinks = links[type], referers = [cItem.uri], state = utils.states.annotations.validated;
      // FIXME add referers
      typeLinks.forEach(function(uri) {
        queueLink(uri, { relevance: relevance, categories: categories, referers: referers, member: cItem.queued.member, state: state});
      });
    }
    return links;
  }
}

// queue an individual link
function queueLink(uri, context) {
  indexer.retrieveByURI(uri, function(err, result) {
    if (!result) {
      var queuedDetails = { member: context.member, categories: context.categories, relevance: context.relevance, attempts: 0, lastAttempt: new Date().toISOString(), team: context.team }
      var cItem = annotations.createContentItem({ title: 'Queued ' + context.categories, uri: uri, referers: [context.referers], state: utils.states.annotations.queued, queued: queuedDetails});
      // save search categories as annotations

      contentLib.indexContentItem(cItem, utils.passingError, context);
    } else {
      console.log('already exists', uri);
    }
  });
}

// get a queued link that hasn't been attempted recently
// callback is usually getLink
function getQueuedLink(callback, seconds) {
  var dateField = 'queued.lastAttempt';
  seconds = seconds || DELAY_SECONDS;
  // function to process the link
  var process = function(err, res) {
    var queuedLink = null;
    if (res && res.hits && res.hits.hits.length) {
      var hit = res.hits.hits[0]._source;
      var queued = hit.queued;
      queuedLink = { uri: hit.uri, queued: queued, total: res.hits.total };
      queued.lastAttempt = new Date().toISOString();
      queued.attempts = queued.attempts + 1;
      indexer.updateQueued(hit.uri, queued, function(err, res) {
        utils.passingError(err);
        callback(err, queuedLink);
      });
    }
  };

 // call query with the function
  indexer.formQuery({validationState : 'queued', terms: dateField + ':<now-' + seconds + 's AND queued.attempts:<' + MAX_ATTEMPTS}, process,
    { sort: dateField, sourceFields : ['uri', 'queued.*'], size : 1 });
}

//  retrieve and process any queued link
function getLink(err, queuedLink) {
  // retrieve https directly
  var method = utils.retrieve;
  if (queuedLink.uri.toString().indexOf('https') === 0) {
    method = utils.retrieveHTTPS;
  }

  method(queuedLink.uri, function(err, data) {
    contentLib.indexContentItem({ uri: queuedLink.uri, content: data, member: queuedLink.queued.member}, function(err, res, cItem) {
      utils.passingError(err);
      if (cItem.previousState === 'queued') {
        GLOBAL.info('queueing links', cItem.uri, 'relevance', cItem.queued.relevance);
        queueLinks(cItem);
      }
      console.log('scraped', err, data ? data.length : 'no content');
    });
  });
}

// retrieve a link through the local proxy, which will also index it
function scrapeLink(uri, callback) {
  var host = url.parse(uri).hostname;
  var options = {
    host: 'localhost',
    port: GLOBAL.config.PROXY_PORT,
    path: uri,
    headers: {
      Host: host
    }
  };
  utils.retrieve(options, function(err, res) {
    if (callback) {
      callback(err, res);
    }
  });
}

// process queued searches by members
// receives form data, validates it
// passes links via queueLink
// for Searchers, queues up found links

function queueSearcher(data) {
  // validate
  if (data.team && data.team.length > 0 && data.input && data.member && data.categories && data.categories.length > 0) {
    var input = encodeURIComponent(data.input);
    // process it by each member
    data.team.forEach(function(m) {
      var member = utils.getMemberByUsername(m), context = { member: member.username, input: input, relevance: data.relevance, team: data.team, categories: data.categories};
      // member not found
      if (!member) {
        GLOBAL.error('queueSearch: member not found', m);
      } else {
        // it's a searcher, add links
        if (member.type === 'Searcher') {
          if (member.api) {
            // use query template or just the term
            context.query = (member.template || '$SBQUERY').replace('$SBQUERY', input);
            context.targetResults = data.targetResults || 10;
            // one callback per uri
            searchAPIs.exec(member.api, context, function(err, uri, resultContext) {
              if (err) {
                utils.passingError(err);
              } else {
                queueLink(uri, resultContext);
              }
            });
          // scrape style location
          } else if (member.locations) {
            member.locations.split('\n').forEach(function(l) {
              l = l.replace('$SBQUERY', input);
              console.log(' /queueSearch', l);
              queueLink(l, context);
            });
          } else {
            GLOBAL.error('unknown searcher type', member);
          }
        // an annotator or individual
        } else {
          console.log(' /queueSearch', l);
          queueLink(data.uri, context);
        }
      }
    });
  } else {
    GLOBAL.error('missing data', data);
  }
}
