// pub-sub functions for team interaction

var indexer = require('../lib/indexer');
var utils = require('../lib/utils');
var faye = require('faye');
var bayeux = new faye.NodeAdapter({mount: '/montr', timeout: 45});
var fayeClient = new faye.Client(GLOBAL.config.FAYEHOST);
var annotations = require('./annotations.js'), contentExtractor = require('./contentExtractor'), scrapeDelay = 20000;

exports.requestAnnotate = requestAnnotate;
exports.start = start;

function start(server) {
  bayeux.attach(server);

// user functions

  fayeClient.subscribe('/team/list', function(data) {
    GLOBAL.info('team/list'.yellow, data);
    fayeClient.publish('/teamList', GLOBAL.config.users);
  });

  fayeClient.subscribe('/team/remove', function(member) {
    GLOBAL.info('team/remove'.yellow, member);
    for (var i = 0; i < GLOBAL.config.users.length; i++) {
      if (GLOBAL.config.users[i].username == member.username) {
        GLOBAL.config.users.splice(i, 1);
        saveUsers();
        fayeClient.publish('/teamList', GLOBAL.config.users);
      }
    }
  });

  fayeClient.subscribe('/team/save', function(member) {
    GLOBAL.info('team/save'.yellow, member);
    for (var i = 0; i < GLOBAL.config.users.length; i++) {
      if (GLOBAL.config.users[i].username == member.username) {
        GLOBAL.config.users[i] = member;
        saveUsers();
        fayeClient.publish('/teamList', GLOBAL.config.users);
      }
    }
  });

  fayeClient.subscribe('/team/add', function(candidate) {
    GLOBAL.info('team/add'.yellow, candidate);
    if (candidate.name && candidate.type) {
      saveUsers(function() {
        GLOBAL.config.users.push({id : new Date().getTime(), active: new Date(), username : candidate.name, type: candidate.type});
      });
      fayeClient.publish('/teamList', GLOBAL.config.users);
    }
  });


// annotations

// annotations for an individual uri
  fayeClient.subscribe('/annotate', function(data) {
    GLOBAL.info('/annotate'.yellow, data);
    // FIXME deal with anchors
    indexer.retrieveAnnotations(data.uri.replace(/#.*$/, ''), function(err, results) {
      if (err) {
        GLOBAL.error('/annotate error' + err);
      } else {
        fayeClient.publish('/annotations', { uri: data.uri, annotations: results.hits.hits.map(function(h) { return h._source;})});
      }
    });
  });

  // index incoming annotations, adding validated state
  fayeClient.subscribe('/saveAnnotations', function(combo) {
    GLOBAL.info('saveAnnotations'.yellow, combo.uri, combo.annotations.length);
// apply validation state based on user
    combo.annotations.forEach(function(a) {
      a.validated = false;
      GLOBAL.config.users.forEach(function(u) {
        if (u.username === a.annotatedBy) {
          a.validated = !u.needsValidation;
        }
      }); 
    });
    GLOBAL.config.indexer.saveAnnotations(combo.uri, combo.annotations);
    fayeClient.publish('/annotations', { uri: combo.uri, annotations: combo.annotations});
  });

  // form search
  fayeClient.subscribe('/search', function(data) {
    GLOBAL.info('/search'.yellow, data);
    GLOBAL.config.indexer.formSearch(data, function(err, results) {
      if (err) {
        GLOBAL.error('/search query failed', JSON.stringify(results.query, null, 2));
      }
      if (results.hits) {
        GLOBAL.info('searchResults'.yellow, results.hits.hits.length);
        fayeClient.publish('/searchResults', results);
      } else {
        fayeClient.publish('/searchResults', []);
        GLOBAL.debug('no search results');
      }
    });
  });

  // form cluster
  fayeClient.subscribe('/cluster', function(data) {
    GLOBAL.info('/cluster'.yellow, data);
    GLOBAL.config.indexer.formCluster(data, function(err, results) {
      if (results) {
        GLOBAL.info('clusterResults'.yellow, err, results.hits.hits.length);
        fayeClient.publish('/clusterResults', results);
      } else {
        fayeClient.publish('/clusterResults', []);
        GLOBAL.debug('no cluster results');
      }
    });
  });

  // update content of existing item by uri
  fayeClient.subscribe('/updateContent', function(data) {
    GLOBAL.info('/updateContent'.yellow, data.uri);
    updateContent(data);
  });

  // retrieve an existing content item by uri
  fayeClient.subscribe('/getContentItem', function(uri) {
    GLOBAL.info('/getContentItem'.yellow, uri);
    indexer.retrieveByURI(uri, function(err, result) {
      fayeClient.publish('/updateItem', result);
    });
  });

  fayeClient.subscribe('/delete', function(cItemURIs) {
    GLOBAL.info('/delete'.yellow, cItemURIs);
    indexer.deleteContentItems(cItemURIs.selected, function(err, res) {
      if (err) {
        GLOBAL.error('/delete', err, res);
      } else {
        fayeClient.publish('/deletedItem', {_id: res._id});
      }
    });
  });

  fayeClient.subscribe('/moreLikeThis', function(data) {
    GLOBAL.info('/moreLikeThis'.yellow, data);
    GLOBAL.config.indexer.moreLikeThis(data.uri, function(err, results) {
      if (results) {
        GLOBAL.info('moreLikeThisResults', err, results.hits.hits.length);
        fayeClient.publish('/searchResults', results);
      } else {
        fayeClient.publish('/searchResults', []);
        GLOBAL.debug('NO RESULTS');
      }
    });
  });

  // updates clients with a content item
  exports.updateItem = function(cItem) {
    fayeClient.publish('/updateItem', cItem);
  };

  // used to cache relevance and last visited
  var visitingLinks = {};
// process incoming scrapes and send queued links
  fayeClient.subscribe('/visited', function(site) {
    if (site.content) {
      updateContent(site);
    }
    var scraped = site.uri, links = site.links || [], tags = site.tags || 'scraper-no-tag', scraper = site.scraper, validated = true, relevance = site.relevance || 0;

// a link was scraped, annotate it
    if (scraped) {
      if (visitingLinks[scraped]) {
        visiting = visitingLinks[scraped];
        console.log('scraped', visiting);
        relevance = visiting.relevance - 1;
        delete visitingLinks[scraped];
      }
    }
    // if relevant enough, add them as queued
    if (links && relevance > 0) {
      links.forEach(function(uri) {
        if (uri.indexOf('http:') === 0) {
          uri = uri.replace(/#.*/, '');
          indexer.retrieveByURI(uri, function(err, result) {
            // FIXME should save referers
            if (!result) {
              var queuedDetails = { tags: tags, relevance: relevance, lastAttempt: new Date().getTime() - scrapeDelay}
              var cItem = annotations.createContentItem({ title: 'Queued ' + tags, uri: uri, referers: [scraped], state: 'queued', queued: queuedDetails});
              indexer._saveContentItem(cItem, utils.passingError);
              var anno = annotations.createAnnotation({hasTarget: cItem.uri, type: 'category', category: tags, validated: validated, annotatedBy: scraper});
              indexer.saveAnnotations(cItem.uri, [anno], utils.passingError);
              visitingLinks[uri] = queuedDetails;
            }
          });
        }
      });
    }

// send out a new link if available
    indexer.formSearch({validationState : 'queued'}, function(err, res) {
      utils.passingError(err);
// print info when we have number of hits
      GLOBAL.info('/visited'.yellow.yellow, { site: site, relevance: relevance, queued: res.hits.total});
      if (res.hits && res.hits.total > 0) {
        // FIXME add timing for multiple clients
        for (var i in res.hits.hits) {
          var next = res.hits.hits[i]._source;
          var isTime = true;
          // wait between each URI attempt
          if (visitingLinks[next.uri]) {
            isTime = visitingLinks[next.uri].lastAttempt <= (new Date().getTime + scrapeDelay);
          }
          if (isTime) {
            fayeClient.publish('/visit', { site: { uri: next.uri }});
            next.scrapeDelay = new Date().getTime();
            visitingLinks[next.uri] = next;
            console.log('time', next);
            break;
          }
        }
      } else {
        console.log('nothing is queued');
      }
    });
  });
}

// requests annotators to annotate. pass plain text or it will be extracted from cItem

function requestAnnotate(uri, html) {
  contentExtractor.extractContent(uri, html, function(uri, html, selector, content) {
    GLOBAL.info('selector', selector, content ? content.length : 'nocontent');
    fayeClient.publish('/requestAnnotate', { uri: uri, source: html, html: content, selector: selector, text: utils.getTextFromHtml(content)});
  });
}

function saveUsers(istep) {
  fs.writeFileSync('versions/local-users.' + new Date().getTime() + '.json', JSON.stringify({ logins : GLOBAL.config.users}, null, 2));
  if (istep) { istep(); }
  fs.writeFileSync('local-users.json', JSON.stringify({ logins : GLOBAL.config.users}, null, 2));
}

function updateContent(data) {
  indexer.resetAnnotations({ target: data.uri }, function(err, res) {
    indexer.updateContent(data.uri, data.content, function(err, result) {
      if (err) {
        GLOBAL.error('error', err);
      } else {
        requestAnnotate(data.uri, data.content);
      }
    });
  });
}

