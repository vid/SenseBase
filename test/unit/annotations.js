// test annotation types
// these tests rely on the library not throwing an exception.
/*jslint node: true */
/* global describe, it */
'use strict';

var expect = require('expect.js');
var annotations = require('../../lib/annotations.js'), annoLib = require('../../services/annotators/annotateLib');

var item = annotations.createContentItem({title: 'test title', uri: 'http://test.com/', content: 'test content'});

describe('Annotations', function(done){
  it('should create category annotation', function() {
    var annoCategory = annotations.createAnnotation({hasTarget: item.uri, annotatedBy: 'test', type: 'category', category: 'test category'});
    expect(annoCategory).to.not.be(null);
  });

  it('should create value annotation', function() {
    var annoValue = annotations.createAnnotation({hasTarget: item.uri, annotatedBy: 'test', type: 'value', key: 'test key', value: 'test value', selector: 'body'});
    expect(annoValue).to.not.be(null);
  });

  it('should create value annotation with isA', function() {
    var annoValue = annotations.createAnnotation({hasTarget: item.uri, annotatedBy: 'test', type: 'value', isA: 'Number', key: 'test key', value: 99, selector: 'body'});
    expect(annoValue.Number).to.be(99);
  });

  it('should create annoRange annotation', function() {
    var quoteRange = annotations.createRange({exact: 'quote exact', offset: 100, selector: 'body'});
    var annoRange = annotations.createAnnotation({hasTarget: item.uri, annotatedBy: 'test', type: 'quote', quote: 'test', ranges: quoteRange});
    expect(quoteRange).to.not.be(null);
  });

  it('should create valueQuote annotation', function() {
    var valueRange = annotations.createRange({exact: 'value exact', offset: 200, selector: 'body'});
    var annoValueQuote = annotations.createAnnotation({hasTarget: item.uri, annotatedBy: 'test', type: 'valueQuote', key: 'test key', value: 'test value', ranges: valueRange});
    expect(valueRange).to.not.be(null);
  });

  it('should create ranges', function() {
    var text = '<html><body>This is a match1 and a match2. Here is match1 again.</body></html>';
    var ranges = annoLib.rangesFromMatches('match1', text, 'body');
    expect(ranges).to.not.be(null);

  });
});
