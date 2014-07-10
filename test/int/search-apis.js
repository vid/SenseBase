// test search apis

var expect = require('expect.js');

var searchAPIs = require('../../lib/search-apis.js');

// FIXME required for test bing api key
GLOBAL.config = require('../../config.js').config;

describe('Search APIs', function(done) {
  it('should search entrez.esearch', function(done) {
    var count = 0;
    searchAPIs.exec('entrez.esearch', {query: 'javascript api', targetResults: 1}, function(err, uri, resultContext) {
      expect(++count).to.be(1);
      expect(err).to.be.null;
      expect(uri).to.not.be.null;
      expect(resultContext.referers).to.not.be.null;
      done();
    });
  });
  it('should search bing.web', function(done) {
    var count = 0;
    searchAPIs.exec('bing.web', {query: 'javascript api', targetResults: 1}, function(err, uri, resultContext) {
      expect(++count).to.be(1);
      expect(err).to.be.null;
      expect(uri).to.not.be.null;
      expect(resultContext.referers).to.not.be.null;
      done();
    });
  });
  it('should search bing.news', function(done) {
    var count = 0;
    searchAPIs.exec('bing.news', {query: 'javascript api', targetResults: 1}, function(err, uri, resultContext) {
      expect(++count).to.be(1);
      expect(err).to.be.null;
      expect(uri).to.not.be.null;
      expect(resultContext.referers).to.not.be.null;
      done();
    });
  });
});
