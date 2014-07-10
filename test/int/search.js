// test search workflow
// initial doc is saved to state queue with queue: { relevance: 2 }
// as pages are accessed, previousState is set to last state
// if they have previousState as queue, search.queueLinks finds relevance
// if relevance is > 0, relevant page links are added

var fs = require('fs'), expect = require('expect.js');
var search = require('../../lib/search.js'), testApp = require('../lib/test-app.js'), utils = require('../../lib/utils.js');

var testTag = 'tag-'+utils.getUnique(), searchLink, queuedTotal;

describe('Scraper links', function(done) {
  it('should reset test app', function(done) {
    testApp.start(function(err, ok) {
      expect(err).to.be.null;
      done();
    });
  });

  it('should queue document links', function() {
    var text = fs.readFileSync('../data/search-results/pubmed.html').toString()
    var cItem = { uri: 'http://www.ncbi.nlm.nih.gov/pubmed/?term=pubmed', content: text, previousState: 'queue', state: 'visited', 
      queued: { relevance: 2, attempts: 0, tags: [testTag] } };
    var links = search.queueLinks(cItem);
    expect(links.size > 0).to.be.true;
  });

  it('should have a queued link', function(done) {
    // FIXME: queueLinks callback
    setTimeout(function() {
      search.getQueuedLink(function(err, queuedLink) {
        searchLink = queuedLink;
        expect(queuedLink.uri).to.not.be.null;
        expect(queuedLink.queued.tags.length > 0).to.be.true;
        expect(queuedLink.queued.tags[0]).to.equal(testTag);
        queuedTotal = queuedLink.total;
        expect(queuedTotal > 0).to.true;
        done();
      }, 1);
    }, 1100);
    
  });

  it('should search the queued link', function(done) {
    expect(searchLink).to.not.be.null;
    search.searchLink(searchLink.uri, function(err, res) {
      expect(err).to.be.null;
      expect(res.length > 0).to.be.true;
      done();
    });
  });

  it('should have less queued links', function(done) {
    // FIXME: queueLinks callback
    setTimeout(function() {
      search.getQueuedLink(function(err, queuedLink) {
// FIXME
        expect(queuedTotal === queuedLink.total + 1);
        done();
      }, 1);
    }, 500);
    
  });
});

