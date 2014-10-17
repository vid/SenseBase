// ### results.debug
/*jslint browser: true */
/*jslint node: true */
/* global $ */

'use strict';

exports.render = function(dest, results) {
  $(dest).html(Math.round(JSON.stringify(results, null, 2).length / 1024) + 'k\n<pre>' + JSON.stringify(results, null, 2) + '</pre>');
};

exports.annotations = '*';
