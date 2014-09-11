// # Utils
// reusable system utilities
/*jslint node: true */

'use strict';

var _ = require('lodash'), http = require('http'), https = require('https'), url = require('url');

// verify the keys are present or explode
//
exports.check = function(arr, desc) {
  arr.forEach(function(k) {
    if (desc[k] === undefined) {
      checkError(desc, k);
    }
  });
};

// notify of errors we aren't dealing with
exports.passingError = function(err) {
  if (err) {
    GLOBAL.error('uncaught error', arguments);
    console.trace();
  }
  return err;
};

exports.checkError = checkError;
exports.doPost = doPost;
exports.retrieve = retrieve;

// standard placeholder for no content
exports.NOCONTENT = 'NOCONTENT';

function checkError(desc, field) {
 throw new Error('missing field ' + field + ' from ' + JSON.stringify(desc, null, 2));
}

// return plain text from an html document
exports.getTextFromHtml = function(html) {
  return html ? html.toString().replace(/.*<\/head>/im, '').replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/mgi, '').replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/mgi,'').replace(/<[^>]*>/mg, '') : null; //FIXME
};

// escape a regex's special characters
exports.escapeRegex = function(r) {
  return (r+'').replace(/([.?*+^$[\]\\(){}|-])/g, "\\$1");
};


// HTTP functions
// TODO connection pooling, throttling http://nodejs.org/api/http.html#http_http_globalagent


// retrieve an https GET then callback content
exports.retrieveHTTPS = function(uri, callback) {
 var buffer = '';
  https.get(uri, function(res) {
    res.on('data', function(d) {
      buffer += d;
    });

    res.on('end', function(err) {
      callback(err, buffer.toString());
    }).on('error', function(e) {
      GLOBAL.error(e);
    });
  });
};

// perform a POST then callback JSON contents
exports.doPostJson = function(options, data, callback) {
  doPost(options, data, function(err, result) {
    try {
      callback(err, JSON.parse(result));
    } catch (e) {
      callback(e);
    }
  });
};

// perform a GET then callback content
function retrieve(uri, callback) {
  var buffer = '';
  http.get(uri, function(res) {
    res.on('data', function (chunk) {
      buffer += chunk;
    });
    res.on('end', function() {
      callback(null, buffer);
    });
  }).on('error', function(e) {
    callback(e);
  });
}

// perform a POST then callback contents
function doPost(options, data, callback) {
  var buffer = '';
  var req = http.request(options, function(res) {
    res.setEncoding('utf8');
    res.on('data', function (chunk) {
      buffer += chunk;
    });
    res.on('end', function(err) {
      callback(err, buffer);
    });
  }).on('error', function(e) {
    callback(e);
  });

  if (data && data.length) {
    req.write(data);
  }
  req.end();
}

// generate a unique identifier
exports.getUnique = function() {
  // FIXME replace with that nifty UUID code I saw but can't find right now
  return (new Date().getTime()).toString(16) + 'x' + Math.round(Math.random(9e9) * 9e9).toString(16);
};

exports.localUser = { username: '(localUser)' };
exports.noUser = { username: '(noUser)' };

exports.states = { annotations: { validated : 'validated', unvalidated : 'unvalidated', erased : 'erased'},
  content: { queued: 'queued', visited: 'visited', annotated: 'annotated' } };

// retrieve a link through the local proxy, which will also index it
exports.scrapeLink = function(uri, callback) {
  var host = url.parse(uri).hostname;
  var options = {
    host: 'localhost',
    port: GLOBAL.config.PROXY_PORT,
    path: uri,
    headers: {
      Host: host
    }
  };
  retrieve(options, function(err, res) {
    if (callback) {
      callback(err, res);
    }
  });
};

// Execute callback after an indexing delay
exports.indexDelay = function(callback) {
  setTimeout(callback, 1000);
};
