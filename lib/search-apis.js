// api type searchers


var utils = require('./utils');

// determine type at call time
exports.exec = function(api, context, callback) {
// NCBI pubmed api
  if (api === 'entrez.esearch') {
    var queryURI = 'http://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=' + context.query.replace(' ', '%20') + '&retmode=json&retmax=' + context.targetResults;
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
