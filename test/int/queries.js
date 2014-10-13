// # saved-query
/*jslint node: true */
/* global describe,it */
'use strict';

var _ = require('lodash'), expect = require("expect.js");

var annotations = require('../../lib/annotations.js'), testApp = require('../lib/test-app.js'), utils = require('../../lib/utils.js');

var splitYear = new Date(2003, 5, 15), dateField, beforeDateQuery, afterDateQuery, beforeResults, afterResults;

describe('Queries', function(done) {
  it('should reset test app', function(done) {
    testApp.start(function(err, ok) {
      expect(err).to.be(undefined);
      done();
    });
  });

  // save queries and content items for later tests
  it('should save sample data', function(done) {
    // create some sample data
    dateField = [GLOBAL.testing.uniqMember, GLOBAL.testing.uniq, 'testDate'];

    beforeDateQuery = {
      queryName: GLOBAL.testing.uniq + '-before',
      member: GLOBAL.testing.uniqMember,
      query: {
        annotations: ['tag0', 'tag1', 'tag2'],
      },
      filters: [ { type: 'value', position: dateField, operator: '<', value: splitYear} ]
    };
    afterDateQuery = {
      queryName: GLOBAL.testing.uniq + '-after',
      member: GLOBAL.testing.uniqMember,
      query: {
        annotations: ['tag3', 'tag4'],
      },
      filters: [
      { type: 'value', position: dateField, operator: '>', value: splitYear} ]
    };

    var c, a, cItems = [], date, name = GLOBAL.testing.uniqMember, uri, year;
    // create cItems
    for (c = 0; c < 5; c++) {
      year = 2000;
      uri = GLOBAL.testing.uniqURI + '-' + c;
      var cItem = annotations.createContentItem({title: 'test title', uri: uri, content: 'test content ' + GLOBAL.testing.uniq, annotations: []});
      // with annotations
      for (a = 0; a < 5; a++) {
        date = new Date(year++, 5, 15);
        cItem.annotations.push(annotations.createAnnotation({type: 'value', isA: 'Date', annotatedBy: name, hasTarget: uri, key: 'testDate', value: date, roots: [GLOBAL.testing.uniq]}));
      }
      cItem.annotations.push(annotations.createAnnotation({type: 'category', annotatedBy: name, hasTarget: uri, category: 'tag' + c, roots: [GLOBAL.testing.uniq]}));
      cItems.push(cItem);
    }
    GLOBAL.svc.indexer.saveContentItem(cItems, function(err, res) {
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
    utils.indexDelay(done);
  });

  it('should return all the results', function(done) {
    GLOBAL.svc.indexer.formQuery({}, function(err, res) {
      expect(err).to.be(null);
      expect(res.hits.total).to.be(5);
      GLOBAL.svc.indexer.retrieveQueries({}, function(err, res) {
        expect(err).to.be(null);
        expect(res.hits.total).to.be(2);
        done();
      });
    });
  });

  it('should perform a before filtered query', function(done) {
    GLOBAL.svc.indexer.formQuery(beforeDateQuery, function(err, res) {
      expect(err).to.be(null);
      expect(res.hits.total).to.be(3);
      expect(res.hits.hits[0].annotations).to.not.be(null);
      beforeResults = _.clone(res);
      var foundDates = 0;
      getAnnos(res).forEach(function(anno) {
        if (anno.isA === 'Date') {
          foundDates++;
          expect(anno.typed.Date < splitYear);
        }
      });
      expect(foundDates).to.be(15);
      done();
    });
  });

  it('should perform an after filtered query', function(done) {
    GLOBAL.svc.indexer.formQuery(afterDateQuery, function(err, res) {
      expect(err).to.be(null);
      expect(res.hits.total).to.be(2);
      afterResults = _.clone(res);
      var foundDates = 0;
      getAnnos(res).forEach(function(anno) {
        if (anno.isA === 'Date') {
          foundDates++;
          expect(anno.typed.Date > splitYear);
        }
      });
      expect(foundDates).to.be(10);
      done();
    });
  });

  it ('should compare two queries', function(done) {
    done();
  });
});

// get the annotations from a result set of cItems
function getAnnos(res) {
  var annos = [];
  _.pluck(res.hits.hits, '_source').forEach(function(cItem) {
    annos = annos.concat(cItem.annotations);
  });
  return annos;
}
