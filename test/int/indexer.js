// Tests for configured indexer (ElasticQuery)
/*jslint node: true */
/* global describe,it */
'use strict';

var expect = require("expect.js");
var indexer = require('../../lib/indexer.js'), annotations = require('../../lib/annotations.js'), testApp = require('../lib/test-app.js'), utils = require('../../lib/utils.js');
GLOBAL.config = require('../lib/test-config.js').config;

var uniq = utils.getUnique(), uniqMember = 'member'+uniq, uniqURI = 'http://test.com/' + uniq, uniqCategory = 'category' + uniq;

describe('Indexer', function(done) {
  it('should reset test app', function(done) {
    testApp.start(function(err, ok) {
      expect(err).to.be(undefined);
      done();
    });
  });

  it('should index a page', function(done) {
    var cItem = annotations.createContentItem({title: 'test title', uri: uniqURI, content: 'test content ' + uniq});
    cItem.visitors = { member: uniqMember};
    indexer._saveContentItem(cItem, function(err, res) {
<<<<<<< HEAD
      expect(err).to.be(undefined);
=======
      expect(err).to.be(null);
>>>>>>> 53777938d3cf3532f0ee5daed08069644f85c582
      done();
    });
  });

  it('should retrieve by URI', function(done) {
    indexer.retrieveByURI(uniqURI, function(err, r) {
<<<<<<< HEAD
      expect(err).to.be(undefined);
      expect(r.exists).to.be(true);
=======
      expect(err).to.be(null);
      expect(r.found).to.not.be(undefined);
>>>>>>> 53777938d3cf3532f0ee5daed08069644f85c582
      done();
    });
  });

  it('should index an annotation', function(done) {
    var annoCategory = annotations.createAnnotation({hasTarget: uniqURI, annotatedBy: uniqMember, type: 'category', category: uniqCategory});
    indexer.saveAnnotations(uniqURI, annoCategory, function(err, res) {
<<<<<<< HEAD
      expect(err).to.be(undefined);
=======
      expect(err).to.be(null);
>>>>>>> 53777938d3cf3532f0ee5daed08069644f85c582
      done();
    });
  });

  it('should retrieve annotations', function(done) {
    indexer.retrieveAnnotations(uniqURI, function(err, res) {
<<<<<<< HEAD
      expect(err).to.be(undefined);
=======
      expect(err).to.be(null);
>>>>>>> 53777938d3cf3532f0ee5daed08069644f85c582
      expect(res.length).to.be(1);
      done();
    });
  });

  it('should wait a second for indexing', function(done) {
    setTimeout(function() {
      done();
    }, 1000);
  });

  it('should form search', function(done) {
// delay for ElasticSearch refresh delay
    indexer.formQuery({}, function(err, res) {
<<<<<<< HEAD
      expect(err).to.be(undefined);
=======
      expect(err).to.be(null);
>>>>>>> 53777938d3cf3532f0ee5daed08069644f85c582
      expect(res.hits.total).to.be(1);
      done();
    });
  });

  it('should form search by member', function(done) {
    var found = { member: uniqMember, annotationState: utils.states.content.visited };

    indexer.formQuery(found, function(err, res) {
<<<<<<< HEAD
      expect(err).to.be(undefined);
=======
      expect(err).to.be(null);
>>>>>>> 53777938d3cf3532f0ee5daed08069644f85c582
      expect(res.hits.total).to.be(1);
      done();
    });
  });

  it('should return no results for form search by non-member', function(done) {
    var notFound = { member: uniqMember + 'nonense', annotationState: utils.states.content.visited };
    indexer.formQuery(notFound, function(err, res) {
<<<<<<< HEAD
      expect(err).to.be(undefined);
=======
      expect(err).to.be(null);
>>>>>>> 53777938d3cf3532f0ee5daed08069644f85c582
      expect(res.hits.total).to.be(0);
      done();
    });
  });

  it('should form search by terms', function(done) {
    var found = { terms: uniq };

    indexer.formQuery(found, function(err, res) {
<<<<<<< HEAD
      expect(err).to.be(undefined);
=======
      expect(err).to.be(null);
>>>>>>> 53777938d3cf3532f0ee5daed08069644f85c582
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
