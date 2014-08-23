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
      expect(err).to.be(undefined);
      expect(uri).to.not.be(undefined);
      expect(resultContext.referers).to.not.be(undefined);
      done();
    });
  });
  it('should search bing.web', function(done) {
    searchAPIs.exec('bing.web', {query: 'javascript api', targetResults: 1}, function(err, uri, resultContext) {
      expect(err).to.be(undefined);
      expect(uri).to.not.be(undefined);
      expect(resultContext.referers).to.not.be(undefined);
      done();
    });
  });
  it('should search bing.news', function(done) {
    searchAPIs.exec('bing.news', {query: 'javascript api', targetResults: 1}, function(err, uri, resultContext) {
      expect(err).to.be(undefined);
      expect(uri).to.not.be(undefined);
      expect(resultContext.referers).to.not.be(undefined);
      done();
    });
  });
});
