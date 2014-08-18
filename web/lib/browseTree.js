// ### browseTreemap
/*jslint browser: true */
/*jslint node: true */
/* global $,d3 */

'use strict';

var utils = require('./clientUtils');

exports.render = function(results, target, resultView) {
  console.log(results.annotationOverview);
  $(target).jstree({ 'core' : {
    'data' :  results.annotationOverview
} });
};
