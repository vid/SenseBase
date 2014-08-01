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
