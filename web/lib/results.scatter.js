// ### results.scatter
/*jslint browser: true */
/*jslint node: true */
/* global $,d3,d3plus */
'use strict';

exports.render = function(dest, results) {
  $(dest).html('<div id="results-scatter" style="width: 96%"></div>');
  // instantiate d3plus
  var data = [];
  for (var j = 0; j < results.hits.hits.length; j++) {
    var hit = results.hits.hits[j]._source;
    var val = { title: hit.title, x : new Date(hit.timestamp).getTime(), y : 1};
    if (hit.annotationSummary) {
      val.y = hit.annotationSummary.validated + hit.annotationSummary.unvalidated + 1;
    }
    data.push(val);
  }

  var visualization = d3plus.viz()
    .container('#results-scatter')
    .data(data)
    .size(5)
    .type('scatter')
    .id('title')
    .x('x')
    .y('y')
    .draw();
}

function xvalue(i) {
  return new Date(i.x).getTime();
}
