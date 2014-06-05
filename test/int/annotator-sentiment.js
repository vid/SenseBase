// tests sentiment service (requires running service)

var expect = require("expect.js"), indexer = require('../../lib/indexer.js'), fs = require('fs'), path = require('path');
GLOBAL.config = require('../lib/test-config.js').config;
var sentiment = require('../../lib/annotators/sentiment.js');

var doc = '<html><script lah lah></script><body class="something">Good <b>bad</b> amazing</body></html>';

describe('sentiment', function(done){
  it('should identify the candidates', function() {
    sentiment.doProcess({ uri: 'test', html: doc, text: doc.replace(/<.*?>/g, '')}, function(err, result) {
      console.dir('EE', err, result);
      expect(err).to.be.undefined;
      done();
    });
  });
});
