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
      var rannos = contentLib.replaceThenMergeAnnotations(_.cloneDeep(annos), _.cloneDeep(nannos));
      expect(rannos.length).to.be(3);
      expect(rannos[1].value).to.be('test value 2');
      expect(rannos[1].state).to.be(unvalidated);
    });

    it('should process with needsValidation false', function() {
      GLOBAL.svc.auth.getUserByUsername = function(annotatedBy) {
        return { needsValidation: false };
      };
      var rannos = contentLib.replaceThenMergeAnnotations(_.clone(annos), _.cloneDeep(nannos));
      expect(rannos.length).to.be(3);
      expect(rannos[1].value).to.be('test value 2');
      expect(rannos[1].state).to.be(validated);
    });
  });

  describe('should compare content', function() {
    var ci = annoLib.createContentItem({ title: 'original title', uri: 'http://test.com', queued : { lastAttempt: '2015-01-17T21:18:35.189Z' }} );

    it('should find no difference in an unchanged versions', function(done) {
      var original = _.cloneDeep(ci), same = _.cloneDeep(ci);
      var diff = contentLib.diffContentItems(original, same);
      expect(diff).to.be(undefined);
      done();
    });
    it('should find no difference with a new visitor', function(done) {
      var original = _.cloneDeep(ci), visited = _.cloneDeep(ci);
      visited.visitors.push({ member: "test", mode: "test", timestamp: "2015-01-17T16:27:48.467Z" });
      var diff = contentLib.diffContentItems(original, visited);
      expect(diff).to.be(undefined);
      done();
    });
    it('should find a difference with an added annotation', function(done) {
      var original = _.cloneDeep(ci), added = _.cloneDeep(ci);
      added.annotations.push(annoLib.createAnnotation({hasTarget: 'http://test', annotatedBy: 'test', type: 'value', key: 'test key', value: 'test value 1', state: unvalidated}));

      var diff = contentLib.diffContentItems(original, added);
      expect(diff).to.not.be(undefined);
      expect(diff.length).to.be(1);
      expect(diff[0].kind).to.equal('A');
      expect(diff[0].path).to.eql(['annotations']);
      done();
    });
    it('should find a difference with a changed annotation', function(done) {
      var original = _.cloneDeep(ci), changed = _.cloneDeep(ci);
      original.annotations.push(annoLib.createAnnotation({hasTarget: 'http://test', annotatedBy: 'test', type: 'value', key: 'test key', value: 'test value 1', state: unvalidated}));
      changed.annotations.push(annoLib.createAnnotation({hasTarget: 'http://test', annotatedBy: 'test', type: 'value', key: 'test key', value: 'test value 1', state: validated}));
      var diff = contentLib.diffContentItems(original, changed);
      expect(diff).to.not.be(undefined);
      expect(diff.length).to.be(1);
      expect(diff[0].kind).to.equal('E');
      expect(diff[0].path).to.eql([ 'annotations', 0, 'state' ]);
      done();
    });
  });

});
