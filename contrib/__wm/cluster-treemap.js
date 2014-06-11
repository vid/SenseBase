// treemap element has been selected
// select document table items
function selectCluster(d) { 
  var docs = d3.event.target.__data__.documents;
  docs.forEach(function(uri) {
    $('input[name=cb_' + encID(uri) + ']').prop('checked', 'true');
  });
  // update selected count
  checkSelected();

  console.log('MM', d3.event.target.__data__.label, docs);

}
function doTreemap(data) {
  data.forEach(function(d) {
    d.size = d.documents.length;
  });

console.log(d3plus.viz);
  var visualization = d3plus.viz()
    .container("#treemap")  // container DIV to hold the visualization
    .data(data)  // data to use with the visualization
    .type("tree_map")   // visualization type
    .id("label")         // key for which our data is unique on
    .text("label")       // key to use for display text
    .size("size")      // sizing of blocks
    .draw();             // finally, draw the visualization!
}
d3.select('#treemap').on('click', selectCluster);
