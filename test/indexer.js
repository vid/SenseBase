// Tests for configured indexer (ElasticSearch)

var expect = require("expect.js"), indexer = require('../lib/indexer.js'), annotations = require('../lib/annotations.js');
GLOBAL.config = require('./test-config.js').config;

var uniq = (new Date().getTime()).toString(16) + 'x' + Math.round(Math.random(9e9) * 9e9).toString(16);
var uniqMember = 'test'+uniq;
var uniqURI = 'http://test.com/' + uniq;

var testContent = 'This is test content.\nIt has the unique term wooglybat and the test term ' + uniq + '.';
// sample annotation
var testAnnotations = [ { "ranges": "item", "quote": { "label": "Disease Progression", "value": 0.00684931506849315 }, "created": "2014-01-04T01:56:42.127Z", "creator": "Classify" }, { "ranges": "item", "quote": { "label": "Disease Progression", "value": 0.00684931506849315 }, "created": "2014-01-04T01:56:42.127Z", "creator": "Classify" }, { "ranges": "item", "quote": "AFINN sentiment", "score": 0, "created": "2014-01-04T01:56:42.183Z", "creator": "Sentiment" }, { "ranges": "item", "quote": "Disease Progression", "created": "2014-01-04T23:52:41.728Z", "creator": "Classify" } ];

describe('Indexer', function(){
  it('should format an ContentItem', function() {
    var d = annotations.createContentItem({ uri: uniqURI, title: 'testdocument', member: uniqMember, isHTML: true, content: testContent, contentType: "text/text", annotations: testAnnotations});
  });

  it('should index a page', function(done) {
    indexer.saveAnnotation({ uri: uniqURI, title: 'testdocument', member: uniqMember, isHTML: true, content: testContent, contentText: 'text/html'}, function(err, res) {
      expect(err).to.be.null;
      done();
    });
  });

  it('should retrieve by URI', function(done) {
    indexer.retrieveByURI(uniqURI, function(err, r) {
      expect(r.exists).to.be.true;
      done();
    });
  });

  it('should form search by member', function(done) { 
    var e = { member: uniqMember }

    indexer.formSearch(e, function(err, res) {
      require('fs').writeFileSync('res', JSON.stringify(res));
      expect(err).to.be.null;
      expect(res.hits.total).to.be(1);
      done();
    });
  });

  it('should form search by terms', function(done) { 
    var e = { terms: uniq }

    indexer.formSearch(e, function(err, res) {
      expect(err).to.be.null;
      expect(res.hits.total).to.be(1);
      done();
    });
  });

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
});

