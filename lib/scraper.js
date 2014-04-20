// scraper functions

var cheerio = require('cheerio'), url = require('url');

var sites = require('./sites.js');

exports.getRecognizedLinks = getRecognizedLinks;
exports.queueLinks = queueLinks;
exports.getQueuedLink = getQueuedLink;

// find  recognized links in document and add found as queued
function getRecognizedLinks(cItem) {
  var $ = cheerio.load(cItem.content);
  var found = sites.findMatch(cItem.uri);
  var links = {};

  if (found) {
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
  var relevance = cItem.queued.relevance;
  if (relevance-- > -1) {
    var links = getRecognizedLinks(cItem);
    var tags = cItem.queued.tags;
    for (var type in links) {
      var typeLinks = links[type];
      typeLinks.forEach(function(link) {
        indexer.retrieveByURI(uri, function(err, result) {
          // FIXME should save referers
          if (!result) {
            var queuedDetails = { tags: tags, relevance: relevance, lastAttempt: new Date().getTime() - (scrapeDelay + 1)}
            var cItem = annotations.createContentItem({ title: 'Queued ' + tags, uri: uri, referers: [scraped], state: 'queued', queued: queuedDetails});
            indexer._saveContentItem(cItem, utils.passingError);
            var anno = annotations.createAnnotation({hasTarget: cItem.uri, type: 'category', category: tags, validated: validated, annotatedBy: scraper});
            indexer.saveAnnotations(cItem.uri, [anno], utils.passingError);
            visitingLinks[uri] = queuedDetails;
          }
        });
      });
    }
  }
}

// get a queued link that hasn't been attempted recently
function getQueuedLink() {
  indexer.formSearch({validationState : 'queued'}, function(err, res) {
    var published = false, queued = 0;
    utils.passingError(err);
// print info when we have number of hits
    GLOBAL.info('/visited'.yellow.yellow, { site: site, relevance: relevance, queued: res.hits.total});
    if (res.hits && res.hits.total > 0) {
      queued = res.hits.total;
      // FIXME add timing for multiple clients
      for (var i in res.hits.hits) {
        var next = res.hits.hits[i]._source;
        var isTime = true;
        // wait between each URI attempt
        if (visitingLinks[next.uri]) {
          isTime = visitingLinks[next.uri].lastAttempt <= (new Date().getTime() + scrapeDelay);
          // app was restarted
        } else {
          next.lastAttempt = new Date().getTime() - scrapeDelay;
          visitingLinks[next.uri] = next;
        }
        // send it out and update its lastAttempt
        if (isTime) {
          fayeClient.publish('/visit', { queued: queued, site: { uri: next.uri }});
          published = true;
          next.lastAttempt = new Date().getTime();
          visitingLinks[next.uri] = next;
          break;
        } 
      }
    } else {
      GLOBAL.debug('nothing is queued');
    }
    if (!published) {
      fayeClient.publish('/visit', { queued: queued, visitingLinks : visitingLinks  });
    }
  });
}

