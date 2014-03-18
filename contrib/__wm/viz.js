
function getClusterData(viz) {
var $progress = $('#viz');
var query = '*', algorithm = 'lingo';
var host = 'http://dashboard.fg.zooid.org:9200';
  var request = {
              "search_request": {
                "fields": [ "uri", "title", "content" ],
                "query": {
                  "query_string": { "query": "*" }
                },
                "size": 10000
              },

              "query_hint": "*",
              "algorithm": "lingo",
              "field_mapping": {
                "title": ["fields.title"],
                "content": ["fields.content"],
                "url": ["fields.uri"]
              }
            };
  $progress.text("loading...");
  $.post(host + "/ps/contentItem/_search_with_clusters",
    JSON.stringify(request), function (result) {
console.log(result.clusters);
      if (result.hits.total > 0) {
        viz(result.clusters);
      } else {
        $progress.text("no results found");
      }
    });
}

function doTreemap(data) {
  var displayData = [];
  data.forEach(function(d) {
    displayData.push({ value : d.documents.length, name: d.label});
  });

  // instantiate d3plus
  var visualization = d3plus.viz()
    .container("#viz")  // container DIV to hold the visualization
    .data(displayData)  // data to use with the visualization
    .type("tree_map")   // visualization type
    .id("name")         // key for which our data is unique on
    .text("name")       // key to use for display text
    .size("value")      // sizing of blocks
    .draw();             // finally, draw the visualization!
console.log(visualization); 
}
