// reset all ElasticSearch schemas and data
/*jslint node: true */

'use strict';

require(process.cwd() + '/index.js').setup();

var reset = require('../lib/reset.js');
reset.resetAll(function(err, res) {
  if (err) {
    console.log('failed', err);
  } else {
    console.log('finished', res);
  }
});
