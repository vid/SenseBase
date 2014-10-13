// local app for testing
/* jshint node: true */
'use strict';

var fs = require('fs'), path = require('path');

var utils = require(path.join(process.env.PWD, './lib/utils.js'));

var uniq = utils.getUnique(), uniqMember = 'member'+uniq, uniqURI = 'http://test.com/' + uniq, uniqCategory = 'category' + uniq;

var context = require('./test-config.js');

context.logins = [{
    'type': 'User',
    'username': uniqMember,
    'password': 'demo',
    'email': 'demo@test.com',
    'status': 'available',
  }];

exports.start = function(callback) {
  var senseBase = require('../../index.js'), reset = require('../../lib/reset.js');
  senseBase.start(context);
  GLOBAL.testing = { uniq: uniq, uniqMember: uniqMember, uniqPassword: 'demo', uniqURI: uniqURI, uniqCategory: uniqCategory};

  reset.resetAll(callback);
};
