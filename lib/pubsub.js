// pub-sub functions for team interaction
/*jslint node: true */

'use strict';

var indexer = require('../lib/indexer');
var utils = require('../lib/utils');
var faye = require('faye'), fs = require('fs');
var bayeux = new faye.NodeAdapter({mount: GLOBAL.config.FAYEMOUNT, timeout: 45});
var fayeClient = new faye.Client(GLOBAL.config.FAYEHOST);
var annotations = require('./annotations.js'), contentLib = require('./content'), searchLib = require('./search.js');

exports.requestAnnotate = requestAnnotate;
exports.start = start;
exports.publish = publish;

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
          p.state = utils.states.annotations.unvalidated;
          GLOBAL.config.users.forEach(function(u) {
            if (u.username === by) {
              p.annotatedBy = by;
              if (!u.needsValidation) {
                p.state = utils.states.annotations.validated;
              }
            }
          });
          p.hasTarget = uri;
          var a = annotations.createAnnotation(p);
          annos.push(a);
        });

        GLOBAL.config.indexer.saveAnnotations(uri, annos, function(err, res, cItem) {
          if (cItem) {
            fayeClient.publish('/annotations/' + combo.clientID, { uri: uri, annotationSummary: cItem.annotationSummary, annotations: cItem.annotations});
          } else {
            utils.passingError('missing cItem');
          }
        });
      });
    } catch (err) {
      console.log('saveAnnotations failed', err);
    }
  });

  // form query
  fayeClient.subscribe('/query', function(data) {
    GLOBAL.info('/query'.yellow, data.clientID);
    GLOBAL.config.indexer.formQuery(data, function(err, results) {
      if (err) {
        GLOBAL.error('/query query failed', JSON.stringify((results || {}).query, null, 2));
        return;
      }
      if (results.hits) {
        // create annotation overview
        if (data.annotations) {
          var root = { name : 'Annotations', size: 0, children: [], items: [] };
          // build a size of hierarchical annotations
          results.hits.hits.forEach(function(hit) {
            (hit._source.annotations || []).forEach(function(anno) {
              // for each start at the root
              var last = root;
              // iterate through its annotations
              if (!anno.position) {
                GLOBAL.error('missing anno position', anno);
              } else {
                anno.position.forEach(function(p) {
                  var cur;
                  // find its parent
                  last.children.forEach(function(c) {
                    if (c.name === p) {
                      cur = c;
                      return;
                    }
                  });
                  // or create it
                  if (!cur) {
                    last.children.push({name: p, size: 0, children: [], items: []});
                    cur = last.children[last.children.length - 1];
                  }
                  // increment its instances
                  cur.size += 1;
                  // add uri for item selecting
                  if (cur.items.indexOf(hit._source.uri) < 0) {
                    cur.items.push(hit._source.uri);
                  }
                  // use it as the basis for the cur up
                  last = cur;
                });
              }
              // remove raw annotations
              delete hit._source.annotations;
            });
          });
          results.annotationOverview = root;
        }
        GLOBAL.info('queryResults'.yellow, results.hits.hits.length);
        fayeClient.publish('/queryResults/' + data.clientID, results);
      } else {
        fayeClient.publish('/queryResults/' + data.clientID, []);
        GLOBAL.debug('no query results');
      }
    }, data.annotations ? ({ sourceFields : indexer.sourceFields.concat(['annotations.' + data.annotations])}) : null);
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
  fayeClient.subscribe('/updateContent', function(desc) {
    if (!desc.clientID) {
      GLOBAL.error('missing clientID', desc);
      return;
    }
    GLOBAL.info('/updateContent'.yellow, desc.uri);
    contentLib.indexContentItem(desc, {member: desc.clientID.split(':')[0], isHTML: true});
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
        fayeClient.publish('/queryResults/' + data.clientID, results);
      } else {
        fayeClient.publish('/queryResults/' + data.clientID, []);
        GLOBAL.debug('NO RESULTS');
      }
    });
  });

// find existing searches
  fayeClient.subscribe('/search/retrieve', function(data) {
    GLOBAL.info('/search/retrieve'.yellow, data);
    publishRetrievedSearches();
  });

// save a search
  fayeClient.subscribe('/search/save', function(search) {
    GLOBAL.info('/search/save'.yellow, search);
    indexer.saveSearch(search, function(err, res) {
    publishRetrievedSearches();
    });
  });

// remove a search
  fayeClient.subscribe('/search/remove', function(data) {
    GLOBAL.info('/search/remove'.yellow, data);
  });

// subscribe to query requests
  fayeClient.subscribe('/search/queue', function(data) {
    console.log('/search/queue'.yellow, data);
    searchLib.queueSearcher(data);
  });
}

// Publish an arbitary message
function publish(channel, message) {
  fayeClient.publish(channel, message);
}

// updates clients with a content item
exports.updateItem = function(cItem) {
  fayeClient.publish('/updateItem', cItem);
};

// requests annotators to annotate. pass plain text or it will be extracted from cItem
function requestAnnotate(desc) {
  GLOBAL.info('requestAnnotate', desc.uri, 'sel', desc.selector, 'content', desc.content ? desc.content.length : 'nocontent');
  fayeClient.publish('/requestAnnotate', desc);
}

function publishRetrievedSearches(filter) {
  indexer.retrieveSearches(filter, function(err, results) {
    fayeClient.publish('/search/results', results);
  });
}

function saveUsers(istep) {
  fs.writeFileSync('versions/local-users.' + new Date().getTime() + '.json', JSON.stringify({ logins : GLOBAL.config.users}, null, 2));
  if (istep) { istep(); }
  fs.writeFileSync('local-users.json', JSON.stringify({ logins : GLOBAL.config.users}, null, 2));
}
