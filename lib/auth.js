// ### auth
//
// A catch-all for auth stuff.
/*jslint node: true */

'use strict';

var _ = require('lodash'), fs = require('fs'), path = require('path');
var DEFAULT_USERS_LOC = '../local-site.json', memberTemplate =  _.template(fs.readFileSync(path.join(__dirname, '../web/site/member.js')));

exports.authedByUsername = authedByUsername;
exports.clientIDByUsername = clientIDByUsername;
exports.generateClientID = generateClientID;

// Auth context containing users and authed.
var context;
// Set up users including pre-authed agents.
exports.setupUsers = function(ctx, users)  {
  if (!users) {
    try {
      users = require(DEFAULT_USERS_LOC).logins;
    } catch (e) {
      throw new Error(DEFAULT_USERS_LOC + ' is missing, create it with build task in README.');
    }
  }
  ctx.config.users = users;
  ctx.authed = {};
  // auth available agents
  _.forEach(_.where(users, { status: 'available', type: 'Agent'}), function(a) { ctx.authed[a.username] = a; });
  context = ctx;
};

// Add an authenticated user
//
// id will be an IP address for id, or username@pubsub for pubsub.
exports.addAuthenticated = function(id, user) {
  context.authed[id] = user;
  context.authed[id].clientID = generateClientID(user.username);
};

// Gets an authenticated user from global authenticated by clientID.
exports.userByClientID = function(clientID) {
  return _.first(_.where(context.authed, { clientID: clientID}));
};

// Render member.js with client ID. This is here to maintain consistency between front end and proxy.
exports.memberJS = function(member) {
  member = member || {};
  return memberTemplate({ banner: GLOBAL.config.banner, user: member.username, clientID:  member.clientID, homepage: context.config.HOMEPAGE });
};

// Connect-Passport lookup.
exports.findById = function(id, fn) {
  var found = _.first(_.where(context.config.users, { id : id }));

  if (found) {
    fn(null, found);
  } else {
    fn(new Error('User ' + id + ' does not exist'));
  }
};

// Connect-Passport lookup.
exports.findByUsername = function(username, fn) {
  return fn(null, _.first(_.where(context.config.users, { username : username})));
};

// Retrieve a user record by their username.
function authedByUsername(username) {
  return _.first(_.where(context.authed, { username: username}));
}


// retrieve the named member from global member list
exports.getUserByUsername = function(m) {
  return _.find(GLOBAL.config.users, { username: m});
};

// Retrieve existing client ID by username.
function clientIDByUsername(username) {
  return username ? (authedByUsername(username) || {}).clientID : null;
}

// Generate a somewhat random clientID.
function generateClientID(username) {
  return username + '@' + Math.round(Math.random() * 9e9);
}
