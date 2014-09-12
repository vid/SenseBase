// # filter
// test query filtering
/*jslint node: true */
/* global describe, it */
'use strict';

var expect = require('expect.js');
var formQuery = require('../../lib/form-query.js');

describe('Filter', function(done){
  it('should filter a date', function() {
    var anno = { type: 'Date', position: ['test'], value: new Date(2005, 5, 15), isA: 'Date', typed: { Date: new Date(2005, 5, 15) } };
    var filters = [ { type: 'Date', position: ['test'], operator: '>', value: new Date(2004, 5, 15) } ]
    expect(formQuery.shouldFilter(filters, anno)).to.be(true);
  });
});
