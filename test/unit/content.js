// test auth methods
/*jslint node: true */
/* global describe, it */

'use strict';
var expect = require('expect.js');
var contentLib = require('../../lib/content.js'), annoLib = require('../../lib/annotations.js'), utils = require('../../lib/utils.js');
var validated = utils.states.annotations.validated, unvalidated = utils.states.annotations.unvalidated;

describe('Content', function(){
  var testGlobal;
  it('should replaceThenMergeAnnotations', function() {
    var annos =  [
      annoLib.createAnnotation({hasTarget: 'http://test', annotatedBy: 'test', type: 'value', key: 'test key', value: 'test value 1', state: unvalidated}),
      annoLib.createAnnotation({hasTarget: 'http://test', annotatedBy: 'test', type: 'value', key: 'test key', value: 'test value 2', state: unvalidated})
    ];
    var nannos =  [
      annoLib.createAnnotation({hasTarget: 'http://test', annotatedBy: 'test', type: 'value', key: 'test key', value: 'test value 2', state: validated}),
      annoLib.createAnnotation({hasTarget: 'http://test', annotatedBy: 'test', type: 'value', key: 'test key', value: 'test value 3', state: validated}),
    ];

    annos = contentLib.replaceThenMergeAnnotations(annos, nannos);
    expect(annos.length).to.be(3);
    expect(annos[1].value).to.be('test value 2');
    expect(annos[1].state).to.be(validated);
  });
});
