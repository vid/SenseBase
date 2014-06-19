resultViews.debug = {
  render: function(dest, results) {
    $(dest).html('<pre>'+JSON.stringify(results, null, 2) + '</pre>');
  },
  annotations: '*'
}
