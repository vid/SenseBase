// test search workflow
// initial doc is saved to state queue with queue: { relevance: 2 }
// as pages are accessed, previousState is set to last state
// if they have previousState as queue, search.queueLinks finds relevance
// if relevance is > 0, relevant page links are added
'use strict';

var fs = require('fs'), expect = require('expect.js');
var search = require('../../lib/search.js'), testApp = require('../lib/test-app.js'), utils = require('../../lib/utils.js');

var uniq = utils.getUnique(), uniqLink = 'http://test.com/' + uniq, testTag = 'tag-'+utils.getUnique(), uniqMember = 'member'+uniq;

describe('Scraper links', function(done) {
  it('should reset test app', function(done) {
    testApp.start(function(err, ok) {
      expect(err).to.be.null;
      done();
    });
  });

// save a link and verify one can be retrieved after saving time
  it('should queue a link', function(done) {
    search.queueLink(uniqLink, {member: uniqMember, categories: [testTag], relevance: 1});

    // wait for link to be saved
    setTimeout(function() {
      // find any queued link from preceeding
      search.getQueuedLink(function(err, queuedLink) {
        expect(queuedLink.uri).to.not.be.null;
        expect(queuedLink.queued.categories.length > 0).to.be.true;
        expect(queuedLink.queued.categories[0]).to.equal(testTag);
        done();
      }, 1);
    }, 1200);
  });


// verify not enough time has passed for a new link to be processed
  it('should have less available queued links', function(done) {
    search.getQueuedLink(function(err, queuedLink) {
      expect(queuedLink).to.be.null;
      done();
    }, 1);

  });
});

