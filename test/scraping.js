// test scraper workflow
// initial doc is saved to state queue with queue: { relevance: 3 }
// as pages are accessed, previousState  is set to last state
// if they have previousState as queue, scraper.queueLinks finds relevance
// if relevance is > 0, relevant page links are added

var fs = require('fs'), expect = require('expect.js');
var scraper = require('../lib/scraper.js'), testApp = require('./test-app.js'), utils = require('../lib/utils.js');


describe('Scraper links', function(done) {
  it('should reset test app', function(done) {
    testApp.start(function(err, ok) {
      expect(err).to.be.null;
      done();
    });
  });

  it('should queue document links', function() {
    var text = fs.readFileSync('./data/search-results/pubmed.html').toString()
    var cItem = { uri: 'http://www.ncbi.nlm.nih.gov/pubmed/?term=pubmed', content: text, previousState: 'queue', state: 'visited', 
      queued: { relevance: 2, tags: ['tag-'+utils.getUnique()] } };
    var links = scraper.queueLinks(cItem);
    expect(links.size > 0).to.be.true;
  });

  it('should have a queued link', function(done) {
    // FIXME: queeLinks callback
    setTimeout(function() {
      done();
    }, 500);
    
  });
});

