'use strict';
 
// lodash renderer
//
// From https://gist.github.com/acstll/5023658

var fs = require('fs'), _ = require('lodash');
 
var cache = Object.create(null);
 
exports.renderFile = function (path, options, callback) {
  var html, template, context = options || {};
 
  if (cache[path]) {
    html = cache[path](context);
    return callback(null, html);
  }
  
  fs.readFile(path, 'utf8', function (err, data) {
    if (err) return callback(err);
 
    try {
      template = _.template(data);
    } catch(err) {
      return callback(err);
    }
 
    cache[path] = template;
    html = template(context);
    callback(null, html);
  });
};
