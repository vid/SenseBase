// ### browseTree
/*jslint browser: true */
/*jslint node: true */
/* global $,d3 */

'use strict';

exports.render = function(target, results, resultView) {
  $(target).jstree({ 'core' : {
    'data' :  results.annotationOverview
  } }).jstree('open_all');

};
