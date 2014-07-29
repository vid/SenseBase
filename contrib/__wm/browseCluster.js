// ### browseAnnotations

'use strict';

var utils = require('./clientUtils');

exports.selectCluster = function(d) {
  var docs = d3.event.target.__data__.documents;
  docs.forEach(function(uri) {
    $('input[name=cb_' + utils.encID(uri) + ']').prop('checked', 'true');
  });
  // update selected count
  resultView.checkSelected();
}
exports.doTreemap = function(data, target) {
  $(target).removeClass('treemap');
  data.forEach(function(d) {
    d.size = d.documents.length;
  });

  var visualization = d3plus.viz()
    .container(target)  // container DIV to hold the visualization
    .data(data)  // data to use with the visualization
    .type('tree_map')   // visualization type
    .id('label')         // key for which our data is unique on
    .text('label')       // key to use for display text
    .size('size')      // sizing of blocks
    .draw();             // finally, draw the visualization!
  d3.select(target).on('click', this.selectCluster);
}

