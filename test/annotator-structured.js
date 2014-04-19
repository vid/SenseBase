
var fs = require('fs'), expect = require("expect.js"), indexer = require('../lib/indexer.js'), fs = require('fs'), path = require('path');
GLOBAL.config = require('../config.js').config;
var annotatorStructural = require('../lib/annotators/structural.js');

var sampleDoc = fs.readFileSync('./data/structured-medical-record.html'), i = 0;
var fields = ['Date of Admission', 'Date of Discharge to Home', 'Admitting Diagnosis', 'Discharge Diagnosis', 'Discharge Condition', 'Consults', 'Procedures', 'Brief History of Present Illness', 'Hospital Course', 'Physical Examination at Discharge', 'Medications', 'Activity', 'Diet', 'Follow Up', 'Instructions'];
fields.forEach(function(f) {
  sampleDoc += f + ': ' + i++ + '\n';
});

describe('Medical report', function(done){
  it('should extract the fields', function(done) {
    annotatorStructural.process({ uri: GLOBAL.homepage + '/test', text: sampleDoc}, function(err, result) {
      expect(err).to.be.undefined;
      var l = result.length;
      expect(l).to.be(14);
      done();
    });
  });
});

