var annoLib = require('./annotateLib'), annotations = require('../../lib/annotations'), sites = require('../sites.js'), u

var name = 'Structural';

// wait for annotation requests
annoLib.requestAnnotate(process);

// Strucutural annotator looks for structure and extracts fields

var name = 'Structural';

// sample match
var sMatches = [
  {
    name: 'medical report',
    match : /[\s\S]*Date of Admission:([\s\S]*?)Date of Discharge to Home:([\s\S]*?)Admitting Diagnosis:([\s\S]*?)Discharge Diagnosis:([\s\S]*?)Discharge Condition:([\s\S]*?)Consults:([\s\S]*?)Procedures:([\s\S]*?)Brief History of Present Illness:([\s\S]*?)Hospital Course:([\s\S]*?)Physical Examination at Discharge:([\s\S]*?)Medications:([\s\S]*?)Activity:([\s\S]*?)Diet:([\s\S]*?)Follow Up:([\s\S]*?)Instructions:([\s\S]*?)$/m,
    type: 'orderedFields',
    fields: ['Date of Admission', 'Date of Discharge to Home', 'Admitting Diagnosis', 'Discharge Diagnosis', 'Discharge Condition', 'Consults', 'Procedures', 'Brief History of Present Illness', 'Hospital Course', 'Physical Examination at Discharge', 'Medications', 'Activity', 'Diet', 'Follow Up', 'Instructions']
  }
];

exports.name = name;


exports.process = function(combo) {
  var uri = combo.uri, html = combo.html, text = combo.text, selector = combo.selector;

  sMatches.forEach(function(sMatch) {
    var match = text.match(sMatch.match);
console.log('MATCH', match);
    if (match) {
      match.shift();
      annoRows = [];
      var c = 0;
      match.forEach(function(m) {
        var category = [descriptorCategory, qualifier._], attributes = { type: 'qualifier', majorTopic: qualifier.$.MajorTopicYN};
        annoRows.push(annotations.createAnnotation({type: 'category', annotatedBy: name, hasTarget: uri, category: category, attributes: attributes}));
     });
     callback(null, annoRows);
    }
  }); 
  callback();
}



