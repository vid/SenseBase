// search functions

var cheerio = require('cheerio'), url = require('url'), url = require('url');

var sites = require('./sites.js'), annotations = require('./annotations.js'), utils = require('./utils.js'),
  contentLib = require('./content.js'), searchAPIs = require('./search-apis.js');

// delay for page scrapes in ms
var DELAY_SECONDS = 10, MAX_ATTEMPTS = 4;

exports.queueSearcher = queueSearcher;
exports.queueLinks = queueLinks;
exports.queueLink = queueLink;
exports.getQueuedLink = getQueuedLink;
exports.getLinkContents = getLinkContents;


// Get a queued link that hasn't been attempted recently.
//
// Callback is usually `getLinkContents`.
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
      GLOBAL.config.indexer.updateQueued(hit.uri, queued, function(err, res) {
        utils.passingError(err);
        callback(err, queuedLink);
      });
    } else {
      callback(err, null);
    }
  };

 // call query with the function
  GLOBAL.config.indexer.formQuery({validationState : 'queued', terms: dateField + ':<now-' + seconds + 's AND queued.attempts:<' + MAX_ATTEMPTS}, process,
    { sort: dateField, sourceFields : ['uri', 'queued.*'], size : 1 });
}

//  retrieve and process any queued link
function getLinkContents(err, queuedLink) {
  // no link found
  if (!queuedLink) {
    return;
  }
  // retrieve https directly
  var method = utils.retrieve;
  if (queuedLink.uri.toString().indexOf('https') === 0) {
    method = utils.retrieveHTTPS;
  }

  method(queuedLink.uri, function(err, data) {
    contentLib.indexContentItem({ uri: ''+queuedLink.uri, content: data}, {isHTML: true, member: queuedLink.queued.member}, function(err, res, cItem) {
      if (err || !cItem) {
        GLOBAL.error('getLinkContents failed', err, res);
        return;
      }
      // if it recently gained content queue links
      if (cItem.state !== utils.states.content.queued && cItem.previousState === utils.states.content.queued) {
        GLOBAL.info('queueing links', cItem.uri, 'relevance', cItem.queued.relevance);
        queueLinks(cItem);
      }
      GLOBAL.debug('scraped', err, data ? data.length : 'no content');
    });
  });
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
  var queuedDetails = { queueOnly: true, member: context.member, categories: context.categories, relevance: context.relevance, attempts: 0, lastAttempt: new Date().toISOString(), team: context.team }
  contentLib.indexContentItem({ title: 'Queued ' + context.categories, uri: uri, state: utils.states.content.queued, queued: queuedDetails}, context, function(err, res, cItem) {
  });
}

// Process queued searches by members.
//
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
              GLOBAL.info(' /queueSearch', l);
              queueLink(l, context);
            });
          } else {
            GLOBAL.error('unknown searcher type', member);
          }
        // an annotator or individual
        } else {
          GLOBAL.info(' /queueSearch', l);
          queueLink(data.uri, context);
        }
      }
    });
  } else {
    GLOBAL.error('missing data', data);
  }
}
