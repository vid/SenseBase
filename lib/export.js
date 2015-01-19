// # Export
//
// Export content in selected format
//
/*jslint node: true */
'use strict';

var annoLib = require('./annotations.js'), utils = require('./utils.js');

var mimeTypes = {
  tsv: 'application./tsv',
  ris: 'text/ris',
  json: 'application/json'
}, mainFields = ['title', 'uri', 'created', 'state'],
  risMap = {
  title: 'TI',
  uri: 'UR'
}, exportMap = GLOBAL.config.exportMap || {PubmedArticle: 'MH'};

exports.export = function(type, options, req, res) {
  console.log('export', type, options);
  var mimeType = mimeTypes[type];

  var query = GLOBAL.svc.indexer.formQuery;

  query({ query: options}, function(err, results) {
    var ret;
    if (type === 'json') {
      ret = JSON.stringify(results, null, 2);
    } else if (type === 'ris') {
      ret = getRIS(results, options.includeUnvalidated);
    } else {
      ret = getTSV(results, options.includeUnvalidated);
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
function getRIS(results, includeUnvalidated) {
  if (!results.hits || results.hits.total < 1) {
    return '';
  }
  var ris = [];
  results.hits.hits.forEach(function(hit) {
    var res = hit._source;
    ris.push('TY' + rsep + (res.uri.indexOf('ncbi.nlm.nih.gov') > -1 ? 'ABST' : 'JFULL'));
    for (var f in risMap) {
      ris.push(risMap[f] + rsep + res[f]);
    }
    res.annotations.forEach(function(anno) {
      if (includeUnvalidated || anno.state === utils.states.annotations.validated) {
      console.log(includeUnvalidated, anno.annotatedBy, anno.state, utils.states.annotations.validated);
        var field = exportMap[anno.annotatedBy];
        if (!field) {
           var c = Object.keys(exportMap).length + 1;
           field = 'C' + c;
           while (exportMap[field] !== undefined) {
             c++;
             field = 'C' + c;
           }
           exportMap[anno.annotatedBy] = field;
         }
        ris.push(field + rsep + (anno.flattened.replace(new RegExp('.*?' + annoLib.unitSep), '').replace(new RegExp(annoLib.unitSep, 'g'), '/')));
      }
    });

    ris.push('');
  });
  console.log(exportMap);
  return ris.join(crlf);
}

function getTSV(results, includeUnvalidated) {
}
