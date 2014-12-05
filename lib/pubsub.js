// # Pubsub
// pub-sub functions for team interaction
/*jslint node: true */

'use strict';

var utils = require('./utils'), contentLib = require('./content'), searchLib = require('./search.js'),
  annoLib = require('./annotations.js'), formQuery = require('./form-query.js');

var faye = require('faye'), fs = require('fs');
var fayeClient;

exports.start = start;
exports.publish = publish;

// debounce updates to clients
var bouncedUpdates = {}, bounceTimeout, bounceDelay = 1000, bounceHold = 100;

// Validates client subscriptions against session / system IDs.
function clientSubscribe(loc, cb) {
  fayeClient.subscribe(loc, function(data) {
    var user = GLOBAL.svc.auth.userByClientID(data.clientID), clientID;
    if (user) {
      clientID = data.clientID;
      delete data.clientID;
      cb(data, clientID, user.username);
    } else {
      GLOBAL.error(loc, 'invalid client', clientID, 'data', data);
    }
  });
}

function start(server) {
  var bayeux = new faye.NodeAdapter({mount: GLOBAL.config.FAYEMOUNT, timeout: 45});
  bayeux.attach(server);
  fayeClient = new faye.Client(GLOBAL.config.FAYEHOST);
  // Requests usable without a token.
  //
// testing and latency
  fayeClient.subscribe('/ping', function(ts) {
    GLOBAL.info('/ping'.yellow, ts);
    fayeClient.publish('/pong/' + ts, new Date().getTime());
  });

  // Request a login token.
  fayeClient.subscribe('/login', function(data) {
    GLOBAL.info('/login'.yellow, data);
    GLOBAL.svc.auth.findByUsername(data.username, function(err, user) {
      if (user && user.password == data.password) {
        var clientID = data.username + '@pubsub';
        GLOBAL.svc.auth.addAuthenticated(clientID, data.req.user);
        // TODO verify Faye won't broadcast this
        fayeClient.publish('/loggedIn/' + data.username + '/' + data.password, { clientID: clientID });
      } else {
        GLOBAL.error('invalid login', data);
      }
    });
  });

// # Annotations

// An item has been created or updated.
// Desc contains additional content data.
  clientSubscribe('/item/annotations/update', function(combo) {
    GLOBAL.info('/item/annotations/update'.yellow, combo.uri);
    publishUpdate(combo);
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
          GLOBAL.error('missing annotations', err, 'res', res, data);
        }
      }
    });
  });

  // Apply annotations or annotators to URIs
  clientSubscribe('/item/annotations/adjure', function(combo, clientID, username) {
    GLOBAL.info('/item/annotations/adjure'.yellow, username.blue, combo.uris, combo.annotations.length);
    if (combo.annotations && combo.annotations.length) {
      adjureAnnotations(combo.uris, combo.annotations, username);
    }
    if (combo.annotators && combo.annotators.length) {
      adjureAnnotators(combo.uris, combo.annotators);
    }
  });

  // index watches
  clientSubscribe('/watch/save', function(combo, clientID, username) {
    GLOBAL.info('/watch/save'.yellow, combo);
    combo.matches.forEach(function(match) {
      var sub = {member: username, match: match.trim(), created: new Date()};
      GLOBAL.svc.indexer.saveWatch(sub, utils.passingError);
    });
  });

  clientSubscribe('/watch/delete', function(combo, clientID, username) {
    GLOBAL.info('/watch/delete'.yellow, combo);
    GLOBAL.svc.indexer.deleteWatch({ member: username, match: combo.match}, function(err, result) {
      GLOBAL.debug('/watch/delete result', result);
      publishWatches({member: username}, clientID, username);
    }, combo.options);
  });

  // index watch
  clientSubscribe('/watch/request', function(combo, clientID, username) {
    GLOBAL.info('/watch/request'.yellow, combo);
    publishWatches(combo, clientID, username);
  });

  function publishWatches(combo, clientID, username) {
    GLOBAL.svc.indexer.retrieveWatches(username, function(err, results) {
      GLOBAL.info('/watch/results'.bgYellow, results.hits ? results.hits.total : 0);
      publish('/watch/results', results, clientID);
    }, combo.options);
  }

  // form query
  clientSubscribe('/query/request', function(options, clientID) {
    GLOBAL.info('/query/request'.yellow, options);
    var query = GLOBAL.svc.indexer.formQuery;
    if (options.navigator === 'cluster') {
      query = GLOBAL.svc.indexer.formCluster;
    }
    query(options, function(err, results) {
      if (err) {
        GLOBAL.error('/query/request failed', JSON.stringify((results || {}).query, null, 2));
        return;
      }
      if (results.hits) {
        var nav;
        GLOBAL.info('/query/results'.bgYellow, clientID, results.hits.hits.length);
        // send navigation data
        if (options.navigator) {
           nav = { navigator : options.navigator};
          // create annotation overview
          nav.clusters = results.clusters;
          nav.annotationOverview = formQuery.summarizeAnnotations(results, false);
          GLOBAL.info('/query/navigator'.bgYellow, nav.navigator, nav.annotationOverview.children.length, clientID);
        }
        // trim sent data
        results.hits.hits.forEach(function(hit) {
          delete hit._source._id;
          delete hit._source.annotations;
        });
        delete results.clusters;
        publish('/query/results', results, clientID);
        if (nav) {
          publish('/query/navigator', nav, clientID);
        }
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
      GLOBAL.info('/item/results'.bgYellow, result !== null);
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

// query moreLikeThis on URI
  clientSubscribe('/item/moreLikeThis', function(data, clientID) {
    GLOBAL.info('/item/moreLikeThis'.yellow, data);
    GLOBAL.svc.indexer.moreLikeThis(data.uri, function(err, results) {
      GLOBAL.info('/query/results'.bgYellow, (results || []).length);
      if (results) {
        publish('/query/results', results, clientID);
      } else {
        publish('/query/results', [], clientID);
        GLOBAL.debug('NO RESULTS');
      }
    });
  });

// query moreLikeThisContent on content
  clientSubscribe('/query/moreLikeThisContent', function(data, clientID) {
    GLOBAL.info('/query/moreLikeThisContent'.yellow, data);
    try {
      GLOBAL.svc.indexer.moreLikeThisContent(data, function(err, results) {
        GLOBAL.info('/query/results'.bgYellow, (results || []).length);
        if (results && results.hits) {
          GLOBAL.info('moreLikeThisResultsContent', err, results.hits.hits.length);
          publish('/query/results', results, clientID);
        } else {
          publish('/query/results', [], clientID);
          GLOBAL.debug('NO RESULTS');
        }
      });
    } catch (e) {
      GLOBAL.error('mltc failed', e);
    }
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

// queue up a search
  clientSubscribe('/search/queue', function(data, clientID, username) {
    data.member = username;
    GLOBAL.info('/search/queue'.yellow, data);
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
    GLOBAL.info('/logout'.yellow, data);
  });

}

// Annotations functions

  // Request an update for this URI, optionally from a specific member
  function publishUpdate(combo) {
    GLOBAL.svc.indexer.retrieveByURI(combo.uri, function(err, res) {
    if (!err && res && res._source) {
        res = res._source;
        combo.selector = 'body';
        combo.text = res.text;
        combo.content = res.content;
        fayeClient.publish('/item/annotations/annotate' + (combo.member ? '/' + combo.member.replace(/ /g, '_') : ''), combo);
        debounceUpdate(combo);
      } else {
        GLOBAL.error('not annotated', err, combo);
      }
    });
  }

  // batch updates per a size or time frame. note bounceHold may be exceeded due to the delay.
  function debounceUpdate(combo) {
      bouncedUpdates[combo.uri] = combo;
      if (Object.keys(bouncedUpdates).length < bounceHold) {
        clearTimeout(bounceTimeout);
        bounceTimeout = setTimeout(function() {
          var toDebounce = Object.keys(bouncedUpdates).map(function(b) { return bouncedUpdates[b]; });
          bouncedUpdates = {};
          fayeClient.publish('/item/updated', toDebounce);
        }, bounceDelay);
      }
  }

  // Publish annotation requests for specific annotators for the uris
  function adjureAnnotators(uris, annotators) {
    GLOBAL.info('/item/annotations/adjure annotators'.yellow, uris, JSON.stringify(annotators));
    uris.forEach(function(uri) {
      annotators.forEach(function(member) {
        publishUpdate({ uri: uri, member: member});
      });
    });
  }

 // apply annotations for the uris
  function adjureAnnotations(uris, annotations, username) {
    GLOBAL.info('/item/annotations/adjure annotations'.yellow, username.blue, uris, annotations.length);
    try {
      var user = GLOBAL.svc.auth.getUserByUsername(username);
      if (!user) {
        throw new Error("no user " + username);
      }
      uris.forEach(function(uri) {
        var annos = [];
    // TODO apply validation state based on user
        annotations.forEach(function(p) {
          p.roots = p.roots || [username];
          p.annotatedBy = username;
          p.state = utils.states.annotations.unvalidated;
          if (!user.needsValidation) {
            p.state = utils.states.annotations.validated;
          }
          p.hasTarget = uri;
          var a = annoLib.createAnnotation(p);
          annos.push(a);
        });

        contentLib.saveAnnotations(uri, { member: username }, annos, function(err, res, cItem) {
          if (cItem) {
            debounceUpdate(cItem);
          } else {
            utils.passingError('missing cItem');
          }
        });
      });
    } catch (err) {
      GLOBAL.error('saveAnnotations failed', err);
      console.trace();
    }
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
