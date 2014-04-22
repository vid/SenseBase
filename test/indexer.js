// Tests for configured indexer (ElasticSearch)

var expect = require("expect.js");
var indexer = require('../lib/indexer.js'), annotations = require('../lib/annotations.js'), testApp = require('./test-app.js'), utils = require('../lib/utils.js');
GLOBAL.config = require('./test-config.js').config;

var uniq = utils.getUnique(), uniqMember = 'member'+uniq, uniqURI = 'http://test.com/' + uniq, uniqCategory = 'category' + uniq;

describe('Indexer', function(){
  it('should reset test app', function(done) {
    testApp.start(function(err, ok) {
      expect(err).to.be.null;
      done();
    });
  });

  it('should index a page', function(done) {
    var cItem = annotations.createContentItem({title: 'test title', uri: uniqURI, content: 'test content ' + uniq});
    cItem.member = uniqMember;
    indexer.saveContentItem(cItem, function(err, res) {
      expect(err).to.be.null;
      done();
    });
  });

  it('should index an annotation', function(done) {
    var annoCategory = annotations.createAnnotation({hasTarget: uniqURI, annotatedBy: uniqMember, type: 'category', category: uniqCategory});
    indexer.saveAnnotations(uniqURI, annoCategory, function(err, res) {
      expect(err).to.be.null;
      done();
    });
  });

  it('should retrieve by URI', function(done) {
    indexer.retrieveByURI(uniqURI, function(err, r) {
      expect(err).to.be.null;
      expect(r.exists).to.be.true;
      done();
    });
  });

  it('should form search by member', function(done) { 
    var found = { member: uniqMember, annotationState: 'visited' }

    indexer.formSearch(found, function(err, res) {
      expect(err).to.be.null;
      expect(res.hits.total).to.be(1);

      var notFound = { member: uniqMember + 'nonense', annotationState: 'visited' }
      indexer.formSearch(notFound, function(err, res) {
        expect(err).to.be.null;
        expect(res.hits.total).to.be(0);
        done();
      });
    });
  });

  it('should form search by terms', function(done) { 
    var found = { terms: uniq }

    indexer.formSearch(found, function(err, res) {
      expect(err).to.be.null;
      expect(res.hits.total).to.be(1);
      var notFound = { terms: uniq + 'nonsense' }
      indexer.formSearch(notFound, function(err, res) {
        expect(err).to.be.null;
        expect(res.hits.total).to.be(0);
        done();
      });
    });
  });

/*
  it('should form search by date range', function(done) { 
    var e = { from: '2013-10-04T19:51:15.963Z', to: '2013-10-07T19:51:15.963Z' }

    indexer.formSearch(e, function(err, res) {
      expect(err).to.be.null;
      expect(res.hits.total).to.be(1);
      done();
    });
  });

  it('should form search by combination', function(done) { 
    var e = { terms: uniq, from: '2013-10-04T19:51:15.963Z', to: '2013-10-07T19:51:15.963Z', member: uniqMember };

    indexer.formSearch(e, function(err, res) {
      done();
    });
  });

  it('should save scrape', function(done) {
    indexer.saveScrape({ name : uniq, tags : 'test tags',
      startingPage: uniqURI, continueFinding: 'within 2',
      scanEvery: '5 hours', isSyndication: 'no', contentLocation: '' }, function(err, res) {
        expect(err).to.be.null;
        done();
      });
  });

  it('should search scrapes', function(done) {
    indexer.scrapeSearch(uniq, function(err, res) {
      expect(err).to.be.null;;;;
      expect(res.hits.total).to.be(1);
      done();
    });
  });
  */
});

