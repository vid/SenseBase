// # pubsub-client
//
// Client functions for pub/sub actions

/*jslint node: true */

'use strict';

var clientID, homepage;
// item query subscription
var querySub;

var faye = require('faye'), fayeClient;

// send clientID with publish
function publish(loc, data) {
  data = data || {};
  data.clientID = clientID;
  fayeClient.publish(loc, data);
}

exports.init = function(context) {
  clientID = context.clientID;
  if (!clientID) {
    throw new Error('missing clientID');
  }
  homepage = context.homepage;
  console.log('faye init with', homepage, clientID);
  fayeClient = new faye.Client(homepage + 'faye/');
  return this;
};

// annotate a page
exports.annotate = function(uri) {
  publish('/annotate', { uri: uri });
};

// save annotations for content item
exports.saveAnnotations = function(uris, annotations) {
  console.log('/saveAnnotations', uris, annotations);
  publish('/saveAnnotations', { uris: uris, annotations: annotations });
};

// Subscribe to annotations requests
exports.annotations = function(cb) {
  fayeClient.subscribe('/annotations/' + clientID, cb);
};

// subscribe to updated item
exports.updateItem = function(cb) {
  fayeClient.subscribe('/updateItem', cb);
};

// Subscribe to deleted item
exports.subDeletedItem = function(cb) {
  fayeClient.subscribe('/deletedItem', cb);
};

// Delete selected.
exports.delete = function(selected) {
  publish('/delete', { selected: selected});
};

// Logout.
exports.logout = function() {
  publish('/logout', {});
};

// Perform a cluster query and return subscription.
exports.cluster = function(options, cb) {
  fayeClient.subscribe('/clusterResults/' + clientID, cb);
  publish('/cluster', options);
};

// Perform a moreLikeThis query for a URI.
exports.moreLikeThis = function(uri) {
  publish('/moreLikeThis', { uri: uri});
};

// Perform a general query, cancelling any existing query subscription.
exports.query = function(cb, options) {
  publish('/query', options);

  // cancel any existing querysub
  if (querySub) {
    querySub.cancel();
  }

  querySub = fayeClient.subscribe('/queryResults/' + clientID, cb);
};

exports.updateContent = function(desc) {
  desc.clientID = clientID;
  publish('/updateContent', desc);
};

// PUBLISH and subscribe to team listings
exports.subTeamList = function(cb) {
  fayeClient.subscribe('/teamList/' + clientID, cb);
  publish('/team/list', { });
};


// ### Searches
//  Publish and subscribe to search listings
exports.subSearches = function(cb) {
  publish('/search/retrieve', {});
  fayeClient.subscribe('/search/results', cb);
};

// ### Search updates
//  Subscribe to global search updates
exports.subSearchUpdates = function(cb) {
  fayeClient.subscribe('/search/updated', cb);
};

// Save a search
exports.searchSave = function(searchInput) {
  console.log('searchSave', searchInput);
  publish('/search/save', searchInput);
};

// Queue a search
exports.searchQueue = function(searchInput) {
  publish('/search/queue', searchInput);
};

// ### Subscriptions
// save subscriptions for user
exports.saveSubscriptions = function(matches) {
  console.log('/subscriptions/save', matches);
  publish('/subscriptions/save', { matches: matches });
};

// retrieve subscriptions for user
exports.retrieveSubscriptions = function(options, cb) {
  console.log('/subscriptions/retrieve', options);
  publish('/subscriptions/retrieve', options);
  fayeClient.subscribe('/subscriptions/results/' + clientID, cb);
};
