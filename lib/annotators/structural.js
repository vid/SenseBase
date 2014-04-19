// Strucutural annotator looks for structure and extracts fields
// FIXME: extract multi lines

var annoLib = require('./annotateLib'), annotations = require('../../lib/annotations'), sites = require('../sites.js'), XRegExp = require('xregexp').XRegExp;

var name = 'Structural';

// wait for annotation requests
annoLib.requestAnnotate(doProcess);

// sample match
var sMatches = [
  {
    source: GLOBAL.config.HOMEPAGE + '.*',
    name: 'medical report',
    matches: ['Date of Admission: (.*?)\n', 'Date of Discharge to Home:(.*?)\n', 'Admitting Diagnosis:([\s\S]*?)\n', 'Discharge Diagnosis:(.*?)\n', 'Discharge Condition:(.*?)\n', 
      'Consults:(.*?)\n', 'Procedures:(.*?)\n', 'Brief History of Present Illness:(.*?)\n', 'Hospital Course:(.*?)\n', 'Physical Examination at Discharge:(.*?)\n',
      'Weight:(.*?)\n', 'General:(.*?)\n', 'HEENT:(.*?)\n', 'CVS:(.*?)\n', 'Respitory:(.*?)\n', 'Addomen:(.*?)\n', 'Extremities:(.*?)\n', 'Skin:(.*?)\n', 'Neuro:(.*?)\n', 
      'Medications:(.*?)\n', 'Activity:(.*?)\n', 'Diet:(.*?)\n', 'Follow Up:(.*?)\n', 'Instructions:(.*?)\n'],
    type: 'orderedFields',
    fields: ['Date of Admission', 'Date of Discharge to Home', 'Admitting Diagnosis', 'Discharge Diagnosis', 'Discharge Condition', 
      'Consults', 'Procedures', 'Brief History of Present Illness', 'Hospital Course', 'Physical Examination at Discharge', 
      'Weight', 'General', 'HEENT', 'CVS', 'Respitory', 'Addomen', 'Extremities', 'Skin', 'Neuro', 
      'Medications', 'Activity', 'Diet', 'Follow Up', 'Instructions']
  }
];

exports.name = name;

exports.doProcess = doProcess;

function doProcess(combo, callback) {
  var uri = combo.uri, html = combo.html, text = combo.text, selector = combo.selector, annoRows = [], xregex, found;
  GLOBAL.info(name, uri);

// extract field data where available
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

