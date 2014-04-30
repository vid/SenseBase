// scraper functions

var cheerio = require('cheerio'), url = require('url'), url = require('url');

var sites = require('./sites.js'), indexer = require('./indexer.js'), annotations = require('./annotations.js'), utils = require('./utils.js');

// delay for page scrapes in ms
var DELAY_SECONDS = 10, MAX_ATTEMPTS = 4; 
exports.getRecognizedLinks = getRecognizedLinks;
exports.queueLinks = queueLinks;
exports.queueLink = queueLink;
exports.getQueuedLink = getQueuedLink;
exports.scrapeLink = scrapeLink;

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
  if (!cItem.queued || !cItem.queued.tags) {
    GLOBAL.error('missing queued || queued.tags', cItem.uri, cItem.queued);
    return;
  }
  var relevance = cItem.queued.relevance;
  if (relevance > 0) {
    relevance--;
    var links = getRecognizedLinks(cItem);
    var tags = cItem.queued.tags;
    // FIXME: add callback
    for (var type in links) {
    var typeLinks = links[type], referers = [cItem.uri], validated = true, scraper = GLOBAL.config.project
      // FIXME add referers
      typeLinks.forEach(function(uri) {
        queueLink(uri, relevance, tags, referers, scraper, validated);
      });
    }
    return links;
  }
}

// queue an individaul link
function queueLink(uri, relevance, tags, referers, scraper, validated) {
  indexer.retrieveByURI(uri, function(err, result) {
    if (!result) {
      var queuedDetails = { tags: tags, relevance: relevance, attempts: 0, lastAttempt: new Date().toISOString() }
      var cItem = annotations.createContentItem({ title: 'Queued ' + tags, uri: uri, referers: [referers], state: 'queued', queued: queuedDetails});
      indexer._saveContentItem(cItem, utils.passingError);
      var annos = [];
      tags.forEach(function(tag) {
        annos.push(annotations.createAnnotation({hasTarget: cItem.uri, type: 'category', category: tag, validated: validated, annotatedBy: scraper}));
      });
      indexer.saveAnnotations(cItem.uri, annos, utils.passingError);
    }
  });
}

// get a queued link that hasn't been attempted recently
function getQueuedLink(callback, seconds) {
  var dateField = 'queued.lastAttempt';
  seconds = seconds || DELAY_SECONDS;
  var process = function(err, res) {
    var queuedLink = null;
    if (res && res.hits && res.hits.hits.length) {
      var hit = res.hits.hits[0]._source;
      var queued = hit.queued;
      queuedLink = { uri: hit.uri, queued: queued, total: res.hits.total };
      queued.lastAttempt = new Date().toISOString();
      queued.attempts = queued.attempts + 1;
      indexer.updateQueued(hit.uri, queued, function(err, res) {
        if (err) {
          GLOBAL.error(getQueuedLink, err);
        }
        callback(err, queuedLink);
      });
    }
  };

  indexer.formSearch({validationState : 'queued', terms: dateField + ':<now-' + seconds + 's AND queued.attempts:<' + MAX_ATTEMPTS}, process, 
    { sort: dateField, sourceFields : ['uri', 'queued.*'], size : 1 });
}

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

