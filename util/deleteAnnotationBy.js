// service that periodically checks for and requests queued content
/*jslint node: true */
'use strict';

require(process.cwd() + '/index.js').setup();

var clientID = GLOBAL.svc.auth.clientIDByUsername('system');
var _ = require('lodash');

if (process.argv.length < 4) {
  console.log('usage:', process.argv[1], 'annotation size [preview-only]');
  process.exit(1);
}

var annotation = process.argv[2], size = process.argv[3], preview = process.argv[4];

GLOBAL.svc.indexer.formQuery({ query: annotation + flattened, size: size }, function(err, res) {
  if (err) {
    console.log('query error', err);
    process.exit(1);
  }
  console.log('total result set', res.hits.total);
  res.hits.hits.forEach(function(hit) {
    var found = _.pluck(hit.annotations, { flattened: query});
  });
});
