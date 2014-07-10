// api type searchers

var qs = require('querystring');
var utils = require('./utils');

// determine type at call time
exports.exec = function(api, context, callback) {
// NCBI pubmed api
  if (api === 'entrez.esearch') {
    var queryURI = 'http://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?' + qs.stringify({
      db: 'pubmed',
      term: context.query,
      retmode:'json',
      retmax: context.targetResults
    });
    context.referers = queryURI;
    utils.retrieve(queryURI, function(err, res) {
      if (err) {
        callback(err);
      } else {
        var json = JSON.parse(res);
        json.esearchresult.idlist.forEach(function(id) {
          var uri = 'http://www.ncbi.nlm.nih.gov/pubmed/' + id;
          callback(null, uri, context);
        });
      }
    });
    // microsoft Bing api
  }
}
