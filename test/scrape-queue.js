
// scraper workflow:
//
// a new link is added with pubsub /visited: links[]
// links are added as contentItems with a default relevance (2), state queued, and queued details
// if any contentItems are queued, they are received back
//
// requires a running system.

var uniq = (new Date().getTime()).toString(16) + 'x' + Math.round(Math.random(9e9) * 9e9).toString(16);
var testApp = require('./test-app.js');

GLOBAL.config = require('./test-config.js').config;
var faye = require('faye'), expect = require("expect.js");
var fayeClient = new faye.Client(GLOBAL.config.FAYEHOST);

describe('Scraper queue', function(done) {
  it('should have reset test app', function(done) {
    testApp.start(function(err, ok) {
      console.log('**', err, ok);
      expect(err).to.be.null;
      done();
    });
  });

  it('should receive visited links', function(done) {
    var links = [ 'http://test.com/scraper/' + uniq ];
    fayeClient.subscribe('/visit', function(v) {
      console.log(v);
      done();
    });
    fayeClient.publish('/visited', { links: links, relevance: 2, scraper: 'scrape-queue', tags: ['scraper-queue-' + uniq]});

  });
});
