/*jslint node: true */

'use strict';

var fs = require('fs'), expect = require("expect.js"), indexer = require('../../lib/indexer.js'), path = require('path');
GLOBAL.config = require('../lib/test-config.js').config;
var annotatorStructural = require('../../lib/annotators/structural.js');

describe('Structural annotators', function(done){
  it('should extract regexes fields', function(done) {
    var sampleDoc = fs.readFileSync('../data/structural/regexes.html').toString();
    annotatorStructural.doProcess({ uri: GLOBAL.config.HOMEPAGE + '/test', text: sampleDoc}, function(err, result) {
      expect(err).to.be.undefined;
      var annos = result.annoRows;
      var l = annos.length;
      expect(l).to.be(21);
      done();
    });
  });
  it('should extract tableDateValues fields', function(done) {
    var sampleDoc = fs.readFileSync('../data/structural/tableDatedValues.html').toString();
    annotatorStructural.doProcess({ uri: GLOBAL.config.HOMEPAGE + '/tableDateValuesTest', text: sampleDoc}, function(err, result) {
      expect(err).to.be.undefined;
      var annos = result.annoRows;
      var l = annos.length;
      expect(l).to.be(3);
      done();
    });
  });
});
