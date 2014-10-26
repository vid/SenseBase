// adapted from https://github.com/goferito/node-bing-api

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


/**
 * @param {Object} options  Options to all Bing calls, allows overriding of
 *        rootUri, accKey (Bing API key), userAgent, reqTimeout
 * @returns {Bing}
 * @constructor
 */
 exports.init = function(options) {
  //merge options passed in with defaults
  config = _.extend(config, options);
  return this;
}

function searchVertical(query, vertical, callback, options) {
  if(typeof callback != 'function') {
    throw "Error: Callback function required!";
  }

  var opts = options;

  if (options !== null) {
    opts = _.extend(config, options);
  }

  var reqUri = opts.rootUri
   + vertical
   + "?$format=json&"
   + qs.stringify({ "Query": "'" + query + "'" })
   + "&$top=" + opts.top
   + "&$skip=" + opts.skip;

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
    body = typeof body === 'string'
             ? JSON.parse(body)
             : body;

    callback(err, res, body, reqUri);
  });
}

/**
 * @callback requestCallback
 * @param {String} error     Error evaluates to true when an error has occurred.
 * @param {Object} response  Response object from the Bing call.
 * @param {Object} body      JSON of the response.
 */


/**
 * Performs a Bing search in the Web vertical.
 *
 * @param {String} query              Query term to search for.
 *
 * @param {requestCallback} callback  Callback called with (potentially
 *                                    json-parsed) response.
 *
 * @param {Object} options            Options to command, allows overriding
 *                                    of rootUri, accKey (Bing API key),
 *                                    userAgent, reqTimeout, top, skip
 * @function
 */
exports.search = function(query, callback, options) {
  searchVertical(query, 'Web', callback, options);
};


/**
 * Performs a Bing search in the Images vertical.
 *
 * @param {String} query              Query term to search for.
 *
 * @param {requestCallback} callback  Callback called with (potentially
 *                                    json-parsed) response.
 *
 * @param {Object} options            Options to command, allows overriding of
 *                                    rootUri, accKey (Bing API key),
 *                                    userAgent, reqTimeout, top, skip
 * @function
 */
exports.images = function(query, callback, options) {
  searchVertical(query, 'Image', callback, options);
};

/**
 * Performs a Bing search in the News vertical.
 *
 * @param {String} query              Query term to search for.
 *
 * @param {requestCallback} callback  Callback called with (potentially
 *                                    json-parsed) response.
 *
 * @param {Object} options            Options to command, allows overriding of
 *                                    rootUri, accKey (Bing API key),
 *                                    userAgent, reqTimeout, top, skip
 * @function
 */
exports.news = function(query, callback, options) {
  searchVertical(query, 'News', callback, options);
};
