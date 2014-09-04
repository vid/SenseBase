// # Structural
// Strucutural annotator looks for structure and extracts fields
// FIXME: extract multi lines
/*jslint node: true */

'use strict';

var cheerio = require('cheerio');

var name = 'Structural';

var annoLib = require('./annotateLib').init(name), annotations = require('../../lib/annotations'), utils = require('../../lib/utils.js');

// wait for annotation requests
annoLib.setupAnnotator(doProcess);

exports.name = name;

exports.doProcess = doProcess;

function doProcess(combo, sMatches, callback) {
  GLOBAL.info(name, uri);

  var uri = combo.uri, html = combo.html, text = combo.text, selector = combo.selector, annoRows = [], xregex, found;

  var matchers = {
    // extract tables from vertical table values with a date
    // Example:
    //
    // +Name--|Date--+
    // |Val1  | ABC  |
    // |Val2  | ...  |
    // +------|------+
    tableDateValues : function(sMatch, text) {
      var $ = cheerio.load(text);
      var $table = $('table');
      $table.find('tr').each(function(i, tr) {
        var key, value, attr = [], foundValue = false;
        $(tr).find('td').each(function(j, td) {
          var v = $(td).html();
          if (j === 0) {
            key = v;
          } else if (j === 1) {
            foundValue = true;
            value = v;
          } else {
            attr.push(v);
          }
        });
        if (foundValue) {
          if (i === 0) {
            key = 'Date';
          }
          annoRows.push(annotations.createAnnotation({type: 'value', annotatedBy: sMatch.name, hasTarget: uri, key: key, value: value }));
        }
      });
      return annoRows;
    },

  // match a series of regexes, setting any found values
    regexes : function(sMatch, text) {
      for (var i = 0; i < sMatch.matches.length; i++) {
        var r = sMatch.matches[i];
        var found = text.match(r);

        if (found) {
          var exact = found[0];
          var value = found[1].trim();
          var key = sMatch.fields[i];
          annoRows.push(annotations.createAnnotation({type: 'valueQuote', annotatedBy: sMatch.name, hasTarget: uri, key: key, value: value, ranges: annotations.createRange({ exact: exact, offset: found.index, selector: ''}) }));
        }
      }
      return annoRows;
    }
  };

  sMatches.forEach(function(sMatch) {
    if (uri.match(sMatch.source)) {
      annoRows = matchers[sMatch.method](sMatch, text);
    }
  });
  callback(null, { name: name, uri: uri, annoRows: annoRows });
}
