// ### auth
//
// A catch-all for auth stuff.
/*jslint node: true */

'use strict';

var _ = require('lodash'), fs = require('fs');

// Gets an authenticated user from global authenticated by clientID.
exports.userByClientID = function(clientID) {
  return _.first(_.where(GLOBAL.authed, { clientID: clientID}));
};

exports.userByUsername = userByUsername;

// Retrieve a user record by their username.
function userByUsername(username) {
  return _.first(_.where(GLOBAL.authed, { username: username}));
}

exports.clientIDByUsername = clientIDByUsername;

// Retrieve existing client ID by username.
function clientIDByUsername(username) {
  return username ? (userByUsername(username) || {}).clientID : null;
}

// Render member.js with client ID
exports.memberJS = function(member) {
  member = member || {};
  return _.template(fs.readFileSync('./web/site/member.js'), { user: member.username, clientID:  member.clientID, homepage: GLOBAL.config.HOMEPAGE });
};

// Connect-Passport lookup.
exports.findById = function(id, fn) {
  var found = _.first(_.where(GLOBAL.config.users, { id : id }));

  if (found) {
    fn(null, found);
  } else {
    fn(new Error('User ' + id + ' does not exist'));
  }
};

// Connect-Passport lookup.
exports.findByUsername = function(username, fn) {
  return fn(null, _.first(_.where(GLOBAL.config.users, { username : username})));
};

// Generate a somewhat random clientID.
exports.generateClientID = function(username) {
  return username + '@' + Math.round(Math.random() * 9e9);
};

// Set up local users including pre-authed agents.
exports.setupUsers = function(v)  {
  // Load local configuration if available.
  var users;
  try {
    users = require('../local-site.json').logins;
  } catch (e) {
    throw new Error('local-site.json is missing, create it with build task in README.');
  }

  v.config.users = users;
  v.authed = [];
  _.forEach(_.where(users, { type : 'Agent', status: 'available'}), function(a) { v.authed[a.username] = a; });
};
