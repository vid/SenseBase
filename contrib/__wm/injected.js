(function() {
  var head = document.getElementsByTagName('head')[0];
  var script = document.createElement('script');
  script.type = 'text/javascript';
  script.src = '/__wm/includes.js';
  script.onreadystatechange = ready;
  script.onload = ready;
  head.appendChild(script);

  function ready() {
    // identify
    $.ajax({
      type: "GET",
      url: "<!-- @var HOMEPAGE -->/member.js",
      dataType: "script"
    }).done(function(res) {
    // do scraper actions as appropriate
      var senseBase = window.senseBase;
      if (senseBase.isScraper) {
        console.log('isScraper', senseBase);
        // publish our current link
        setTimeout(function() {
          console.log('scraper publishing current link', senseBase.user);
          fayeClient.publish('/links', { scraped: window.location.href, scraper: senseBase.user }); 
          // if no current links, wait for more
          setInterval(function() {
            console.log('scraper waiting for link');
            fayeClient.publish('/links', { scraper: senseBase.user});
          }, 60000);
        }, 2000);
        fayeClient.subscribe('/scrape', function(msg) {
          console.log('/scrape', msg);
          if (!msg.site.link) {
            console.log('not scraping undefined');
          } else {
            setTimeout(function() { window.location.href = msg.site.link;}, 8000);
          }
        });
      }
    });

    var treeItems = {
      map : {},
      _id : 0,
      reset : function() {
        this.map = {};
        this._id = 0;
      },
      id : function(o) {
        this._id++;
        this.map[this._id] = o;
        return this._id;
      },
      get : function(i) {
        return this.map[i];
      }
    };

    $('body').append('<div id="sbTree" style="z-index: 999; position: fixed; right: 1em; top: 0; color: black; background: #ffe; filter:alpha(opacity=90); opacity:0.9"><a id="sbGoTopLefT">⇱</a> <a id="sbReAnnotate">R</a> <span id="annotationCount"></span><div id="treeContainer"></div></div>');
    $('head').append('<link rel="stylesheet" href="<!-- @var HOMEPAGE -->/lib/jstree/dist/themes/default/style.min.css" />');
    $('head').append('<link rel="stylesheet" href="<!-- @var HOMEPAGE -->/lib/Semantic-UI/build/packaged/css/semantic.css" />');
    $('#sbGoTopLeft').click(function() {
      var w = $('#sbTree').css('width');
      $('#sbTree').css('left', '1em').css('width', w);
    });

    var fayeClient = new Faye.Client('<!-- @var FAYEHOST -->');
    $('#sbReAnnotate').click(function() {
      fayeClient.publish('/annotate', { uri: window.parent.location.href, contents: $('body')[0].outerHTML} );
    });

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
              instances.push({ type: 'range', text: r.exact, id: treeItems.id(r) });
            });
            byInstances.push({ type: 'quote', text: ann.quote, id: treeItems.id(ann), children : instances});
          } else if (ann.type === 'value') {
            byInstances.push({ type: 'value', text: ann.key + ':' + ann.value, id: treeItems.id(ann)});
          } else if (ann.type === 'category') {
            var last = null, first = null, cats = ann.category, c;
    // break out category levels
            while (c = cats.shift()) {
              var me = { type: 'category', text: c, id: treeItems.id(ann), children: []};
              if (!first) { first = me; } else { last.children.push(me);}
              last = me;
            }
            byInstances.push(first);
          } else {
           console.log('unknown type', ann.type);
          }
        });
        byAnno.push({ text: by, id: treeItems.id(by), children: byInstances});
      }
      $('#annotationCount').html(annoTotal);

      $('#treeContainer').html('<div id="annoTree"></div>');
        $('#annoTree').on('hover_node.jstree', function(e, data) {
        var anno = treeItems.get(data.node.id);
        if (anno.offset) {
          var body = $('body')[0].outerHTML;
          console.log(body.substring(0, 5), anno, body.indexOf(anno.exact), body.substring(anno.offset,  anno.offset + anno.exact.length)); 
        }
      }).jstree({
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
      console.log('treeAnnos', byAnno, 'SPLIT', treeItems);
    });
  }
}());
