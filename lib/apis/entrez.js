// nih entrez search
/*jslint node: true */

'use strict';

var utils = require('../utils');

exports.search = function(api, context, callback) {

  var queryURI = 'http://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?' + [
  'db=pubmed',
  'term=' + context.query,
  'retmode=json',
  'version=2.0',
  'retmax=' + context.targetResults
  ].join('&');
  context.referer = queryURI;
  utils.retrieve(queryURI, function(err, res) {
    if (err) {
      callback(err);
    } else {
      try {
        var json = JSON.parse(res);
        json.esearchresult.idlist.forEach(function(id) {
          var uri = 'http://www.ncbi.nlm.nih.gov/pubmed/' + id;
          callback(null, uri, context);
        });
      } catch (e) {
        GLOBAL.error('search failed', queryURI, 'parsing res', res);
        utils.passingError(e);
        callback(e);
      }
    }
  });
};
