// service that periodically checks for and requests queued content
/*jslint node: true */
'use strict';

GLOBAL.config = require('../config.js').config;

var cron = require('cron');


