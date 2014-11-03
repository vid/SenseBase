// service that periodically checks for and requests queued content
/*jslint node: true */
'use strict';

require(process.cwd() + '/index.js').setup();

var contentLib = require('../lib/content');

var member = 'system';

var clientID = GLOBAL.svc.auth.clientIDByUsername(member);
var _ = require('lodash');

if (process.argv.length < 4) {
  console.log('usage:', process.argv[1], 'annotatedBy size|0 [preview-only]');
  process.exit(1);
}

var by = process.argv[2], size = process.argv[3], preview = process.argv[4];
var params = { query: { terms: 'annotatedBy:"' + by + '"' } };
if (size) {
  params.query.size = size;
}

GLOBAL.svc.indexer.formQuery(params, function(err, res) {
  if (err) {
    console.log('query error', err);
    process.exit(1);
  }

  console.log('result size', res.hits.hits.length, 'out of', res.hits.total);
  if (preview) {
    console.log(res.hits.hits.forEach(function(hit) {
      console.log('hit', JSON.stringify(hit._source, null, 2));
    }));
  } else {
    res.hits.hits.forEach(function(hit) {
      contentLib.indexContentItem({ uri: hit._source.uri}, { member: member, deleteExistingAnnotatedBy: by}, function(err, res) {
        if (err) {
          console.log('failed:', err);
        } else {
          console.log('deleted', res);
        }
      });
    });
  }
});
