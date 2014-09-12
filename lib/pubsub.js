// # Pubsub
// pub-sub functions for team interaction
/*jslint node: true */

'use strict';

var utils = require('./utils'), annotations = require('./annotations.js'), contentLib = require('./content'),
  searchLib = require('./search.js'), annoLib = require('./annotations.js'), formQuery = require('./form-query.js');

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

// # Annotations

// An item has been created or updated.
// Desc contains additional content data.
  clientSubscribe('/item/annotations/update', function(combo) {
    GLOBAL.info('/item/annotations/update'.yellow, combo.uri);
    GLOBAL.svc.indexer.retrieveByURI(combo.uri, function(err, res) {
    if (!err && res && res._source) {
        res = res._source;
        combo.selector = 'body';
        combo.text = res.text;
        combo.content = res.content;
        fayeClient.publish('/item/annotations/annotate', combo);
        fayeClient.publish('/item/updated', combo);
      } else {
        console.log('not annotated', err, combo);
      }
    });
  });

// retrieve annotations for an individual uri
  clientSubscribe('/item/annotations/request', function(data, clientID) {
    GLOBAL.info('/item/annotations/request'.yellow, data.uri);
    // FIXME deal with anchors
    GLOBAL.svc.indexer.retrieveByURI(data.uri.replace(/#.*$/, ''), function(err, res) {
      if (err) {
        GLOBAL.error('/annotate error' + err);
      } else {
        if (res && res._source) {
          publish('/item/annotations/results', { uri: data.uri, annotations: res._source.annotations}, clientID);
        } else {
          GLOBAL.error('missing annotations', data.uri);
        }
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
            fayeClient.publish('/item/updated', cItem);
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
  clientSubscribe('/query/request', function(options, clientID) {
    GLOBAL.info('/query/request'.yellow, options);
    var query = GLOBAL.svc.indexer.formQuery;
    if (options.navigation === 'cluster') {
      query = GLOBAL.svc.indexer.formCluster;
    }
    // FIXME
    if (options.annotations) {
      options.sourceFields = GLOBAL.svc.indexer.sourceFields.concat('annotations.*');
    }
    query(options, function(err, results) {
      if (err) {
        GLOBAL.error('/query/request failed', JSON.stringify((results || {}).query, null, 2));
        return;
      }
      if (results.hits) {
        results.navigation = options.navigation;
        // create annotation overview
        if (options.annotations) {
          results.annotationOverview = formQuery.summarizeAnnotations(results);
        }
        GLOBAL.info('/query/results'.yellow, clientID, results.hits.hits.length);
        publish('/query/results', results, clientID);
      } else {
        publish('/query/results', [], clientID);
        GLOBAL.debug('no query results');
      }
    }, options.annotations ? ({ sourceFields : GLOBAL.svc.indexer.sourceFields.concat(['annotations.' + options.annotations])}) : null);
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
  clientSubscribe('/item/delete', function(combo) {
    GLOBAL.info('/item/delete'.yellow, combo);
    GLOBAL.svc.indexer.deleteContentItems(combo.uris, function(err, res) {
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
      utils.indexDelay(function() { publishRetrievedSearches(username); });
    });
  });

// subscribe to query requests
  clientSubscribe('/search/queue', function(data, clientID, username) {
    data.member = username;
    console.log('/search/queue'.yellow, data);
    searchLib.queueSearcher(data);
  });

// Team functions
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

}

// Publish data to a general or client specific channel if clientID is present.
function publish(channel, data, clientID) {
  if (clientID) {
    channel += '/' + clientID;
  }
  fayeClient.publish(channel, data);
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
