// scraper functions

var cheerio = require('cheerio'), url = require('url');

var sites = require('./sites.js'), indexer = require('./indexer.js'), annotations = require('./annotations.js'), utils = require('./utils.js');

// delay for page scrapes in ms
var scrapeDelaySeconds = 10; 
exports.getRecognizedLinks = getRecognizedLinks;
exports.queueLinks = queueLinks;
exports.getQueuedLink = getQueuedLink;

// find recognized links in document and add found as queued
function getRecognizedLinks(cItem) {
  var found = sites.findMatch(cItem.uri);

  if (found) {
    var $ = cheerio.load(cItem.content);
    var links = {};
    ['navLinks', 'resultLinks'].forEach(function(type) {
      if (found[type]) {
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
  }
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
    var typeLinks = links[type], referers = [cItem.uri], validated = true, scraper = GLOBAL.config.project, date = new Date().toISOString();
      // FIXME add referers
      typeLinks.forEach(function(uri) {
        indexer.retrieveByURI(uri, function(err, result) {
          if (!result) {
            var queuedDetails = { tags: tags, relevance: relevance, lastAttempt: date }
            var cItem = annotations.createContentItem({ title: 'Queued ' + tags, uri: uri, referers: [referers], state: 'queued', queued: queuedDetails});
            indexer._saveContentItem(cItem, utils.passingError);
            var anno = annotations.createAnnotation({hasTarget: cItem.uri, type: 'category', category: tags, validated: validated, annotatedBy: scraper});
            indexer.saveAnnotations(cItem.uri, [anno], utils.passingError);
          }
        });
      });
    }
    return links;
  }
}

// get a queued link that hasn't been attempted recently
function getQueuedLink(callback, seconds) {
  var dateField = 'queued.lastAttempt';
  seconds = seconds || scrapeDelaySeconds;
  console.log(seconds);
  var process = function(err, res) {
    var queuedLink = null;
    if (res && res.hits.hits.length) {
      var hit = res.hits.hits[0]._source;
      var queued = hit.queued;
      queuedLink = { uri: hit.uri, queued: queued };
      queued.lastAttempt = new Date().toISOString();
      indexer.updateQueued(hit.uri, queued, function(err, res) {
        if (err) {
          GLOBAL.error(getQueuedLink, err);
        }
        callback(err, queuedLink);
      });
    }
  };

  indexer.formSearch({validationState : 'queued', terms: dateField + ':<now-' + seconds + 's'}, process, 
    { sort: dateField, sourceFields : ['uri', 'queued.*'], size : 1 });
}

