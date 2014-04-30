// queues up pubmed pages based on an entrez esearch query
// http://www.ncbi.nlm.nih.gov/books/NBK25497/

GLOBAL.config = require('../config.js').config;
var utils = require('../lib/utils.js'), scraperLib = require('../lib/scraper');
var annotator = process.argv[1].replace(/.*\//, '');

queueEsearchResults({ scraper: annotator, terms: 'ferritin', tags: ['boo', 'bar'], validated: true, count: 5, relevance: 0, referers: []});

// queue up terms with options. NB relevance on 0 means only the pages will be scraped (no links followed)
function queueEsearchResults(options) {
  var queryURI = 'http://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=' + options.terms + '&retmode=json&retmax=' + (options.count || 10);
  utils.retrieve(queryURI, function(err, res) {
    if (err) {
      throw err;
    }
    var json = JSON.parse(res);
    json.esearchresult.idlist.forEach(function(id) {
      var uri = 'http://www.ncbi.nlm.nih.gov/pubmed/' + id;
      scraperLib.queueLink(uri, (options.relevance || 0), options.tags, (options.referers || []), options.scraper, (options.validated || false));
    });
  });
}
