// # Content tests
/*jslint node: true */
/* global describe,it */
'use strict';

var expect = require("expect.js");

var content = require('../../lib/content.js'), annotations = require('../../lib/annotations.js'), testApp = require('../lib/test-app.js'), utils = require('../../lib/utils.js');

describe('Content', function(done) {
  // used for history / version tests
  var initial, indexed, updated, initialTitle, updatedTitle;
  it('should reset test app', function(done) {
    testApp.start(function(err, ok) {
      expect(err).to.be(undefined);
      initialTitle = 'test title ' + GLOBAL.testing.uniq;
      updatedTitle = 'updated title ' + GLOBAL.testing.uniq;
      done();
    });
  });

  it('should index a queued page', function(done) {
    var desc = annotations.createContentItem({ title: initialTitle, uri: GLOBAL.testing.uniqURI, queued : { lastAttempt: new Date().toISOString() }} );
    content.indexContentItem(desc, {member: GLOBAL.testing.uniqMember, state: utils.states.content.queued}, function(err, res) {
      expect(err).to.be(null);
      expect(res._id).to.not.be(null);
      done();
    });
  });

  it('should wait a second for indexing', function(done) {
    utils.indexDelay(done);
  });

  it('should retrieve the indexed page', function(done) {
    GLOBAL.svc.indexer.retrieveByURI(GLOBAL.testing.uniqURI, function(err, r) {
      expect(err).to.be(null);
      initial = r._source;
      expect(initial).not.to.be(undefined);
      expect(initial.state).to.be(utils.states.content.queued);
      done();
    });
  });

// content & state
  it('should index an updated page with content', function(done) {
    initial.content = 'test content ' + GLOBAL.testing.uniq;
    content.indexContentItem(initial, {member: GLOBAL.testing.uniqMember}, function(err, res) {
      expect(err).to.be(null);
      done();
    });
  });

  it('should wait a second for indexing', function(done) {
    utils.indexDelay(done);
  });

  it('should retrieve the updated page with updated content', function(done) {
    GLOBAL.svc.indexer.retrieveByURI(GLOBAL.testing.uniqURI, function(err, r) {
      expect(err).to.be(null);
      indexed = r._source;
      expect(indexed).to.not.be(undefined);
      expect(indexed.state).to.be(utils.states.content.visited);
      done();
    });
  });

// title
  it('should index an updated page title', function(done) {
    indexed.title = updatedTitle;
    content.indexContentItem(indexed, {member: GLOBAL.testing.uniqMember}, function(err, res) {
      expect(err).to.be(null);
      done();
    });
  });

  it('should wait a second for indexing', function(done) {
    utils.indexDelay(done);
  });

  it('should retrieve the updated page with updated title', function(done) {
    GLOBAL.svc.indexer.retrieveByURI(GLOBAL.testing.uniqURI, function(err, r) {
      expect(err).to.be(null);
      updated = r._source;
      expect(updated).to.not.be(undefined);
      expect(updated.title).to.equal(updatedTitle);
      done();
    });
  });

  it('should find the difference in the changed versions', function(done) {
    var diff = content.diffContentItems(updated, updated);
    expect(diff.length).to.equal(0);
    diff = content.diffContentItems(initial, updated);
    expect(diff).to.not.be(undefined);
    expect(diff.length).to.equal(5);
    done();
  });

});
