// # search
// test search workflow
// initial doc is saved to state queue with queue: { relevance: x }
// as pages are accessed, previousState is set to last state
// if they have previousState as queue, search.queueLinks finds relevance
// if relevance is > 0, relevant page links are added
/*jslint node: true */
/* global describe,it */
'use strict';

var fs = require('fs'), expect = require('expect.js');
var search = require('../../lib/search.js'), testApp = require('../lib/test-app.js'), utils = require('../../lib/utils.js');

describe('Scraper links', function(done) {
  it('should reset test app', function(done) {
    testApp.start(function(err, ok) {
      expect(err).to.be(undefined);
      done();
    });
  });

// save a link and verify one can be retrieved after saving time
  it('should queue a link', function(done) {
    search.queueLink(GLOBAL.testing.uniqURI, {member: GLOBAL.testing.uniqMember, categories: [GLOBAL.testing.uniqCategory], relevance: 1});
    done();
  });

  it('should wait for indexing', function(done) {
    utils.indexDelay(done);
  });

  it('should retrieve a queued link', function(done) {
    // wait for link to be saved
    search.getQueuedLink(function(err, queuedLink) {
      expect(err).to.be(null);
      expect(queuedLink).to.not.be(null);
      expect(queuedLink.uri).to.not.be(undefined);
      expect(queuedLink.queued.categories.length > 0).to.be(true);
      expect(queuedLink.queued.categories[0]).to.equal(GLOBAL.testing.uniqCategory);
      done();
    }, 1);
  });


// verify not enough time has passed for a new link to be processed
  it('should have less available queued links', function(done) {
    search.getQueuedLink(function(err, queuedLink) {
      expect(queuedLink).to.be(undefined);
      done();
    }, 1);

  });
});
