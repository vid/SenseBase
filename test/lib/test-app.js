// local app for testing
/* jshint node: true */
'use strict';

exports.start = function(callback) {
  var senseBase = require('../../index.js'), reset = require('../../lib/reset.js');

  senseBase.start(require('./test-config.js').config, callback);

  reset.resetAll(callback);
};
