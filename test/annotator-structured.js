
var expect = require("expect.js"), indexer = require('../lib/indexer.js'), fs = require('fs'), path = require('path');
GLOBAL.config = require('../config.js').config;
var annotatorStructural = require('../lib/annotateServices/structural.js');

var sampleDoc = '', i = 0;
var fields = ['Date of Admission', 'Date of Discharge to Home', 'Admitting Diagnosis', 'Discharge Diagnosis', 'Discharge Condition', 'Consults', 'Procedures', 'Brief History of Present Illness', 'Hospital Course', 'Physical Examination at Discharge', 'Medications', 'Activity', 'Diet', 'Follow Up', 'Instructions'];
fields.forEach(function(f) {
  sampleDoc += f + ': ' + i++ + '\n';
});

describe('Medical report', function(done){
  it('should extract the fields', function(done) {
    annotatorStructural.process(sampleDoc, function(err, result) {
      console.log('EE', err, result);
      expect(err).to.be.undefined;
      expect(result && result.length === fields.length).to.be(true);
      done();
    });
  });
});

