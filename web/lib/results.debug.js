// ### results.debug
/*jslint browser: true */
/*jslint node: true */
/* global $ */

'use strict';

exports.render = function(dest, res) {
  $(dest).html(Math.round(JSON.stringify(res, null, 2).length / 1024) + 'k\n<pre>' + JSON.stringify(res, null, 2) + '</pre>');
};
