resultViews.treemap = {
  render: function(dest, results) {

    var data = results.hits.hits.map(function(r) {
      return r._source;
    });
console.log('D',data);
    var visualization = d3plus.viz()
      .container(dest)
      .data(data)
      .type('tree_map')
      .id(['annotations','uri'])
      .size('value')
      .draw();
  },
  annotations: '*'
}
