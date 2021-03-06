// test search apis
/* jshint node: true */
/* globals describe, it */
'use strict';

var expect = require('expect.js');

var searchAPIs = require('../../lib/search-apis.js');

// FIXME required for test bing api key
GLOBAL.config = require('../../config.js').config;

describe('Search APIs', function(done) {
  it('should search entrez.esearch', function(done) {
    searchAPIs.exec('entrez.esearch', {query: 'javascript api', targetResults: 1}, function(err, uri, resultContext) {
      expect(err).to.be(null);
      expect(uri).to.not.be(undefined);
      expect(resultContext.referer).to.not.be(null);
      done();
    });
  });
  it('should search bing.web', function(done) {
    searchAPIs.exec('bing.web', {query: 'javascript api', targetResults: 1}, function(err, uri, resultContext) {
      expect(err).to.be(null);
      expect(uri).to.not.be(undefined);
      expect(resultContext.referers).to.not.be(undefined);
      done();
    });
  });
  it('should search bing.news', function(done) {
    searchAPIs.exec('bing.news', {query: 'javascript api', targetResults: 1}, function(err, uri, resultContext) {
      expect(err).to.be(null);
      expect(uri).to.not.be(undefined);
      expect(resultContext.referers).to.not.be(undefined);
      done();
    });
  });
  it('should search feeds', function(done) {
    searchAPIs.exec('feedparser', {query: 'http://en.wikipedia.org/w/api.php?hidebots=1&days=7&limit=2&hidewikidata=1&action=feedrecentchanges&feedformat=atom', targetResults: 1}, function(err, uri, resultContext) {
      expect(err).to.be(null);
      expect(uri).to.not.be(undefined);
      expect(resultContext.referers).to.not.be(undefined);
      done();
    });
  });
});
