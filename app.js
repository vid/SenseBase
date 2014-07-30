// Minimal startup of app with configuration in config.js.

var senseBase = require('./index.js');

senseBase.start(require('./config.js').config);
