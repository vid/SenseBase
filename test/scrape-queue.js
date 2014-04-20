
// scraper workflow:
//
// a new link is added with pubsub /visited: links[]
// links are added as contentItems with a default relevance (2), state queued, and queued details
// if any contentItems are queued, they are received back
//
// TODO: add explicit relevance tests

var uniq = (new Date().getTime()).toString(16) + 'x' + Math.round(Math.random(9e9) * 9e9).toString(16);
var testApp = require('./test-app.js');

GLOBAL.config = require('./test-config.js').config;
var faye = require('faye'), expect = require("expect.js");
var fayeClient = new faye.Client(GLOBAL.config.FAYEHOST);

var testLink1 = 'http://test.com/scraper/' + uniq, testLinks1 = [ testLink1 ], 
  testLink2 = 'http://test.com/scraper/' + uniq + '-2', testLinks2 = [ testLink2 ], 
  testLink3 = 'http://test.com/scraper/' + uniq + '-3', testLinks3 = [ testLink3 ]; 

describe('Scraper queue', function(done) {
  it('should reset test app', function(done) {
    testApp.start(function(err, ok) {
      expect(err).to.be.null;
      done();
    });
  });

  it('should publish the first link', function(done) {
    var sub = fayeClient.subscribe('/visit', function(res) {
      expect(res.site).to.be.null;
      sub.cancel()
      done();
    });
    fayeClient.publish('/visited', { links: testLinks1, relevance: 2, scraper: 'scrape-queue', tags: ['scraper-queue-' + uniq]});
  });

  it('should receive the first published link', function(done) {
    var sub = fayeClient.subscribe('/visit', function(res) {
      expect(res.site.uri).to.equal(testLink1);
      sub.cancel()
      done();
    });
    setTimeout(function() {
      fayeClient.publish('/visited', { scraper: 'scrape-queue'});
    }, 1000);
  });

  it('should visit the first published link and publish a second level link', function(done) {
    var sub = fayeClient.subscribe('/visit', function(res) {
      expect(res.site).to.be.null;
      sub.cancel()
      done();
    });
    fayeClient.publish('/visited', { uri: testLink1, content: uniq, links: testLinks2, relevance: 2, scraper: 'scrape-queue', tags: ['scraper-queue-' + uniq]});
  });

  it('should receive the second published link', function(done) {
    var sub = fayeClient.subscribe('/visit', function(res) {
      expect(res.site.uri).to.equal(testLink2);
      sub.cancel()
      done();
    });
    setTimeout(function() {
      fayeClient.publish('/visited', { scraper: 'scrape-queue'});
    }, 1000);
  });

  it('should visit the second published link with irrelevant links', function(done) {
    var sub = fayeClient.subscribe('/visit', function(res) {
      expect(res.site).to.be.null;
      sub.cancel()
      done();
    });
    fayeClient.publish('/visited', { uri: testLink2, content: uniq, links: testLinks3, relevance: 2, scraper: 'scrape-queue', tags: ['scraper-queue-' + uniq]});
  });

  it('should have no links to visit', function(done) {
    var sub = fayeClient.subscribe('/visit', function(res) {
      expect(res.site).to.be.null;
      sub.cancel()
      done();
    });
    setTimeout(function() {
      fayeClient.publish('/visited', { scraper: 'scrape-queue'});
    }, 1000);
  });
});
