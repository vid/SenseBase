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
    var token = '____';
    queryURI = 'http://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?' + qs.stringify({
      db: 'pubmed',
      term: context.query.replace(/[%20| ]/g, token),
      retmode:'json',
      version:'2.0',
      retmax: context.targetResults
    });
    queryURI = queryURI.replace(new RegExp(token, 'g'), '+');
    context.referer = queryURI;
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
    // microsoft Bing web search
  } else if (api === 'bing.web') {
    if (!checkApiKey('bing')) {
      return;
    }
    queryURI = 'http://api.bing.net/json.aspx?'  + qs.stringify({
      Appid: GLOBAL.config.apis.bing,
      query: context.query,
      sources: 'web',
      'web.count': context.targetResults,
      'web.offset': 0
    });
    context.referers = queryURI;
    utils.retrieve(queryURI, function(err, results) {
      if (err) {
        callback(err);
      } else {
        var json = JSON.parse(results);
        if (json.SearchResponse.Web) {
          (json.SearchResponse.Web.Results || []).forEach(function(result) {
            callback(null, result.Url, context);
          });
        }
      }
    });
    // microsoft bing news search
  } else if (api === 'bing.news') {
    if (!checkApiKey('bing')) {
      return;
    }
    queryURI = 'http://api.bing.net/json.aspx?'  + qs.stringify({
      Appid: GLOBAL.config.apis.bing,
      query: context.query.replace('%20', ' ').replace(' ', '___'),
      sources: 'news',
      'news.count': context.targetResults,
      'news.offset': 0
    });
    // bing news wants to see +s for spaces
    queryURI = queryURI.replace('___', '+');
    context.referers = queryURI;
    utils.retrieve(queryURI, function(err, results) {
      if (err) {
        callback(err);
      } else {
        var json = JSON.parse(results);
        if (json.SearchResponse.News) {
          json.SearchResponse.News.Results.forEach(function(result) {
            callback(null, result.Url, context);
          });
        }
      }
    });
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
