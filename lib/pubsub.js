// # Pubsub
// pub-sub functions for team interaction
/*jslint node: true */

'use strict';

var utils = require('./utils'), annotations = require('./annotations.js'), contentLib = require('./content'), searchLib = require('./search.js'), annoLib = require('./annotations.js');

var faye = require('faye'), fs = require('fs');
var fayeClient;

exports.start = start;
exports.publish = publish;

// Validates client subscriptions against session / system IDs.
function clientSubscribe(loc, cb) {
  fayeClient.subscribe(loc, function(data) {
    var user = GLOBAL.svc.auth.userByClientID(data.clientID), clientID;
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
  var bayeux = new faye.NodeAdapter({mount: GLOBAL.config.FAYEMOUNT, timeout: 45});
  bayeux.attach(server);
  fayeClient = new faye.Client(GLOBAL.config.FAYEHOST);

// user functions
  clientSubscribe('/team/request', function(data, clientID) {
    GLOBAL.info('/team/request'.yellow, data);
    publish('/team/results', GLOBAL.config.users, clientID);
  });

  clientSubscribe('/team/remove', function(data, clientID) {
    GLOBAL.info('team/remove'.yellow, data);
    for (var i = 0; i < GLOBAL.config.users.length; i++) {
      if (GLOBAL.config.users[i].username == data.username) {
        GLOBAL.config.users.splice(i, 1);
        saveUsers();
        publish('/teamList', clientID, GLOBAL.config.users, clientID);
      }
    }
  });

  clientSubscribe('/team/save', function(data, clientID) {
    GLOBAL.info('team/save'.yellow, data);
    for (var i = 0; i < GLOBAL.config.users.length; i++) {
      if (GLOBAL.config.users[i].username == data.username) {
        GLOBAL.config.users[i] = data;
        saveUsers();
        publish('/teamList', GLOBAL.config.users, clientID);
      }
    }
  });

  clientSubscribe('/team/add', function(data, clientID) {
    GLOBAL.info('team/add'.yellow, data);
    if (data.name && data.type) {
      saveUsers(function() {
        GLOBAL.config.users.push({id : new Date().getTime(), active: new Date(), username : data.name, type: data.type});
      });
      publish('/team/results', GLOBAL.config.users, clientID);
    }
  });

// FIXME log signouts
  clientSubscribe('/logout', function(data) {
    console.log('/logout', data);
  });

// annotations

// An item has been created or updated.
//
// Desc contains additional content data.
  clientSubscribe('/item/annotate', function(combo) {
    requestAnnotate(combo.desc);
    updateItem(combo.cItem);
  });

// retrieve annotations for an individual uri
  clientSubscribe('/item/annotations/request', function(data, clientID) {
    GLOBAL.info('/item/annotations/request'.yellow, data.uri);
    // FIXME deal with anchors
    GLOBAL.svc.indexer.retrieveByURI(data.uri.replace(/#.*$/, ''), function(err, res) {
            console.log('hihi', clientID);
      if (err) {
        GLOBAL.error('/annotate error' + err);
      } else {
        publish('/item/annotations/results', { uri: data.uri, annotations: res._source.annotations}, clientID);
      }
    });
  });

  // index incoming annotations, adding validated state
  clientSubscribe('/item/annotations/save', function(combo, clientID, username) {
    GLOBAL.info('/item/annotations/save'.yellow, username.blue, combo.uris, combo.annotations.length);
    var user = GLOBAL.svc.auth.getUserByUsername(username);
    try {
      combo.uris.forEach(function(uri) {
        var annos = [];
    // apply validation state based on user
        combo.annotations.forEach(function(p) {
          p.annotatedBy = username;
          p.state = utils.states.annotations.unvalidated;
          if (!user.needsValidation) {
            p.state = utils.states.annotations.validated;
          }
          p.hasTarget = uri;
          var a = annotations.createAnnotation(p);
          annos.push(a);
        });

        contentLib.saveAnnotations(uri, { member: username }, annos, function(err, res, cItem) {
          if (cItem) {
            publish('/item/annotations/update', { uri: uri, annotationSummary: cItem.annotationSummary, annotations: cItem.annotations}, clientID);
          } else {
            utils.passingError('missing cItem');
          }
        });
      });
    } catch (err) {
      console.log('saveAnnotations failed', err);
      console.trace();
    }
  });

  // index subscriptions
  clientSubscribe('/subscriptions/save', function(combo, clientID, username) {
    GLOBAL.info('/subscriptions/save'.yellow, combo);
    combo.matches.forEach(function(match) {
      var sub = {member: username, match: match.trim(), created: new Date()};
      GLOBAL.svc.indexer.saveSubscription(sub, utils.passingError);
    });
  });

  // index subscriptions
  clientSubscribe('/subscriptions/request', function(combo, clientID, username) {
    GLOBAL.info('/subscriptions/request'.yellow, combo);
    GLOBAL.svc.indexer.retrieveSubscriptions(username, function(err, results) {
      publish('/subscriptions/results', results, clientID);
    }, combo.options);
  });

  // form query
  clientSubscribe('/query/request', function(data, clientID) {
    GLOBAL.info('/query/request'.yellow, clientID);
    var query = GLOBAL.svc.indexer.formQuery;
    if (data.nav === 'cluster') {
      query = GLOBAL.svc.indexer.formCluster;
    }
    query(data, function(err, results) {
      if (err) {
        GLOBAL.error('/query/request failed', JSON.stringify((results || {}).query, null, 2));
        return;
      }
      if (results.hits) {
        results.nav = data.nav;
        // create annotation overview
        if (data.annotations) {
          results.annotationOverview = annoLib.summarizeAnnotations(results);
        }
        GLOBAL.info('/query/results'.yellow, clientID, results.hits.hits.length);
        publish('/query/results', results, clientID);
      } else {
        publish('/query/results', [], clientID);
        GLOBAL.debug('no query results');
      }
    }, data.annotations ? ({ sourceFields : GLOBAL.svc.indexer.sourceFields.concat(['annotations.' + data.annotations])}) : null);
  });

  // update content of existing item by uri
  clientSubscribe('/item/save', function(desc, clientID, username) {
    GLOBAL.info('/item/save'.yellow, desc.uri);
    contentLib.indexContentItem(desc, {member: username, isHTML: true}, utils.passingError);
  });

  // retrieve an existing content item by uri
  clientSubscribe('/item/request', function(uri) {
    GLOBAL.info('/item/request'.yellow, uri);
    GLOBAL.svc.indexer.retrieveByURI(uri, function(err, result) {
      publish('/item/results', result);
    });
  });

// delete a document
  clientSubscribe('/item/delete', function(cItemURIs) {
    GLOBAL.info('/item/delete'.yellow, cItemURIs);
    GLOBAL.svc.indexer.deleteContentItems(cItemURIs.selected, function(err, res) {
      if (err) {
        GLOBAL.error('/item/delete', err, res);
      } else {
        publish('/item/deleted', {_id: res._id});
      }
    });
  });

// query moreLikeThis on document
  clientSubscribe('/item/moreLikeThis', function(data, clientID) {
    GLOBAL.info('/item/moreLikeThis'.yellow, data);
    GLOBAL.svc.indexer.moreLikeThis(data.uri, function(err, results) {
      if (results) {
        GLOBAL.info('moreLikeThisResults', err, results.hits.hits.length);
        publish('/query/results', results, clientID);
      } else {
        publish('/query/results', [], clientID);
        GLOBAL.debug('NO RESULTS');
      }
    });
  });

// find existing searches
  clientSubscribe('/search/request', function(data, clientID, username) {
    GLOBAL.info('/search/request'.yellow, data);
    publishRetrievedSearches(username);
  });

// save a search
  clientSubscribe('/search/save', function(search, clientID, username) {
    search.member = username;
    GLOBAL.info('/search/save'.yellow, search);
    GLOBAL.svc.indexer.saveSearch(search, function(err, res) {
      setTimeout(function() { publishRetrievedSearches(username); } , 1000);
    });
  });

// subscribe to query requests
  clientSubscribe('/search/queue', function(data, clientID, username) {
    data.member = username;
    console.log('/search/queue'.yellow, data);
    searchLib.queueSearcher(data);
  });
}

// Publish data to a general or client specific channel if clientID is present.
function publish(channel, data, clientID) {
  if (clientID) {
    channel += '/' + clientID;
  }
  console.log('CH', channel);
  fayeClient.publish(channel, data);
}

// updates clients with a content item
function updateItem (cItem) {
  fayeClient.publish('/item/update', cItem);
}

// requests annotators to annotate. pass plain text or it will be extracted from cItem
function requestAnnotate(cItem) {
  GLOBAL.info('requestAnnotate', cItem.uri, 'sel', cItem.selector, 'content', cItem.content ? cItem.content.length : 'nocontent');
  fayeClient.publish('/item/annotations/request', cItem);
}

function publishRetrievedSearches(username) {
  GLOBAL.svc.indexer.retrieveSearches({member: username}, function(err, results) {
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
