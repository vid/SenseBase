
var fs = require('fs'), expect = require("expect.js"), indexer = require('../lib/indexer.js'), fs = require('fs'), path = require('path');
GLOBAL.config = require('./test-config.js').config;
var annotatorStructural = require('../lib/annotators/structural.js');

var sampleDoc = fs.readFileSync('./data/structured-medical-record.html').toString();
describe('Medical report', function(done){
  it('should extract the fields', function(done) {
    annotatorStructural.doProcess({ uri: GLOBAL.config.HOMEPAGE + '/test', text: sampleDoc}, function(err, result) {
      expect(err).to.be.undefined;
      var l = result.length;
      expect(l).to.be(21);
      done();
    });
  });
});

