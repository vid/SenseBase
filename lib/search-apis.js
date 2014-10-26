// api type searchers
/*jslint node: true */

'use strict';

var qs = require('querystring');
var utils = require('./utils');

// determine type at call time
exports.exec = function(api, context, callback) {
  var queryURI;
// NCBI pubmed api
  if (api === 'entrez.esearch') {
    queryURI = 'http://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?' + [
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
    // microsoft Bing web search
  } else if (api === 'bing.web' || api === 'bing.news') {
    if (!checkApiKey('bing')) {
      callback({'bing.web' : 'missing api key'});
      return;
    }
    var options = { top: context.targetResults };
    var Bing = require('./apis/bing').init({ accKey: GLOBAL.config.apis.bing });
    var method = (api === 'bing.web' ? Bing.search : Bing.news);
    method(context.query, function(err, res, body, reqURI) {
      context.referers = [reqURI];
      if (err) {
        callback(err);
      } else {
        var json = body;
        if (json.d.results) {
          (json.d.results || []).forEach(function(result) {
            callback(null, result.Url, context);
          });
        }
      }
    }, options);
  } else {
    callback({ 'unknown api' : api});
  }
};

// Check if an API key exists, return false if not
function checkApiKey(key) {
  if (!GLOBAL.config.apis || !GLOBAL.config.apis[key]) {
    GLOBAL.error('no GLOBAL.config.apis.bing');
    return false;
  }
  return true;
}
