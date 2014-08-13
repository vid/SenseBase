/*jslint node: true */
/* global describe, it */
'use strict';

var fs = require('fs'), expect = require("expect.js"), indexer = require('../../lib/indexer.js'), path = require('path');
var testGlobal = {config : require('../lib/test-config.js').config};
var annotatorStructural = require('../../services/annotators/structural.js');

describe('Structural annotators', function(done){
  it('should extract regexes fields', function(done) {
    var sampleDoc = fs.readFileSync('test/data/structural/regexes.html').toString();
    annotatorStructural.doProcess({ uri: testGlobal.config.HOMEPAGE + '/test', text: sampleDoc}, testGlobal.config.structuralMatches, function(err, result) {
      expect(err).to.be.undefined;
      var annos = result.annoRows;
      var l = annos.length;
      expect(l).to.be(21);
      done();
    });
  });
  it('should extract tableDateValues fields', function(done) {
    var sampleDoc = fs.readFileSync('test/data/structural/tableDatedValues.html').toString();
    annotatorStructural.doProcess({ uri: testGlobal.config.HOMEPAGE + '/tableDateValuesTest', text: sampleDoc}, testGlobal.config.structuralMatches, function(err, result) {
      expect(err).to.be.undefined;
      var annos = result.annoRows;
      var l = annos.length;
      expect(l).to.be(3);
      done();
    });
  });
});
