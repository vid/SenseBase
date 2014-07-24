// Tests for configured indexer (ElasticSearch)

var expect = require("expect.js");
var content = require('../../lib/content.js'), indexer = require('../../lib/indexer.js'), annotations = require('../../lib/annotations.js'), testApp = require('../lib/test-app.js'), utils = require('../../lib/utils.js');
GLOBAL.config = require('../lib/test-config.js').config;

var uniq = utils.getUnique(), uniqMember = 'member'+uniq, uniqURI = 'http://test.com/' + uniq, uniqCategory = 'category' + uniq;

describe('Content', function(done) {
  // used for history / version tests
  var ongoing;
  it('should reset test app', function(done) {
    testApp.start(function(err, ok) {
      expect(err).to.be.null;
      done();
    });
  });

  it('should index a queued page', function(done) {
    var cItem = annotations.createContentItem({title: 'test title', uri: uniqURI, state: utils.states.queued, queued : { lastAttempt: new Date().toISOString()} });
    cItem.member = uniqMember;
    content.indexContentItem(cItem, function(err, res) {
      expect(err).to.be.null;
      done();
    });
  });

  it('should retrieve the indexed page', function(done) {
    indexer.retrieveByURI(uniqURI, function(err, r) {
      expect(err).to.be.null;
      var cItem = r._source;
      expect(cItem).to.be.notnull;
      expect(cItem.state).to.be(utils.states.content.queued);
      ongoing = cItem;
      done();
    });
  });

  it('should index an updated page with content', function(done) {
    ongoing.content = 'test content ' + uniq;
    content.indexContentItem(ongoing, function(err, res) {
      expect(err).to.be.null;
      done();
    });
  });

  it('should retrieve the updated page with content', function(done) {
    indexer.retrieveByURI(uniqURI, function(err, r) {
      expect(err).to.be.null;
      var cItem = r._source;
      expect(cItem).to.be.notnull;
      expect(cItem.state).to.be(utils.states.content.visited);
      expect(cItem.history.length).to.be(1);
      expect(r)
      done();
    });
  });

});

