// # saved-query
/*jslint node: true */
/* global describe,it */
'use strict';

var expect = require("expect.js");

var annotations = require('../../lib/annotations.js'), testApp = require('../lib/test-app.js'), utils = require('../../lib/utils.js');


var dateField, beforeDateQuery, afterDateQuery;

describe('Indexer', function(done) {
  it('should reset test app', function(done) {
    testApp.start(function(err, ok) {
      expect(err).to.be(null);

      dateField = [GLOBAL.testing.uniq, 'testDate', 'typed', 'Date'].join(annotations.uniqSep);

      beforeDateQuery = { queryName: GLOBAL.testing.uniq, filters: [
        { dateField : '< June 15, 2005'}
      ]};
      afterDateQuery = { queryName: GLOBAL.testing.uniq, filters: [
        { dateField : '< June 15, 2005'}
      ]};

      done();
    });
  });

  // save queries and content items for later tests
  it('should save sample data', function(done) {
    // create some sample data
    var annoRows = [], date, name = GLOBAL.testing.uniqMember, uri = GLOBAL.testing.uniqURI, year = 2000;
    for (var i = 0; i < 10; i++) {
      date = new Date(year++, 5, 15);
      annoRows.push(annotations.createAnnotation({type: 'value', isA: 'Date', annotatedBy: name, hasTarget: uri, key: 'testDate', value: date, roots: [GLOBAL.testing.uniq]}));
    }
    var cItem = annotations.createContentItem({title: 'test title', uri: GLOBAL.testing.uniqURI, content: 'test content ' + GLOBAL.testing.uniq});
    cItem.visitors = { member: GLOBAL.testing.uniqMember};
    GLOBAL.svc.indexer.saveContentItem(cItem, function(err, res) {
      expect(err).to.be(null);
      GLOBAL.svc.indexer.saveQuery(beforeDateQuery, function(err, res) {
        expect(err).to.be(null);
        GLOBAL.svc.indexer.saveQuery(afterDateQuery, function(err, res) {
          expect(err).to.be(null);
          done();
        });
      });
    });
  });

  it('should wait a second for indexing', function(done) {
    utils.indexDelay(function() {
      done();
    });
  });

  it('should return all the results', function(done) {
    done();
  });

  it('should include multiple categories in a query', function(done) {
    done();
  });

  it('should query by date range', function(done) {
    done();
  });

  it ('should compare two queries', function(done) {
    done();
  });
});
