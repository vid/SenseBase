// Tests for configured indexer (ElasticQuery)
/*jslint node: true */
/* global describe,it */
'use strict';

// FIXME - not starting http/pubsub properly. \:

var expect = require("expect.js");

var annotations = require('../../lib/annotations.js'), pubsub, testApp = require('../lib/test-app.js'), utils = require('../../lib/utils.js'), auth = require('../../lib/auth');

describe('pubsub-client', function(done) {
  it('should reset test app with some sample data', function(done) {
    testApp.start(function(err, ok) {
      expect(err).to.be(undefined);
      pubsub = require('../../lib/pubsub-client').init({ homepage: GLOBAL.config.HOMEPAGE, clientID: null });
      for (var i = 0; i < 20; i++) {
        var cItem = annotations.createContentItem({title: 'test title ' + i, uri: GLOBAL.testing.uniqURI + i, content: 'test content ' + GLOBAL.testing.uniq});
        cItem.visitors = [{ member: GLOBAL.testing.uniqMember}];

        GLOBAL.svc.indexer.saveContentItem(cItem, utils.passingError);
      }
      done();
    });
  });

  it('should not allow access without auth', function(done) {
    pubsub.search.subUpdated(function(res) {
      expect().fail();
    });
    // NB this is also giving time for content to index
    setTimeout(function() { done(); }, 1000);
  });

  it('should ping', function(done) {
    pubsub.ping(function(res) {
      expect(res).to.not.be(null);
      expect(res.pong).to.not.be(null);
      done();
    });
  });

  it('should login', function(done) {

    var exec = require('child_process').exec,
    child;

child = exec('nmap localhost',
  function (error, stdout, stderr) {
    console.log('stdout: ' + stdout);
    console.log('stderr: ' + stderr);
    if (error !== null) {
      console.log('exec error: ' + error);
    }
});
    pubsub.login(GLOBAL.testing.uniqMember, GLOBAL.testing.password, function(res) {
      expect(res).to.not.be(null);
      expect(res.clientID).to.not.be(null);
      done();
    });
  });

});
