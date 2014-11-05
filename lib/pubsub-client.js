// # pubsub-client
//
// Client functions for pub/sub actions

/*jslint node: true */

'use strict';

var clientID, homepage;
// item query subscription
var querySub, navigatorSub;

var faye = require('faye'), fayeClient;

// send clientID with publish
function publish(loc, data) {
  data = data || {};
  data.clientID = clientID;
  fayeClient.publish(loc, data);
}

exports.init = function(context) {
  clientID = context.clientID;
  homepage = context.homepage;
  console.log('faye init with', homepage, clientID);
  fayeClient = new faye.Client(homepage + 'faye/');
  return this;
};

exports.setClientID = function(clientIDIn) {
  clientID = clientIDIn;
  if (!clientID) {
    throw new Error('missing clientID');
  }
};

// ping.
exports.ping = function(cb) {
  var now = new Date().getTime();
  fayeClient.subscribe('/pong/' + now, cb);
  fayeClient.publish('/ping',  now);
};


// Login.
exports.login = function(username, password, cb) {
  fayeClient.subscribe('/loggedIn/' + username + '/' + password, cb);
  fayeClient.publish('/login', {username: username, password: password});
};

// Logout.
exports.logout = function() {
  publish('/logout', {});
};

// ## Query
function results(cb) {
  if (cb) {
    if (querySub) {
      querySub.cancel();
    }

    querySub = fayeClient.subscribe('/query/results/' + clientID, cb);
  }
}
exports.query = {
// Perform a general query and subscribe to it, cancelling any existing query subscription.
  request: function(cb, options) {
    publish('/query/request', options);
    results(cb);
  },
  navigator: function(cb) {
    if (navigatorSub) {
      navigatorSub.cancel();
    }

    navigatorSub = fayeClient.subscribe('/query/navigator/' + clientID, cb);
  },
  // Perform a moreLikeThis query for text
  moreLikeThisContent : function(title, content, callback) {
    console.log('mltc');
    publish('/query/moreLikeThisContent', { title: title, content: content });
    results(callback);
  }
};

  // ## Item
exports.item = {
  // Save a content item and its annotations.
  save : function(desc) {
    desc.clientID = clientID;
    publish('/item/save', desc);
  },

  // Subscribe to updated item.
  subUpdated : function(cb) {
    fayeClient.subscribe('/item/updated', cb);
  },

  // Delet item(s).
  delete : function(uris) {
    publish('/item/delete', {uris: uris});
  },

  // Subscribe to delete updates.
  subDeleted : function(cb) {
    fayeClient.subscribe('/item/deleted', cb);
  },

  // Perform a moreLikeThis query for a content item.
  moreLikeThis : function(uri) {
    publish('/item/moreLikeThis', { uri: uri});
  },

  // Request a specific item.
  request : function(uri, callback) {
    publish('/item/request', { uri: uri });
  },

  // ## Annotations
  annotations: {
  // Receive annotations for a content item.
    // Save annotations for a content item.
    save : function(uris, annotations) {
      console.log('/item/annotations/save', uris, annotations.length);
      publish('/item/annotations/save', { uris: uris, annotations: annotations });
    },

    request : function(uri, callback) {
      publish('/item/annotations/request', {uri:uri});
      fayeClient.subscribe('/item/annotations/results/' + clientID, callback);
    },

    // Request updated annotation of a content item.
    update : function(uri) {
      publish('/item/annotations/update', { uri: uri });
    },

    // Request updated annotation of a content item.
    subAnnotate : function(cb) {
      fayeClient.subscribe('/item/annotations/annotate', cb);
    },
  },

};

// ## Team
exports.team = {
  // Publish and subscribe to team listings.
  request : function(cb) {
    fayeClient.subscribe('/team/results/' + clientID, cb);
    publish('/team/request', { });
  },
  updated  : function(cb) {
    fayeClient.subscribe('/team/updated/' + clientID, cb);
    publish('/team/updated', { });
  }
};

// ## Search
exports.search = {
  // Publish and subscribe to search listings.
  request : function(cb) {
    publish('/search/request', {});
    fayeClient.subscribe('/search/results', cb);
  },
  // ### Search updates
  //  Subscribe to global search updates.
  subUpdated : function(cb) {
    fayeClient.subscribe('/search/updated', cb);
  },

  // Save a search.
  save : function(searchInput) {
    console.log('/search/save', searchInput);
    publish('/search/save', searchInput);
  },

  // Queue a search.
  queue : function(searchInput) {
    publish('/search/queue', searchInput);
  }
};

// ## Subscriptions
exports.subscriptions = {
  // Save subscriptions for user.
  save : function(matches) {
    console.log('/subscriptions/save', matches);
    publish('/subscriptions/save', { matches: matches });
  },

  // Request subscriptions for user.
  request : function(options, cb) {
    console.log('/subscriptions/request', options);
    publish('/subscriptions/request', options);
    fayeClient.subscribe('/subscriptions/results/' + clientID, cb);
  }
};
