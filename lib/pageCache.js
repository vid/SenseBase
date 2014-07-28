// pluggable caching for proxy
'use strict';

var fs = require('fs');
var url = require('url');

exports.cache = function(uri, referer, isHTML, content, contentType, headers, browser_request) {
  var fileName = cacheLoc(browser_request.url);

  if (!contentType) { GLOBAL.debug('missing contentType', browser_request.url); contentType = "text/text"; }

  if (fileName.length < 220) {
//    GLOBAL.debug('caching', uri, browser_request.encoding);
    fs.writeFile(cacheLoc(browser_request.url), content, browser_request.encoding, function(err) {
      if (err) {
        GLOBAL.debug(err);
      }
    });

    fs.writeFile(fileName + ".headers.json", JSON.stringify(headers), function(err) {
      if (err) {
        GLOBAL.debug('\nError writing header', err);
      }
    });
  }
}

exports.isCached = function(url) {
  return fs.existsSync(cacheLoc(url) + '.headers.json');
}

exports.get = function(url, callback) {
  try {
    var received = require(cacheLoc(url) + ".headers.json");
  } catch (e) {
    GLOBAL.error('pageCache', e);
    callback(e);
  }
  GLOBAL.debug("got cached " + url);

  var pageBuffer = fs.readFile(cacheLoc(url), function(err, pageBuffer) {
    callback(null, received, pageBuffer.toString());
  });
}

function cacheLoc(page) {
  return GLOBAL.config.CACHE_DIR + encodeURIComponent(page);
}

