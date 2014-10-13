// Tests for configured indexer (ElasticQuery)
/*jslint node: true */
/* global describe,it */
'use strict';

var expect = require("expect.js");

var annotations = require('../../lib/annotations.js'), testApp = require('../lib/test-app.js'), utils = require('../../lib/utils.js');

describe('Indexer', function(done) {
  it('should reset test app', function(done) {
    testApp.start(function(err, ok) {
      expect(err).to.be(undefined);
      done();
    });
  });

// partial functions
  it('should save a record', function(done) {
    var saveRecord = GLOBAL.svc.indexer.saveRecord('testRecord', function(data) { return data.testField; });
    var testRecord = { member: 'test', testField: 72};
    saveRecord(testRecord, function(err, res) {
      expect(err).to.be(null);
      done();
    });
  });

  it('should wait a second for indexing', function(done) {
    utils.indexDelay(done);
  });

  it('should retrieve a record', function(done) {
    var retrieveRecord = GLOBAL.svc.indexer.retrieveRecords('testRecord', ['testField']);
    retrieveRecord('test', function(err, res) {
      expect(err).to.be(null);
      expect(res.hits.total).to.be(1);
      expect(res.hits.hits[0]._source.testField).to.be(72);
      done();
    });
  });

  it('should index a page', function(done) {
    var cItem = annotations.createContentItem({title: 'test title', uri: GLOBAL.testing.uniqURI, content: 'test content ' + GLOBAL.testing.uniq});
    cItem.visitors = [{ member: GLOBAL.testing.uniqMember}];
    cItem.text = cItem.content;

    GLOBAL.svc.indexer.saveContentItem(cItem, function(err, res) {
      expect(err).to.be(null);
      expect(res._id).to.not.be(null);
      done();
    });
  });

  it('should wait a second for indexing', function(done) {
    utils.indexDelay(done);
  });

  it('should retrieve by URI', function(done) {
    GLOBAL.svc.indexer.retrieveByURI(GLOBAL.testing.uniqURI, function(err, r) {
      expect(err).to.be(null);
      expect(r).to.not.be(undefined);
      expect(r._source.uri).to.be(GLOBAL.testing.uniqURI);
      done();
    });
  });

  it('should form query', function(done) {
// delay for ElasticSearch refresh delay
    GLOBAL.svc.indexer.formQuery({}, function(err, res) {
      expect(err).to.be(null);
      expect(res.hits.total).to.be(1);
      done();
    });
  });

  it('should form query by member', function(done) {
    var found = { member: GLOBAL.testing.uniqMember, annotationState: utils.states.content.visited };

    GLOBAL.svc.indexer.formQuery(found, function(err, res) {
      expect(err).to.be(null);
      expect(res.hits.total).to.be(1);
      done();
    });
  });

  it('should return no results for form query by non-member', function(done) {
    var notFound = { member: GLOBAL.testing.uniqMember + 'nonense', annotationState: utils.states.content.visited };
    GLOBAL.svc.indexer.formQuery(notFound, function(err, res) {
      expect(err).to.be(null);
      expect(res.hits.total).to.be(0);
      done();
    });
  });

  it('should form query by terms', function(done) {
    var found = { terms: GLOBAL.testing.uniq };

    GLOBAL.svc.indexer.formQuery(found, function(err, res) {
      expect(err).to.be(null);
      expect(res.hits.total).to.be(1);
      done();
    });
  });

/*
  it('should return no results for non-terms', function(done) {
    var notFound = { terms: uniq + 'nonsense' }
    indexer.formQuery(notFound, function(err, res) {
      expect(err).to.be.null;
      expect(res.hits.total).to.be(0);
      done();
    });
  });
  it('should form search by date range', function(done) {
    var e = { from: '2013-10-04T19:51:15.963Z', to: '2013-10-07T19:51:15.963Z' }

    indexer.formQuery(e, function(err, res) {
      expect(err).to.be.null;
      expect(res.hits.total).to.be(1);
      done();
    });
  });

  it('should form search by combination', function(done) {
    var e = { terms: uniq, from: '2013-10-04T19:51:15.963Z', to: '2013-10-07T19:51:15.963Z', member: uniqMember };

    indexer.formQuery(e, function(err, res) {
      done();
    });
  });

  it('should save search', function(done) {
    indexer.saveScrape({ name : uniq, tags : 'test tags',
      startingPage: uniqURI, continueFinding: 'within 2',
      scanEvery: '5 hours', isSyndication: 'no', contentLocation: '' }, function(err, res) {
        expect(err).to.be.null;
        done();
      });
  });

  it('should search searchs', function(done) {
    indexer.searchQuery(uniq, function(err, res) {
      expect(err).to.be.null;;;;
      expect(res.hits.total).to.be(1);
      done();
    });
  });
  */
});
