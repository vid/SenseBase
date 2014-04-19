// local app for testing

exports.start = function(callback) {
  var senseBase = require('../index.js'), reset = require('../lib/reset.js');

  senseBase.start(require('./test-config.js').config);

  reset.resetAll(callback);
}
