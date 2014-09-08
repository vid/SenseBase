// # import-files
// imports files as contentItems
/*jslint node: true */

'use strict';

var fs = require('fs'), path = require('path');

var importFiles = require('../lib/file-import.js'), annotationLib = require('../lib/annotations.js'), utils = require('../lib/utils.js');

require(process.cwd() + '/index.js').setup();

if (process.argv.length < 4) {
  console.log('usage:', process.argv[1], 'tag file [member|system]');
  process.exit(1);
}

var tag = process.argv[2], file = process.argv[3], member = process.argv[4] || 'system';

var pathedFile =  { path: path.normalize(file), name: path.basename(file)};
var context = { member: member, categories: [tag]};

var tag = { type: 'value', roots: ['OHTN', 'SHARE'], key: 'RefID', value: pathedFile.name.replace(/_.*/, ''), state: utils.states.annotations.validated};
context.categories.push(tag);

importFiles.indexFiles([pathedFile], context, function(err, res, cItem) {
  console.log('err', err, 'res', res, 'cItem', cItem);
  utils.indexDelay(function() { process.exit(0); });
});
