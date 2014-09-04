// # extract-mesh
// extract relevant MeSH data from mock file
// FIXME use mock data
/*jslint node: true */
/* global describe, it */

'use strict';

var _ = require('lodash'), expect = require("expect.js");

var sites = require(process.cwd() + '/lib/sites.js'), siteRequests = require(process.cwd() + '/lib/site-requests.js');
GLOBAL.config = require('../lib/test-config.js').config;

describe('addRequest annotator', function(done) {
  it('Extracts MeSH dates and headings', function(done) {
    siteRequests.processFound('http://www.ncbi.nlm.nih.gov/pubmed/23131826', function(err, res) {
      expect(err).to.be(null);
      expect(res.annoRows).to.not.be(null);
      var annoGroups = _.groupBy(res.annoRows, 'type');
      expect(annoGroups.category.length).to.be(39);
      expect(annoGroups.value.length).to.be(4);
      console.log(annoGroups);
      done();
    });
  });
});
