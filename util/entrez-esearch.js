// Queues up pubmed pages based on an entrez esearch query.
// http://www.ncbi.nlm.nih.gov/books/NBK25497/
/*jslint node: true */

'use strict';

GLOBAL.config = require(__dirname + '/../config.js').config;
var utils = require('../lib/utils.js'), scraperLib = require('../lib/search');

exports.queueEsearchResults = queueEsearchResults;
exports.search = search;

// Allow command line searching.
if (process.argv[2]) {
  var term = process.argv[2], count = process.argv[3] || 1;
  console.log('queueing', term);
  search({ terms: term, count: count}, function(err, res) {
    console.log('err', err, 'res', JSON.stringify(JSON.parse(res), null, 2));
  });
}

// Queue up terms with options. NB relevance on 0 means only the pages will be scraped (no links followed).
function queueEsearchResults(options) {
  utils.retrieve(options, function(err, res) {
    if (err) {
      throw err;
    }
    var json = JSON.parse(res);
    json.esearchresult.idlist.forEach(function(id) {
      var uri = 'http://www.ncbi.nlm.nih.gov/pubmed/' + id;
      scraperLib.queueLink(uri, (options.relevance || 0), options.categories, (options.referers || []), options.scraper, (options.state || utils.states.annotations.unvalidated));
    });
  });
}

// Do the actual search.
function search(options, callback) {
  var queryURI = 'http://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=' + options.terms + '&retmode=json&retmax=' + (options.count || 10);
  utils.retrieve(queryURI, callback);
}
