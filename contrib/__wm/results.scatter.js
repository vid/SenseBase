'use strict';

var utils = require('./clientUtils');
exports.render = function(dest, results) {

  $(dest).append('<svg>');
  nv.addGraph(function() {
    var chart = nv.models.scatterChart()
      .showDistX(true)    //showDist, when true, will display those little distribution lines on the axis.
      .showDistY(true)
      .transitionDuration(350)
      .color(d3.scale.category10().range());

    //Configure how the tooltip looks.
    chart.tooltipContent(function(key, x, y, e, graph) {
      var sel= utils.encID(e.point.data.uri);
      return '<h3>' + e.point.data.title + '</h3>';
    });

    //Axis settings
//    chart.xAxis.tickFormat(d3.format('.02f'));
    chart.xAxis.tickFormat(function(d) { return d3.time.format('%b %d')(new Date(d)); })
    chart.yAxis.tickFormat(d3.format('.02f'));

    //We want to show shapes other than circles.
    chart.scatter.onlyCircles(false);

    var myData = resultsData(['timestamp'], results);
    d3.select(dest + ' svg')
      .datum(myData)
      .call(chart);

    nv.utils.windowResize(chart.update);

    return chart;
  });
}


function resultsData(fields, results) { //# groups,# points per group
  var data = [],
    shapes = ['circle', 'cross', 'triangle-up', 'triangle-down', 'diamond', 'square'],
    random = d3.random.normal();

  fields.forEach(function(field) {
    var cur = { key : field, values : [] };

    for (j = 0; j < results.hits.hits.length; j++) {
      var hit = results.hits.hits[j]._source;
      if (hit.annotationSummary) {
        var annos = hit.annotationSummary.validated + hit.annotationSummary.unvalidated + 1;
        var annosVal = hit.annotationSummary.validated + 1;
      } else {
        annos = 1;
        annosVal = 1;
      }
      annos = random(); //FIXME

      cur.values.push({
        x: new Date(hit[field]),
        y: annos,
        data: hit,
        size: annosVal,   //Configure the size of each scatter point
        shape: "circle"  //Configure the shape of each scatter point.
      });
    }
    data.push(cur);
  });

  return data;
}
