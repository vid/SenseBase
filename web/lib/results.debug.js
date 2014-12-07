// ### results.debug
/*jslint browser: true */
/*jslint node: true */
/* global $ */

'use strict';

exports.render = function(dest, res) {
  var res = res.results;
  $(dest).html(Math.round(JSON.stringify(results, null, 2).length / 1024) + 'k\n<pre>' + JSON.stringify(results, null, 2) + '</pre>');
};
