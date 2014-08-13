// ### auth
//
// A catch-all for auth stuff.
/*jslint node: true */

'use strict';

var _ = require('lodash');

// Gets an authenticated user from global authenticated by clientID.
exports.userByClientID = function(clientID) {
  return _.first(_.where(GLOBAL.authed, { clientID: clientID}));
};

exports.userByUsername = userByUsername;

// Retrieve a user record by their username.
function userByUsername(username) {
  return _.first(_.where(GLOBAL.authed, { username: username}));
};

exports.clientIDByUsername = clientIDByUsername;

// Retrieve existing client ID by username.
function clientIDByUsername(username) {
  return username ? (userByUsername(username) || {}).clientID : null;
};

// Render member.js with client ID
exports.memberJS = function(member) {
  return _.template(fs.readFileSync('./web/site/member.js'), { user: member, clientID: clientIDByUsername(member), homepage: GLOBAL.config.HOMEPAGE });
};

// Global user functions.


// Passport function.
exports.findById = function(id, fn) {
  var found = _.first(_.where(GLOBAL.config.users, { id : id }));

  if (found) {
    fn(null, found);
  } else {
    fn(new Error('User ' + id + ' does not exist'));
  }
};

// Passport function.
exports.findByUsername = function(username, fn) {
  return fn(null, _.first(_.where(GLOBAL.config.users, { username : username})));
};

// Generate a somewhat random clientID.
exports.generateClientID = function(username) {
  return username + '@' + Math.round(Math.random() * 9e9);
}
