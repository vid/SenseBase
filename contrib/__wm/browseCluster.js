// ### browseCluster

'use strict';

var utils = require('./clientUtils');

exports.doTreemap = function(data, target, resultView) {
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
      $('input[name=cb_' + utils.encID(uri) + ']').prop('checked', 'true');
    });
    // update selected count
    resultView.checkSelected();
  });
}

