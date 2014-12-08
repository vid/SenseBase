// ### browseCluster
/*jslint browser: true */
/*jslint node: true */
/* global $,d3plus,d3 */

'use strict';

var utils = require('./clientUtils');

exports.render= function(target, results, context) {
  var data = results.clusters;
  $(target).removeClass('treemap');
  data.forEach(function(d) {
    d.size = d.documents.length;
  });

  var visualization = d3plus.viz()
    .container(target)
    .data(data)
    .type('tree_map')
    .id('label')         // key for which our data is unique on
    .text('label')       // key to use for display text
    .size('size')      // sizing of blocks
    .draw();

  d3.select(target).on('click', function(d) {
    // select selected items
    var docs = d3.event.target.__data__.documents;
    docs.forEach(function(uri) {
      context.resultsLib.select(uri);
    });
    // update selected count
  });
};
