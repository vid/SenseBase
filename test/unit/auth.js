// test auth methods
/*jslint node: true */
/* global describe, it */

'use strict';

var auth = require('../../lib/auth');
var _ = require('lodash'), expect = require('expect.js');

var users = [
  {
    "type": "User",
    "username": "demo",
    "password": "demo",
    "email": "demo@test.com",
    "status": "available",
  },
  {
    "type": "Agent",
    "username": "agent1",
    "password": "demo",
    "email": "demo@test.com",
    "status": "available",
  },
  {
    "type": "Agent",
    "username": "agent2",
    "password": "demo",
    "email": "demo@test.com",
    "status": "unavailable",
  },
];

var user = { username: 'test' };

describe('Auth', function(){
  var testGlobal;
  it('should setup users', function() {
    testGlobal = { config : {} };
    auth.setupUsers(testGlobal, users);
    expect(_.keys(testGlobal.authed).length).to.be(1);
  });

  it('should authenticate a user', function() {
    auth.addAuthenticated.call({GLOBAL: testGlobal}, 'test', user);
    expect(_.keys(testGlobal.authed).length).to.be(2);
  });
});
