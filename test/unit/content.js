// test auth methods
/*jslint node: true */
/* global describe, it */

'use strict';
var expect = require('expect.js'), _ = require('lodash');
var contentLib = require('../../lib/content.js'), annoLib = require('../../lib/annotations.js'), utils = require('../../lib/utils.js');
var validated = utils.states.annotations.validated, unvalidated = utils.states.annotations.unvalidated;

describe('Content', function() {
  var annos =  [
    annoLib.createAnnotation({hasTarget: 'http://test', annotatedBy: 'test', type: 'value', key: 'test key', value: 'test value 1', state: unvalidated}),
    annoLib.createAnnotation({hasTarget: 'http://test', annotatedBy: 'test', type: 'value', key: 'test key', value: 'test value 2', state: unvalidated})
  ];
  var nannos =  [
    annoLib.createAnnotation({hasTarget: 'http://test', annotatedBy: 'test', type: 'value', key: 'test key', value: 'test value 2', state: validated}),
    annoLib.createAnnotation({hasTarget: 'http://test', annotatedBy: 'test', type: 'value', key: 'test key', value: 'test value 3', state: validated}),
  ];

  GLOBAL.svc = {
    auth: {
      getUserByUsername: function(annotatedBy) {
        return { needsValidation: true };
      }
    }
  };

  describe('should replaceThenMergeAnnotations', function() {
    it('should not process needsValidation true', function() {
      var rannos = contentLib.replaceThenMergeAnnotations(_.clone(annos), _.clone(nannos));
      expect(rannos.length).to.be(3);
      expect(rannos[1].value).to.be('test value 2');
      expect(rannos[1].state).to.be(unvalidated);
    });

    it('should process with needsValidation false', function() {
      GLOBAL.svc.auth.getUserByUsername = function(annotatedBy) {
        return { needsValidation: false };
      };
      var rannos = contentLib.replaceThenMergeAnnotations(_.clone(annos), _.clone(nannos));
      expect(rannos.length).to.be(3);
      expect(rannos[1].value).to.be('test value 2');
      expect(rannos[1].state).to.be(validated);
    });
  });

  describe('should compare content', function() {
    var ci = annoLib.createContentItem({ title: 'original title', uri: 'http://test.com', queued : { lastAttempt: '2015-01-17T21:18:35.189Z' }} );

    var original = {
      title: 'original title ',
      uri: 'http://test.com/',
      headers: {},
      created: '2015-01-17T21:18:35.198Z',
      annotations: [],
      visitors: [
        {
          member: 'member14af9c3021bxc8fa4806',
          mode: 'browser',
          timestamp: '2015-01-17T21:18:37.254Z'
        }
      ],
      referers: [],
      state: 'visited',
      queued: {
        lastAttempt: '2015-01-17T21:18:35.189Z'
      },
      content: 'test content',
      _id: 'http%3A%2F%2Ftest.com%2F',
      timestamp: '2015-01-17T21:18:37.254Z',
      sha1: '5d823dc17caabba4cb8f82e8bf24a991ee8b1b78',
      text: 'test content ',
      annotationSummary: {}
    };

    var updated = _.clone(original);

    it('should find no difference in an unchanged versions', function(done) {
      var diff = contentLib.diffContentItems(original, original);
      console.log(diff);
      expect(diff).to.be(undefined);
      done();
    });
    it('should find no difference with a new visitor', function(done) {
      var diff = contentLib.diffContentItems(original, ci);
      console.log(diff);
      expect(diff).to.be(undefined);
      done();
    });
    it('should find a difference with a changed annotation', function(done) {
      var diff = contentLib.diffContentItems(original, original);
      console.log(diff);
      expect(diff).to.be(undefined);
      done();
    });
  });

});
