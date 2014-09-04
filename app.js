// Minimal startup of app with configuration in config.js.
/*jslint node: true */

'use strict';

var senseBase = require('./index.js');

senseBase.start(require('./config.js'));
