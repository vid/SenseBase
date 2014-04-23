// Strucutural annotator looks for structure and extracts fields
// FIXME: extract multi lines

var annoLib = require('./annotateLib'), annotations = require('../../lib/annotations'), sites = require('../sites.js');

var name = 'Structural';

// wait for annotation requests
annoLib.requestAnnotate(doProcess);

exports.name = name;

exports.doProcess = doProcess;

function doProcess(combo, callback) {
  var uri = combo.uri, html = combo.html, text = combo.text, selector = combo.selector, annoRows = [], xregex, found;
  GLOBAL.info(name, uri);

// extract field data where available
  var sMatches = GLOBAL.config.structuralMatches;
  sMatches.forEach(function(sMatch) {
    if (uri.match(sMatch.source)) {
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
    }
    if (callback) {
      callback(null, annoRows);
    } else {
      annoLib.publishAnnotations(uri, annoRows);
    }
  });
};

