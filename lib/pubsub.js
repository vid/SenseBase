// pub-sub functions for team interaction

var indexer = require('../lib/indexer');
var utils = require('../lib/utils');
var faye = require('faye');
var bayeux = new faye.NodeAdapter({mount: GLOBAL.config.FAYEMOUNT, timeout: 45});
var fayeClient = new faye.Client(GLOBAL.config.FAYEHOST);
var annotations = require('./annotations.js'), contentExtractor = require('./contentExtractor'), scraperLib = require('./scraper.js');

exports.requestAnnotate = requestAnnotate;
exports.start = start;

function start(server) {
  bayeux.attach(server);

// user functions

  fayeClient.subscribe('/team/list', function(data) {
    GLOBAL.info('team/list'.yellow, data);
    fayeClient.publish('/teamList/' + data.clientID, GLOBAL.config.users);
  });

  fayeClient.subscribe('/team/remove', function(data) {
    GLOBAL.info('team/remove'.yellow, data);
    for (var i = 0; i < GLOBAL.config.users.length; i++) {
      if (GLOBAL.config.users[i].username == data.username) {
        GLOBAL.config.users.splice(i, 1);
        saveUsers();
        fayeClient.publish('/teamList/' + data.clientID, GLOBAL.config.users);
      }
    }
  });

  fayeClient.subscribe('/team/save', function(data) {
    GLOBAL.info('team/save'.yellow, data);
    for (var i = 0; i < GLOBAL.config.users.length; i++) {
      if (GLOBAL.config.users[i].username == data.username) {
        GLOBAL.config.users[i] = data;
        saveUsers();
        fayeClient.publish('/teamList/' + data.clientID, GLOBAL.config.users);
      }
    }
  });

  fayeClient.subscribe('/team/add', function(data) {
    GLOBAL.info('team/add'.yellow, data);
    if (data.name && data.type) {
      saveUsers(function() {
        GLOBAL.config.users.push({id : new Date().getTime(), active: new Date(), username : data.name, type: data.type});
      });
      fayeClient.publish('/teamList/' + data.clientID, GLOBAL.config.users);
    }
  });

// FIXME log signouts
  fayeClient.subscribe('/logout', function(data) {
    console.log('/logout', data);
  });

// annotations

// retrieve annotations for an individual uri
  fayeClient.subscribe('/annotate', function(data) {
    GLOBAL.info('/annotate'.yellow, data);
    // FIXME deal with anchors
    indexer.retrieveByURI(data.uri.replace(/#.*$/, ''), function(err, res) {
      if (err) {
        GLOBAL.error('/annotate error' + err);
      } else {
        fayeClient.publish('/annotations/' + data.clientID, { uri: data.uri, annotations: res._source.annotations});
      }
    });
  });

  // index incoming annotations, adding validated state
  fayeClient.subscribe('/saveAnnotations', function(combo) {
    GLOBAL.info('saveAnnotations'.yellow, combo);
    var uris = combo.uris || [combo.uri];
    try {
      uris.forEach(function(uri) {
        var annos = [];
    // apply validation state based on user
        combo.annotations.forEach(function(p) {
          var by = p.annotatedBy || combo.annotatedBy;
          p.state = utils.states.unvalidated;
          GLOBAL.config.users.forEach(function(u) {
            if (u.username === by) {
              p.annotatedBy = by;
              if (!u.needsValidation) {
                p.state = utils.states.validated;
              }
            }
          }); 
          p.hasTarget = uri;
          var a = annotations.createAnnotation(p);
          annos.push(a);
        });
        
        GLOBAL.config.indexer.saveAnnotations(uri, annos, function(err, res, cItem) {
          fayeClient.publish('/annotations/' + combo.clientID, { uri: uri, annotationSummary: cItem.annotationSummary, annotations: cItem.annotations});
        });
      });
    } catch (err) {
      console.log('saveAnnotations failed', err);
    }
  });

  // form search
  fayeClient.subscribe('/search', function(data) {
    GLOBAL.info('/search'.yellow, data.clientID);
    GLOBAL.config.indexer.formSearch(data, function(err, results) {
      if (err) {
        GLOBAL.error('/search query failed', JSON.stringify(results.query, null, 2));
      }
      if (results.hits) {
        GLOBAL.info('searchResults'.yellow, results.hits.hits.length);
        fayeClient.publish('/searchResults/' + data.clientID, results);
      } else {
        fayeClient.publish('/searchResults/' + data.clientID, []);
        GLOBAL.debug('no search results');
      }
    });
  });

  // form cluster
  fayeClient.subscribe('/cluster', function(data) {
    GLOBAL.info('/cluster'.yellow, data);
    GLOBAL.config.indexer.formCluster(data, function(err, results) {
      if (results) {
        GLOBAL.info('  /clusterResults'.yellow, err, results.hits.hits.length);
        fayeClient.publish('/clusterResults/' + data.clientID, results);
      } else {
        fayeClient.publish('/clusterResults/' + data.clientID, []);
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

// delete a document
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

// query moreLikeThis on document
  fayeClient.subscribe('/moreLikeThis', function(data) {
    GLOBAL.info('/moreLikeThis'.yellow, data);
    GLOBAL.config.indexer.moreLikeThis(data.uri, function(err, results) {
      if (results) {
        GLOBAL.info('moreLikeThisResults', err, results.hits.hits.length);
        fayeClient.publish('/searchResults/' + data.clientID, results);
      } else {
        fayeClient.publish('/searchResults/' + data.clientID, []);
        GLOBAL.debug('NO RESULTS');
      }
    });
  });

// find existing scrapes
  fayeClient.subscribe('/savedScrapes', function(data) {
    GLOBAL.info('/savedScrapes'.yellow, data);
  });

// subscribe to search requests
  fayeClient.subscribe('/queueSearch', function(data) {
    console.log('/queueSearch'.yellow, data);
    scraperLib.queueSearcher(data);
  });
}

// updates clients with a content item
exports.updateItem = function(cItem) {
  fayeClient.publish('/updateItem', cItem);
};

// requests annotators to annotate. pass plain text or it will be extracted from cItem
function requestAnnotate(uri, html) {
  contentExtractor.extractContent(uri, html, function(uri, html, selector, content) {
    GLOBAL.info('selector', uri, selector, content ? content.length : 'nocontent');
    fayeClient.publish('/requestAnnotate', { uri: uri, source: html, html: content, selector: selector, text: utils.getTextFromHtml(content)});
  });
}

function saveUsers(istep) {
  fs.writeFileSync('versions/local-users.' + new Date().getTime() + '.json', JSON.stringify({ logins : GLOBAL.config.users}, null, 2));
  if (istep) { istep(); }
  fs.writeFileSync('local-users.json', JSON.stringify({ logins : GLOBAL.config.users}, null, 2));
}

function updateContent(desc) {
  indexer.resetAnnotations({ target: desc.uri }, function(err, res) {
    indexer.updateContent(desc, function(err, result) {
      if (err) {
        GLOBAL.error('error', err);
      } else {
        requestAnnotate(desc.uri, desc.content);
      }
    });
  });
}

