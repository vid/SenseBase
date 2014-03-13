(function() {
  var head = document.getElementsByTagName('head')[0];
  var script = document.createElement('script');
  script.type = 'text/javascript';
  script.src = '/__wm/includes.js';
  script.onreadystatechange = ready;
  script.onload = ready;
  head.appendChild(script);

  function ready() {
    $('body').prepend('<div id="sbTree" style="z-index: 999; position: fixed; right: 1em; top: 0; background: #ffe; filter:alpha(opacity=90); opacity:0.9"><a id="sbGoTopLefT">⇱</a><span id="annotationCount"></span><div id="treeContainer"></div></div>');
    $('head').append('<link rel="stylesheet" href="<!-- @var HOMEPAGE -->/lib/jstree/dist/themes/default/style.min.css" />');
    $('head').append('<link rel="stylesheet" href="<!-- @var HOMEPAGE -->/lib/Semantic-UI/build/packaged/css/semantic.css" />');
    $('#sbGoTopLeft').click(function() {
      var w = $('#sbTree').css('width');
      $('#sbTree').css('left', '1em').css('width', w);
    });

    var fayeClient = new Faye.Client('<!-- @var FAYEHOST -->');
    fayeClient.publish('/annotate', { uri: window.parent.location.href} );

    fayeClient.subscribe('/annotations', function(data) {
      var annotations = data.annotations, uri = data.uri;
      console.log('/annotations', data);
      var annoBy = {}, annoTotal = 0;
      annotations.forEach(function(a) {
        annoTotal++;
        if (!annoBy[a.annotatedBy]) { annoBy[a.annotatedBy] = []; }
          annoBy[a.annotatedBy].push(a);
      });
      var byAnno = [];
      for (var by in annoBy) {
        var byInstances = [];
        var id = 0;
        annoBy[by].forEach(function(ann) {
          if (ann.type === 'quote') {
            var instances = [];
            ann.ranges.forEach(function(r) {
              instances.push({ type: 'range', text: r.exact, id: id++ });
            });
            byInstances.push({ type: 'quote', text: ann.quote, id: id++, children : instances});
          } else if (ann.type === 'value') {
            byInstances.push({ type: 'value', text: ann.key + ':' + ann.value, id: id++});
          } else if (ann.type === 'category') {
            var last = null, first = null, cats = ann.category, c;
    // break out category levels
            while (c = cats.shift()) {
              var me = { type: 'category', text: c, id: id++, children: []};
              if (!first) { first = me; } else { last.children.push(me);}
              last = me;
            }
            byInstances.push(first);
          } else {
           console.log('unknown type', ann.type);
          }
        });
        byAnno.push({ text: by, id: id++, children: byInstances});
      }
      $('#annotationCount').html(annoTotal);

      $('#treeContainer').html('<div id="annoTree"></div>');
        $('#annoTree').jstree({
        'core' : { data: byAnno },
        "plugins" : [ "search", "types", "wholerow" ],
        "types" : {
          "default" : {
            "icon" : "tags icon"
          },
          "range" : {
            "icon" : "ellipsis horizontal icon"
          },
          "category" : {
            "icon" : "tag icon"
          },
          "valueQuote" : {
            "icon" : "text width icon"
          },
          "value" : {
            "icon" : "info letter icon"
          },
          "quote" : {
            "icon" : "quote left icon"
          }
       }
      });
      console.log('treeAnnos', byAnno);
    });
  }
}());
