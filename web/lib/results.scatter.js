// ### results.scatter
/*jslint browser: true */
/*jslint node: true */
/* global $,d3,d3plus */
'use strict';

exports.render = render;

function render(dest, res) {
  $('.select').hide();
  $('.axis').show();
  $('.selected.axis').on('change', function() { render(dest, res); });
  var xAxis = $('#selectX').val();
  var yAxis = $('#selectY').val();

  var results = res.results;
  $(dest).html('<div id="results-scatter" style="width: 96%"></div>');
  // instantiate d3plus
  var data = [];
  for (var j = 0; j < results.hits.hits.length; j++) {
    var hit = results.hits.hits[j]._source;
    var point = { title: hit.title };

    if (xAxis) {
      point.x = setAxis(xAxis, hit);
    } else {
      point.x = new Date(hit.timestamp).getTime();
    }
    if (yAxis) {
      point.y = setAxis(yAxis, hit);
    } else {
      if (hit.annotationSummary) {
        point.y = hit.annotationSummary.validated + hit.annotationSummary.unvalidated + 1;
      } else {
        point.y = 1;
      }
    }
    data.push(point);
  }

  console.log('viz data', 'xAxis', xAxis, 'yAxis', yAxis, data);
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

function setAxis(axis, hit, def) {
  for (var i = 0; i < hit.fields.length; i++) {
    var v = hit.fields[i];
    if (v.flattened.indexOf(axis) === 0) {
      var val;
      if (v.typed) {
        val = v.typed.Number || new Date(v.typed.Date).getTime();
      } else {
        val = parseInt(v.value || (v.category ? v.category[v.category.length - 1] : null), 10) || 0;
      }
      if (val) {
        console.log('returning', val, axis);
        return val;
      }
    }
  }
  return def;
}

function xvalue(i) {
  return new Date(i.x).getTime();
}
