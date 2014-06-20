var browseAnnotations = {
  doTreemap : function(results, target) {
    $(target).addClass('treemap');
    $(target).html('');
    var root = { name : 'Annotations', size: 1, children: []
    };
    // build a size of hierarchical annotations
    results.hits.hits.forEach(function(hit) {
      (hit._source.annotations || []).forEach(function(anno) {
        // for each start at the root
        var last = root;
        // iterate through its annotations
        anno.position.forEach(function(p) {
          var cur;
          // find its parent
          last.children.forEach(function(c) {
            if (c.name === p) {
              cur = c;
              return;
            }
          });
          // or create it
          if (!cur) {
            last.children.push({name: p, uri: 'http://', size: 1, children: []});
            cur = last.children[last.children.length - 1];
          }
          // increment its instances
          cur.size += 1;
          // use it as the basis for the cur up
          last = cur;
        });
      });
    });
    //$('#results').html('<pre>' + JSON.stringify(root, null, 2) + '</pre>');

    var $target = $(target), 
       w = $target.innerWidth(),
      h = $target.innerHeight(),
      x = d3.scale.linear().range([0, w]),
      y = d3.scale.linear().range([0, h]);

  var vis = d3.select(target).append("div")
      .attr("class", "chart")
      .style("width", w + "px")
      .style("height", h + "px")
    .append("svg:svg")
      .attr("width", w)
      .attr("height", h);

  var div = d3.select("body").append('div')   
    .attr("class", "tooltip")               
    .style("opacity", 0);

  var partition = d3.layout.partition()
      .value(function(d) { return d.size; });

    var g = vis.selectAll("g")
        .data(partition.nodes(root))
      .enter().append("svg:g")
        .attr("transform", function(d) { return "translate(" + x(d.y) + "," + y(d.x) + ")"; })
        .on('mouseover', function(d) {
          div.transition()        
            .duration(200)      
            .style("opacity", .9);      
            div.html(d.name + ' (' + (d.children ? d.children.length + ' sub' : d.size + ' members') + ')')
              .style("left", (d3.event.pageX) + "px")     
              .style("top", (d3.event.pageY - 28) + "px");    
          })          
        .on('mouseout', function(d) {
          div.transition()        
            .duration(500)      
            .style("opacity", 0);   
        })
        .on("click", click);

    var kx = w / root.dx,
      ky = h / 1;

    g.append("svg:rect")
      .attr("width", root.dy * kx)
      .attr("height", function(d) { return d.dx * ky; })
      .attr("class", function(d) { return d.children ? "parent" : "child"; });

    g.append("svg:text")
      .attr("transform", transform)
      .attr("dy", ".35em")
      .style("opacity", function(d) { return d.dx * ky > 12 ? 1 : 0; })
      .text(function(d) { return d.name; })

/*
    d3.select(window)
      .on("click", function() { click(root); })
*/

    function click(d) {
      if (!d.children) return;

      kx = (d.y ? w - 40 : w) / (1 - d.y);
      ky = h / d.dx;
      x.domain([d.y, 1]).range([d.y ? 40 : 0, w]);
      y.domain([d.x, d.x + d.dx]);

      var t = g.transition()
          .duration(d3.event.altKey ? 7500 : 750)
          .attr("transform", function(d) { return "translate(" + x(d.y) + "," + y(d.x) + ")"; });

      t.select("rect")
          .attr("width", d.dy * kx)
          .attr("height", function(d) { return d.dx * ky; });

      t.select("text")
          .attr("transform", transform)
          .style("opacity", function(d) { return d.dx * ky > 12 ? 1 : 0; });

      d3.event.stopPropagation();
    }

    function transform(d) {
      return "translate(8," + d.dx * ky / 2 + ")";
    }
  }
}


