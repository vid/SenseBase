// # Export
//
// Export content in selected format
//
/*jslint node: true */
'use strict';

var _ = require('lodash');
var utils = require('./utils.js');

var mimeTypes = {
  tsv: 'application./tsv',
  ris: 'text/ris',
  json: 'application/json'
};

exports.export = function(type, options, req, res) {
  console.log(type, options);
  var mimeType = mimeTypes[type];

  var query = GLOBAL.svc.indexer.formQuery;

  query(options, function(err, results) {
    var ret;
    if (type === 'json') {
      ret = JSON.stringify(results, null, 2);
    } else if (type === 'ris') {
      ret = getRIS(results);
    } else {
      ret = getTSV(results);
    }
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', 'attachment; filename=' + GLOBAL.config.project + '-export-' + fn(options.size) + fn(options.annotations) + fn(options.terms) + new Date().getTime() + '.' + type);
    res.end(ret);
  });
};

function fn(val) {
  return val ? val + '-' : '';
}
function getRIS(results) {
}

function getTSV(results) {
}
