// ### pubsub
// Client functions for pub/sub actions

/*jslint browser: true */
/*jslint node: true */
/* global $,d3plus,d3 */

'use strict';

var clientID = window.senseBase.user, username = window.senseBase.user, homepage = window.senseBase.homepage;

var faye = require('faye');
var fayeClient = new faye.Client(homepage + 'faye/');

// annotate a page
exports.annotate = function(uri) {
  fayeClient.publish('/annotate', { clientID: window.clientID, uri: uri });
};

// save annotations for user
exports.saveAnnotations = function(uris, annotations) {
  fayeClient.publish('/saveAnnotations', { clientID: clientID, uris: uris, annotations: annotations });
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
  fayeClient.publish('/delete', { clientID: clientID, selected: selected});
};

// Logout.
exports.logout = function() {
  fayeClient.publish('/logout', {clientID: clientID});
};

// Perform a general query.
exports.query = function(options) {
  options.clientID = clientID;
  fayeClient.publish('/query', options);
};

// Perform a cluster query and return subscription.
exports.cluster = function(options, cb) {
  options.clientID = clientID;
  fayeClient.subscribe('/clusterResults/' + clientID, cb);
  fayeClient.publish('/cluster', options);
};

// Perform a moreLikeThis query for a URI.
exports.moreLikeThis = function(uri) {
  fayeClient.publish('/moreLikeThis', { clientID: clientID, uri: uri});
};

// Subscribe to query results.
exports.queryResults = function(cb) {
  return fayeClient.subscribe('/queryResults/' + clientID, cb);
};

exports.updateContent = function(uri) {
  fayeClient.publish('/updateContent', { clientID : clientID, uri: uri } );
};

// Publish and subscribe to team listings
exports.subTeamList = function(cb) {
  fayeClient.subscribe('/teamList/' + clientID, cb);
  fayeClient.publish('/team/list', { clientID: clientID});
};

//  Publish and subscribe to search listings
exports.subSearches = function(cb) {
  fayeClient.publish('/search/retrieve', { member: username });
  fayeClient.subscribe('/search/results', cb);
};


// Save a search
exports.searchSave = function(searchInput) {
  fayeClient.publish('/search/save', searchInput);
};

// Queue a search
exports.searchQueue = function(searchInput) {
  fayeClient.publish('/search/queue', searchInput);
};
