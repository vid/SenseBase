// pub-sub functions for team interaction
/*jslint node: true */

'use strict';

var indexer = require('./indexer'), utils = require('./utils'), auth = require('./auth');
var annotations = require('./annotations.js'), contentLib = require('./content'), searchLib = require('./search.js');

var faye = require('faye'), fs = require('fs');
var bayeux = new faye.NodeAdapter({mount: GLOBAL.config.FAYEMOUNT, timeout: 45});
var fayeClient = new faye.Client(GLOBAL.config.FAYEHOST);

exports.itemIndexed = itemIndexed;
exports.start = start;
exports.publish = publish;

// An item has been created or updated.
//
// Desc contains additional content data.
function itemIndexed(cItem, desc) {
  requestAnnotate(desc);
  updateItem(cItem);
}

// Validates client subscriptions against session / system IDs.
function clientSubscribe(loc, cb) {
  fayeClient.subscribe(loc, function(data) {
    var user = auth.userByClientID(data.clientID), clientID;
    if (user) {
      clientID = data.clientID;
      delete data.clientID;
      cb(data, clientID, user.username);
    } else {
      console.log('invalid client', data);
    }
  });
}

function start(server) {
  bayeux.attach(server);

// user functions

  clientSubscribe('/team/list', function(data, clientID) {
    GLOBAL.info('team/list'.yellow, data);
    fayeClient.publish('/teamList/' + clientID, GLOBAL.config.users);
  });

  clientSubscribe('/team/remove', function(data, clientID) {
    GLOBAL.info('team/remove'.yellow, data);
    for (var i = 0; i < GLOBAL.config.users.length; i++) {
      if (GLOBAL.config.users[i].username == data.username) {
        GLOBAL.config.users.splice(i, 1);
        saveUsers();
        fayeClient.publish('/teamList/' + clientID, GLOBAL.config.users);
      }
    }
  });

  clientSubscribe('/team/save', function(data, clientID) {
    GLOBAL.info('team/save'.yellow, data);
    for (var i = 0; i < GLOBAL.config.users.length; i++) {
      if (GLOBAL.config.users[i].username == data.username) {
        GLOBAL.config.users[i] = data;
        saveUsers();
        fayeClient.publish('/teamList/' + clientID, GLOBAL.config.users);
      }
    }
  });

  clientSubscribe('/team/add', function(data, clientID) {
    GLOBAL.info('team/add'.yellow, data);
    if (data.name && data.type) {
      saveUsers(function() {
        GLOBAL.config.users.push({id : new Date().getTime(), active: new Date(), username : data.name, type: data.type});
      });
      fayeClient.publish('/teamList/' + clientID, GLOBAL.config.users);
    }
  });

// FIXME log signouts
  clientSubscribe('/logout', function(data) {
    console.log('/logout', data);
  });

// annotations

// retrieve annotations for an individual uri
  clientSubscribe('/annotate', function(data, clientID) {
    GLOBAL.info('/annotate'.yellow, data);
    // FIXME deal with anchors
    indexer.retrieveByURI(data.uri.replace(/#.*$/, ''), function(err, res) {
      if (err) {
        GLOBAL.error('/annotate error' + err);
      } else {
        fayeClient.publish('/annotations/' + clientID, { uri: data.uri, annotations: res._source.annotations});
      }
    });
  });

  // index incoming annotations, adding validated state
  clientSubscribe('/saveAnnotations', function(combo, clientID) {
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
            fayeClient.publish('/annotations/' + clientID, { uri: uri, annotationSummary: cItem.annotationSummary, annotations: cItem.annotations});
          } else {
            utils.passingError('missing cItem');
          }
        });
      });
    } catch (err) {
      console.log('saveAnnotations failed', err);
    }
  });

  // index subscriptions
  clientSubscribe('/subscriptions/save', function(combo, clientID, member) {
    GLOBAL.info('/subscriptions/save'.yellow, combo);
    combo.matches.forEach(function(match) {
      var sub = {member: member, match: match.trim(), created: new Date()};
      GLOBAL.config.indexer.saveSubscription(sub);
    });
  });

  // index subscriptions
  clientSubscribe('/subscriptions/retrieve', function(combo, clientID, member) {
    GLOBAL.info('/subscriptions/retrieve'.yellow, combo);
    indexer.retrieveSubscriptions(member, function(err, results) {
      fayeClient.publish('/subscriptions/results/' + clientID, results);
    }, combo.options);
  });

  // form query
  clientSubscribe('/query', function(data, clientID) {
    GLOBAL.info('/query'.yellow, clientID);
    var query = GLOBAL.config.indexer.formQuery;
    if (data.nav === 'cluster') {
      query = GLOBAL.config.indexer.formCluster;
    }
    query(data, function(err, results) {
      if (err) {
        GLOBAL.error('/query query failed', JSON.stringify((results || {}).query, null, 2));
        return;
      }
      if (results.hits) {
        results.nav = data.nav;
        // create annotation overview
        if (data.annotations) {
          var root = { text : 'Annotations', size: 0, children: [], items: [] };
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
                    if (c.text === p) {
                      cur = c;
                      return;
                    }
                  });
                  // or create it
                  if (!cur) {
                    last.children.push({text: p, size: 0, children: [], items: []});
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
        GLOBAL.info('queryResults'.yellow, clientID, results.hits.hits.length);
        fayeClient.publish('/queryResults/' + clientID, results);
      } else {
        fayeClient.publish('/queryResults/' + clientID, []);
        GLOBAL.debug('no query results');
      }
    }, data.annotations ? ({ sourceFields : indexer.sourceFields.concat(['annotations.' + data.annotations])}) : null);
  });

  // form cluster
  clientSubscribe('/cluster', function(data, clientID) {
    GLOBAL.info('/cluster'.yellow, data);
    GLOBAL.config.indexer.formCluster(data, function(err, results) {
      if (results) {
        GLOBAL.info('  /clusterResults'.yellow, err, results.hits.hits.length);
        fayeClient.publish('/clusterResults/' + clientID, results);
      } else {
        fayeClient.publish('/clusterResults/' + clientID, []);
        GLOBAL.debug('no cluster results');
      }
    });
  });

  // update content of existing item by uri
  clientSubscribe('/updateContent', function(desc, clientID, member) {
    GLOBAL.info('/updateContent'.yellow, desc.uri);
    contentLib.indexContentItem(desc, {member: member, isHTML: true});
  });

  // retrieve an existing content item by uri
  clientSubscribe('/getContentItem', function(uri) {
    GLOBAL.info('/getContentItem'.yellow, uri);
    indexer.retrieveByURI(uri, function(err, result) {
      fayeClient.publish('/updateItem', result);
    });
  });

