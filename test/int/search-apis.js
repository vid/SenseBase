// test search apis

var expect = require('expect.js');

var searchAPIs = require('../../lib/search-apis.js');

describe('Search APIs', function(done) {
  it('should search entrez.esearch', function(done) {
    searchAPIs.exec('entrez.esearch', {query: 'javascript', targetResults: 1}, function(err, uri, resultContext) {
      expect(err).to.be.null;
      expect(uri).to.not.be.null;
      expect(resultContext.referers).to.not.be.null;
      done();
    });
  });
});

