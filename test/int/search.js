// test search workflow
// initial doc is saved to state queue with queue: { relevance: 2 }
// as pages are accessed, previousState is set to last state
// if they have previousState as queue, search.queueLinks finds relevance
// if relevance is > 0, relevant page links are added

var fs = require('fs'), expect = require('expect.js');
var search = require('../../lib/search.js'), testApp = require('../lib/test-app.js'), utils = require('../../lib/utils.js');

var uniq = utils.getUnique(), uniqLink = 'http://test.com/' + uniq, testTag = 'tag-'+utils.getUnique(), searchLink, queuedTotal, uniqMember = 'member'+uniq;

describe('Scraper links', function(done) {
  it('should reset test app', function(done) {
    testApp.start(function(err, ok) {
      expect(err).to.be.null;
      done();
    });
  });

  it('should queue a link', function() {
    search.queueLink(uniqLink, {member: uniqMember, categories: [testTag], relevance: 1});

    // FIXME: queueLinks callback
    setTimeout(function() {
      // find any queued link from preceeding
      search.getQueuedLink(function(err, queuedLink) {
        searchLink = queuedLink;
        expect(queuedLink.uri).to.not.be.null;
        expect(queuedLink.queued.categories.length > 0).to.be.true;
        expect(queuedLink.queued.categories[0]).to.equal(testTag);
        queuedTotal = queuedLink.total;
        expect(queuedTotal > 0).to.true;
        done();
      }, 1);
    }, 1100);
  });


  it('should have less queued links', function(done) {
    search.getQueuedLink(function(err, queuedLink) {
      expect(queuedTotal === queuedLink.total + 1);
      done();
    }, 0);

  });
});

