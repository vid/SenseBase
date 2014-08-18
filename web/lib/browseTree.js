// ### browseTreemap
/*jslint browser: true */
/*jslint node: true */
/* global $,d3 */

'use strict';

exports.render = function(results, target, resultView) {
  $(target).jstree({ 'core' : {
    'data' :  results.annotationOverview
  } }).jstree('open_all');

};