// delete a document
  clientSubscribe('/delete', function(cItemURIs) {
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
  clientSubscribe('/moreLikeThis', function(data, clientID) {
    GLOBAL.info('/moreLikeThis'.yellow, data);
    GLOBAL.config.indexer.moreLikeThis(data.uri, function(err, results) {
      if (results) {
        GLOBAL.info('moreLikeThisResults', err, results.hits.hits.length);
        fayeClient.publish('/queryResults/' + clientID, results);
      } else {
        fayeClient.publish('/queryResults/' + clientID, []);
        GLOBAL.debug('NO RESULTS');
      }
    });
  });

// find existing searches
  clientSubscribe('/search/retrieve', function(data, clientID, member) {
    GLOBAL.info('/search/retrieve'.yellow, data);
    publishRetrievedSearches(member);
  });

// save a search
  clientSubscribe('/search/save', function(search, clientID, member) {
    search.member = member;
    GLOBAL.info('/search/save'.yellow, search);
    indexer.saveSearch(search, function(err, res) {
      setTimeout(function() { publishRetrievedSearches(member); } , 1000);
    });
  });

// subscribe to query requests
  clientSubscribe('/search/queue', function(data, clientID, member) {
    data.member = member;
    console.log('/search/queue'.yellow, data);
    searchLib.queueSearcher(data);
  });
}

// Publish an arbitary message
function publish(channel, message) {
  fayeClient.publish(channel, message);
}

// updates clients with a content item
function updateItem (cItem) {
  fayeClient.publish('/updateItem', cItem);
}

// requests annotators to annotate. pass plain text or it will be extracted from cItem
function requestAnnotate(cItem) {
  GLOBAL.info('requestAnnotate', cItem.uri, 'sel', cItem.selector, 'content', cItem.content ? cItem.content.length : 'nocontent');
  fayeClient.publish('/requestAnnotate', cItem);
}

function publishRetrievedSearches(member) {
  indexer.retrieveSearches({member: member}, function(err, results) {
    fayeClient.publish('/search/results', results);
    // this is used for general search watchers (cron service)
    fayeClient.publish('/search/updated', {});
  });
}

function saveUsers(istep) {
  fs.writeFileSync('versions/local-users.' + new Date().getTime() + '.json', JSON.stringify({ logins : GLOBAL.config.users}, null, 2));
  if (istep) { istep(); }
  fs.writeFileSync('local-users.json', JSON.stringify({ logins : GLOBAL.config.users}, null, 2));
}
