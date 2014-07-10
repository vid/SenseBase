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
    // microsoft Bing web search
  } else if (api === 'bing.web') {
    var queryURI = 'http://api.bing.net/json.aspx?'  + qs.stringify({
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
          json.SearchResponse.Web.Results.forEach(function(result) {
            callback(null, result.Url, context);
          });
        }
      }
    });
    // microsoft bing news search
  } else if (api === 'bing.news') {
    console.log('Q', context.query);
    var queryURI = 'http://api.bing.net/json.aspx?'  + qs.stringify({
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
        console.log(json, queryURI);
        if (json.SearchResponse.News) {
          json.SearchResponse.News.Results.forEach(function(result) {
            callback(null, result.Url, context);
          });
        }
      }
    });
  }
}
