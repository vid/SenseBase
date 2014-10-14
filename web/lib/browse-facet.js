// ### browseTree
/*jslint browser: true */
/*jslint node: true */
/* global $,d3 */

'use strict';

exports.render = function(target, results, resultView) {
  $(target).bind('loaded.jstree', function(event, data) {
      data.instance.open_all();
    })
    .jstree({ 'core' : {
    'data' :  results.annotationOverview
  } }).jstree('open_all');

};
