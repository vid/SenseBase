// # Bing's api searcher
//
// adapted from https://github.com/goferito/node-bing-api
/*jslint node: true */

'use strict';

var request = require('request'),
url = require('url'),
_ = require('lodash'),
qs = require('querystring');

var config = {
  //Bing Search API URI
  rootUri: "https://api.datamarket.azure.com/Bing/Search/",
  //Account Key
  accKey: null,
  //Bing UserAgent
  userAgent: 'Sensebase bing client',
  //Request Timeout
  reqTimeout: 5000,
  // Number of results (limited to 50 by API)
  top: 50,
  // Number of skipped results (pagination)
  skip: 0
};

exports.search = function(api, context, callback) {
  if (!checkApiKey('bing')) {
    callback({'bing.web' : 'missing api key'});
    return;
  }
  var options = _.extend(config, { top: context.targetResults, accKey: GLOBAL.config.apis.bing });
  var method = (api === 'bing.web' ? search : news);
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
};

function search(query, callback, options) {
  searchVertical(query, 'Web', callback, options);
}

function images(query, callback, options) {
  searchVertical(query, 'Image', callback, options);
}

function news(query, callback, options) {
  searchVertical(query, 'News', callback, options);
}

function searchVertical(query, vertical, callback, options) {
  if(typeof callback != 'function') {
    throw "Error: Callback function required!";
  }

  var opts = options;

  if (options !== null) {
    opts = _.extend(config, options);
  }

  var reqUri = opts.rootUri + vertical + "?$format=json&" + qs.stringify({ "Query": "'" + query + "'" }) + "&$top=" + opts.top + "&$skip=" + opts.skip;

  request({
    uri: reqUri,
    method: opts.method || "GET",
    headers: {
      "User-Agent": opts.userAgent
    },
    auth: {
      user: opts.accKey,
      pass: opts.accKey
    },
    timeout: opts.reqTimeout

  }, function(err, res, body) {

    // Parse body, if body
    try {
      body = typeof body === 'string' ? JSON.parse(body) : body;
      callback(err, res, body, reqUri);
    } catch (e) {
      GLOBAL.error('bing body parsing failed', body);
      callback(e);
    }
  });
}

// Check if an API key exists, return false if not
function checkApiKey(key) {
  if (!GLOBAL.config.apis || !GLOBAL.config.apis[key]) {
    GLOBAL.error('no GLOBAL.config.apis.bing');
    return false;
  }
  return true;
}
