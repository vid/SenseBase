// api type searchers
/*jslint node: true */

'use strict';

var searchers = {};

require('fs').readdirSync(__dirname + '/apis/').forEach(function(file) {
  if (file.match(/.+\.js/g) !== null && file !== 'index.js') {
    var name = file.replace('.js', '');
    searchers[name] = require(__dirname + '/apis/' + file);
  }
});

// determine type at call time
exports.exec = function(api, context, callback) {
  var queryURI, processed = false;
  var searcher = searchers[api.replace(/\..*/, '')];
  if (searcher) {
    searcher.search(api, context, callback);
  } else {
    callback({ 'api not processed' : api});
  }
};
