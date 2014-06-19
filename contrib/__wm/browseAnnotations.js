var browseAnnotations = {
  doTreemap : function(results, target) {
    $(target).addClass('treemap');
    $(target).html('');
    var root = { name : 'Annotations', count: 0, children: []
    };
    // build a count of hierarchical annotations
    results.hits.hits.forEach(function(hit) {
      (hit._source.annotations || []).forEach(function(anno) {
        // for each start at the root
        var last = root;
        // iterate through its annotations
        anno.position.forEach(function(p) {
          var next;
          // find its parent
          last.children.forEach(function(c) {
            if (c.name === p) {
              next = c;
              return;
            }
          });
          // or create it
          if (!next) {
            last.children.push({name: p, count: 0, children: []});
            console.log('\nappending', last);
            next = last.children[last.children.length - 1];
          }
          // use it as the basis for the next up
          last = next;
          console.log(p, 'next', next, 'root', root);
          last.count = last.count + 1;
        });
      });
    });
    console.log('R', root);
    var wroot = {
     "name": "Sitemap",
     "children": [
      {
       "name": "International Relations",
       "children": [
        {
         "name": "Systemic Theory",
         "children": [
          {"name": "Great Powers", "count": 3938, "url": "http://polisci.osu.edu"},
          {"name": "Systemic Politics", "count": 743, "url": "http://polisci.osu.edu"}
         ]
        },
        {
         "name": "International Conflict",
         "children": [
          {"name": "Systemic Politics", "count": 3416, "url": "http://google.com"},
          {"name": "Causal Complexity", "count": 3416, "url": "http://bing.com"},
          {"name": "Deadly Doves", "count": 3416, "url": "http://polisci.osu.edu"},
          {"name": "Politcal Irrelevance", "count": 3416, "url": "http://polisci.osu.edu"},
          {"name": "The Fog of Peace: Uncertainty, War, and the Resumption of International Crises, <i>manuscript</i>", "count": 3416, "url": "http://polisci.osu.edu"},
          {"name": "Greed or Opportunity? Refining our Understanding of the Origins of Civil Wars, <i>manuscript</i>", "count": 3416, "url": "http://polisci.osu.edu"}
         ]
        },
        {
         "name": "Foreign Policy",
         "children": [
          {"name": "The Myth of American Isolationism", "count": 3416, "url": "http://polisci.osu.edu"}
         ]
        },
        {
         "name": "Courses",
         "children": [
          {"name": "IS 201", "count": 3416, "url": "http://polisci.osu.edu"},
          {"name": "PS 544", "count": 3416, "url": "http://polisci.osu.edu"},
          {"name": "PS 848", "count": 3416, "url": "http://polisci.osu.edu"}      
         ]
        },
        {
         "name": "Dataverse",
         "children": [
          {"name": "Dataverse", "count": 3416, "url": "http://polisci.osu.edu"}
         ]
        }
       ]
      },
      {
       "name": "Political Methodology",
       "children": [
        {
         "name": "Theory and Methdology",
         "children": [
          {"name": "Interactions and Causal Complexity", "count": 3938, "url": "http://polisci.osu.edu"},
          {"name": "Theory and Methodology", "count": 743, "url": "http://polisci.osu.edu"},
          {"name": "Software", "count": 743, "url": "http://polisci.osu.edu"},
          {"name": "Courses", "count": 743, "url": "http://polisci.osu.edu"}
         ]
        },
        {
         "name": "Insteractions and Causal Cmplexity",
         "children": [
          {"name": "Hypothesis Testing and Multiplicative Interation Terms", "count": 3938, "url": "http://polisci.osu.edu"},
          {
            "name": "Causal Complexity",
            "children": [
             {"name": "Causal Complexity and the Study of Politics", "count": 3938, "url": "http://polisci.osu.edu"},
             {"name": "Political Irrelevance", "count": 743, "url": "http://polisci.osu.edu"},
             {"name": "boolean3 package for R", "count": 743, "url": "http://polisci.osu.edu"}
            ]
          }
         ]
        },
        {
         "name": "Software",
         "children": [
          {"name": "boolean3 package for R", "count": 3938, "url": "http://polisci.osu.edu"}
         ]
        },
        {
         "name": "Courses",
         "children": [
          {"name": "PS 4781", "count": 3938, "url": "http://polisci.osu.edu"},
          {"name": "PS 867", "count": 743, "url": "http://polisci.osu.edu"},
          {"name": "PS 846", "count": 743, "url": "http://polisci.osu.edu"}
         ]
        }
       ]
      }
     ]
    };

    var $target = $(target);
    var margin = {top: 20, right: 0, bottom: 0, left: 0},
        width = $target.width(),
        height = $target.height(),
        formatNumber = d3.format(",d"),
        transitioning;

    var x = d3.scale.linear()
        .domain([0, width])
        .range([0, width]);

    var y = d3.scale.linear()
        .domain([0, height])
        .range([0, height]);

    var treemap = d3.layout.treemap()
        .value(function(d) {return d.count})
        .children(function(d, depth) { return depth ? null : d._children; })
        .sort(function(a, b) { console.log(a.count); return a.count - b.count; })
        .ratio(height / width * 0.5 * (1 + Math.sqrt(5)))
        .round(false);

    var svg = d3.select(target).append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.bottom + margin.top)
        .style("margin-left", -margin.left + "px")
        .style("margin.right", -margin.right + "px")
      .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
        .style("shape-rendering", "crispEdges");

    var grandparent = svg.append("g")
        .attr("class", "grandparent");

    grandparent.append("rect")
        .attr("y", -margin.top)
        .attr("width", width)
        .attr("height", margin.top);

    grandparent.append("text")
        .attr("x", 6)
        .attr("y", 6 - margin.top)
        .attr("dy", ".75em");

    initialize(root);
    accumulate(root);
    layout(root);
    display(root);

    function initialize(root) {
      root.x = root.y = 0;
      root.dx = width;
      root.dy = height;
      root.depth = 0;
    }

    // Aggregate the values for internal nodes. This is normally done by the
    // treemap layout, but not here because of our custom implementation.
    // We also take a snapshot of the original children (_children) to avoid
    // the children being overwritten when when layout is computed.
    function accumulate(d) {
       console.log(d.count);
      return (d._children = d.children)
          ? d.count = d.children.reduce(function(p, v) { return p + accumulate(v); }, 0)
          : d.count;
    }

    // Compute the treemap layout recursively such that each group of siblings
    // uses the same size (1×1) rather than the dimensions of the parent cell.
    // This optimizes the layout for the current zoom state. Note that a wrapper
    // object is created for the parent node for each group of siblings so that
    // the parent’s dimensions are not discarded as we recurse. Since each group
    // of sibling was laid out in 1×1, we must rescale to fit using absolute
    // coordinates. This lets us use a viewport to zoom.
    function layout(d) {
      if (d._children) {
        treemap.nodes({_children: d._children});
        d._children.forEach(function(c) {
          c.x = d.x + c.x * d.dx;
          c.y = d.y + c.y * d.dy;
          c.dx *= d.dx;
          c.dy *= d.dy;
          c.parent = d;
          layout(c);
        });
      }
    }

    function display(d) {
      grandparent
          .datum(d.parent)
          .on("click", transition)
        .select("text")
          .text(name(d));

      var g1 = svg.insert("g", ".grandparent")
          .datum(d)
          .attr("class", "depth");

      var g = g1.selectAll("g")
          .data(d._children)
        .enter().append("g");

      g.filter(function(d) { return d._children; })
          .classed("children", true)
          .on("click", transition);

      g.selectAll(".child")
          .data(function(d) { return d._children || [d]; })
        .enter().append("rect")
          .attr("class", "child")
          .call(rect);

      g.append("rect")
          .attr("class", "parent")
          .call(rect)
        .append("title")
          .text(function(d) { return formatNumber(d.count); });

      g.append("text")
          .attr("dy", ".75em")
          .text(function(d) { return d.name; })
          .call(text);

      function transition(d) {
        if (transitioning || !d) return;
        transitioning = true;

        var g2 = display(d),
            t1 = g1.transition().duration(750),
            t2 = g2.transition().duration(750);

        // Update the domain only after entering new elements.
        x.domain([d.x, d.x + d.dx]);
        y.domain([d.y, d.y + d.dy]);

        // Enable anti-aliasing during the transition.
        svg.style("shape-rendering", null);

        // Draw child nodes on top of parent nodes.
        svg.selectAll(".depth").sort(function(a, b) { return a.depth - b.depth; });

        // Fade-in entering text.
        g2.selectAll("text").style("fill-opacity", 0);

        // Transition to the new view.
        t1.selectAll("text").call(text).style("fill-opacity", 0);
        t2.selectAll("text").call(text).style("fill-opacity", 1);
        t1.selectAll("rect").call(rect);
        t2.selectAll("rect").call(rect);

        // Remove the old node when the transition is finished.
        t1.remove().each("end", function() {
          svg.style("shape-rendering", "crispEdges");
          transitioning = false;
        });
      }

      return g;
    }

    function text(text) {
      text.attr("x", function(d) { return x(d.x) + 6; })
          .attr("y", function(d) { return y(d.y) + 6; });
    }

    function rect(rect) {
      rect.attr("x", function(d) { return x(d.x); })
          .attr("y", function(d) { return y(d.y); })
          .attr("width", function(d) { return x(d.x + d.dx) - x(d.x); })
          .attr("height", function(d) { return y(d.y + d.dy) - y(d.y); });
    }

    function name(d) {
      return d.parent
          ? name(d.parent) + "." + d.name
          : d.name;
    }
  }
}


