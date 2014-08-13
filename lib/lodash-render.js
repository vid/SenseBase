// lodash renderer for express
//
// From https://gist.github.com/acstll/5023658

/*jslint node: true */
'use strict';

var fs = require('fs'), _ = require('lodash');

exports.renderFile = function (path, options, callback) {
  var html, template, context = options || {};

  fs.readFile(path, 'utf8', function (err, data) {
    if (err) return callback(err);

    try {
      template = _.template(data);
    } catch (err) {
      return callback(err);
    }

    html = template(context);
    callback(null, html);
  });
};
