// local app for testing

var senseBase = require('../index.js'), reset = require('../lib/reset.js');

senseBase.start(require('./test-config.js').config);

reset.resetAll();

