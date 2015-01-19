// # Export
//
// Export content in selected format
//
/*jslint node: true */
'use strict';

var _ = require('lodash');

var annoLib = require('./annotations.js'), utils = require('./utils.js');

var mimeTypes = {
  tsv: 'application./tsv',
  ris: 'text/ris',
  json: 'application/json'
}, mainFields = ['title', 'uri'],
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
    if (results.hits < 1) {
      res.end('No results.');
    }
    results = results.hits.hits;

    if (options.includeUnvalidated !== 'true' && results.length > 0) {
      results.forEach(function(hit) {
        hit._source.annotations = _.where(hit._source.annotations, { state: utils.states.annotations.validated });
      });
    }
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
  var ris = [];
  results.forEach(function(hit) {
    var res = hit._source;
    ris.push('TY' + rsep + (res.uri.indexOf('ncbi.nlm.nih.gov') > -1 ? 'ABST' : 'JFULL'));
    for (var f in risMap) {
      ris.push(risMap[f] + rsep + res[f]);
    }
    res.annotations.forEach(function(anno) {
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
    });

    ris.push('');
  });
  console.log(exportMap);
  return ris.join(crlf);
}

var tab = '\t';
function getTSV(results, includeUnvalidated) {
  var ret, byfields = {};
  // find all the anno fields
  results.forEach(function(hit) {
    hit._source.annotations.forEach(function(a) {
      byfields[a.annotatedBy] = 1;
    });
  });
  byfields = Object.keys(byfields);
  ret = [mainFields.concat(byfields).join(tab)];
  results.forEach(function(hit) {
    hit = hit._source;
    var res = mainFields.map(function(f) { return hit[f]; });
    byfields.forEach(function(by) {
       res.push(_.where(hit.annotations, { annotatedBy: by }).map(function(a) { return a.position.join('/'); }).join(','));
    });
    ret.push(res.join(tab));
  });
  return ret.join('\n');
}
