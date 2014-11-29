// # Content tests
/*jslint node: true */
/* global describe,it */
'use strict';

var expect = require("expect.js");

var content = require('../../lib/content.js'), annotations = require('../../lib/annotations.js'), testApp = require('../lib/test-app.js'), utils = require('../../lib/utils.js');
var newTitle;

describe('Content', function(done) {
  // used for history / version tests
  var ongoing;
  it('should reset test app', function(done) {
    testApp.start(function(err, ok) {
      expect(err).to.be(undefined);
      newTitle = 'updated title ' + GLOBAL.testing.uniq;
      done();
    });
  });

  it('should index a queued page', function(done) {
    var desc = annotations.createContentItem({ title: 'test title', uri: GLOBAL.testing.uniqURI, queued : { lastAttempt: new Date().toISOString() }} );
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
      var cItem = r._source;
      expect(cItem).not.to.be(undefined);
      expect(cItem.state).to.be(utils.states.content.queued);
      ongoing = cItem;
      done();
    });
  });

// content & state
  it('should index an updated page with content', function(done) {
    ongoing.content = 'test content ' + GLOBAL.testing.uniq;
    content.indexContentItem(ongoing, {member: GLOBAL.testing.uniqMember}, function(err, res) {
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
      var cItem = r._source;
      expect(cItem).to.not.be(undefined);
      expect(cItem.state).to.be(utils.states.content.visited);
      done();
    });
  });

// title
  it('should index an updated page title', function(done) {
    ongoing.title = newTitle;
    content.indexContentItem(ongoing, {member: GLOBAL.testing.uniqMember}, function(err, res) {
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
      var cItem = r._source;
      expect(cItem).to.not.be(undefined);
      expect(cItem.title).to.equal(newTitle);
      done();
    });
  });

});
