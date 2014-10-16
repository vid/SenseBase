// ### browseFacet
/*jslint browser: true */
/*jslint node: true */
/* global $,d3 */

'use strict';

exports.render = function(target, results, resultView, context) {
  var $target = $(target);
  var v = JSON.stringify(results, null, 2);
  $target.html(Math.round(v.length / 1024) + 'k\n<pre>' + v + '</pre>');
};
