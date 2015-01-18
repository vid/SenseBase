// # Export
//
// Export content in selected format
//
/*jslint node: true */
'use strict';

var annoLib = require('./annotations.js');

var mimeTypes = {
  tsv: 'application./tsv',
  ris: 'text/ris',
  json: 'application/json'
}, mainFields = ['title', 'uri', 'created', 'state'],
  risMap = {
  title: 'TI',
  uri: 'UR'
}, exportMap = GLOBAL.config.exportMap || {};

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

var crlf = '\r\n', rsep = '  - ';
function getRIS(results) {
  if (!results.hits || results.hits.total < 1) {
    return '';
  }
  var ris = [];
  results.hits.hits.forEach(function(hit) {
    var res = hit._source;
    ris.push('TY' + rsep + (res.uri.indexOf('ncbi.nlm.nih.gov') ? 'ABST' : 'JFULL'));
    for (var f in risMap) {
      ris.push(f + rsep + res._source[f]);
    }
    res.annotations.forEach(function(anno) {
      var field = exportMap[anno.annotatedBy];
      if (!field) {
         var c = 0;
         while (exportMap['C' + (++c)]);
         field = 'C' + c;
         exportMap[anno.annotatedBy] = field;
       }
      ris.push(field + rsep + (anno.flattened.replace(new RegExp('.*' + annoLib.unitSep), '').replace(new RegExp(annoLib.unitSep), '/')));
    });

    ris.push(crlf);
  });
  return ris.join(crlf);
}

function getTSV(results) {
}
