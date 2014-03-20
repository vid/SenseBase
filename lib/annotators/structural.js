
// Strucutural annotator looks for structure in documetn and extracts fields

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

exports.process = function(text, callback) {
  sMatches.forEach(function(sMatch) {
    var match = text.match(sMatch.match);
console.log('MATCH', match);
    if (match) {
      match.shift();
      annoRows = [];
      var c = 0;
      match.forEach(function(m) {
       annoRows.push({ranges:[{start:"/section[1]",startOffset:match.index,end:"/section[1]",endOffset:match.index + sMatch.fields[c++].length}],quote:m,text:'Structural "' + sMatch.name + '" ' + match.index, value: 'stype', types: ['stype'], validated: false});
     });
     callback(null, annoRows);
    }
  }); 
  callback();
}



