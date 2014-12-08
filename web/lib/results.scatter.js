// ### results.scatter
/*jslint browser: true */
/*jslint node: true */
/* global $,d3,d3plus */
'use strict';

exports.render = render;

function render(dest, res) {
  $('.select').hide();
  $('.axis').show();
  $('#selectY').on('change', function() { render(dest, res); });
  var yAxis = $('#selectY').val();
  console.log('yAxis', yAxis);

  var results = res.results;
  $(dest).html('<div id="results-scatter" style="width: 96%"></div>');
  // instantiate d3plus
  var data = [];
  for (var j = 0; j < results.hits.hits.length; j++) {
    var hit = results.hits.hits[j]._source;
    var point = { title: hit.title, x : new Date(hit.timestamp).getTime(), y : 1};
    if (yAxis) {
      (hit.fields || []).forEach(function(v) {
        if (v.flattened.indexOf(yAxis) === 0) {
          var val = parseInt((v.typed ? (v.typed.Number || v.typed.Date) : null) || v.value || (v.category ? v.category[v.category.length - 1] : null), 10) || 0;
          if (val) {
            point.y = val;
            console.log('using', val, yAxis);
          }
        }
      });
    } else {
      if (hit.annotationSummary) {
        point.y = hit.annotationSummary.validated + hit.annotationSummary.unvalidated + 1;
      }
    }
    data.push(point);
  }

  console.log('viz data' ,data);
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
