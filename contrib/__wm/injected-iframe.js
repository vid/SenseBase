(function() {
  var lastPlaced, blinkAnno, selectMode = false;
  ready();
  function ready() {
    var fayeClient = new Faye.Client('<!-- @var FAYEHOST -->');
  // do scraper actions as appropriate
    var senseBase = window.senseBase;
    if (senseBase.isScraper) {
      console.log('isScraper', senseBase);
      // publish our current link
      setTimeout(function() {
        console.log('scraper publishing current link', senseBase.user);
        fayeClient.publish('/visited', { scraped: parent.window.location.href, scraper: senseBase.user }); 
        // if no current links, wait for more
        setInterval(function() {
          console.log('scraper waiting for link');
          fayeClient.publish('/visited', { scraper: senseBase.user});
        }, 60000);
      }, 2000);
      fayeClient.subscribe('/visit', function(msg) {
        console.log('/visit', msg);
        if (!msg.site.uri || msg.site.uri.toLowerCase().indexOf('https') === 0) {
          console.log('not scraping undefined');
        } else {
          setTimeout(function() { window.location.href = msg.site.uri;}, 2000);
        }
      });
    }

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

    $('body').append('<span id="annotationCount"></span><div id="treeContainer"></div>');
    $('head').append('<link rel="stylesheet" href="<!-- @var HOMEPAGE -->/lib/jstree/dist/themes/default/style.min.css" />');
    $('head').append('<link rel="stylesheet" href="<!-- @var HOMEPAGE -->/lib/Semantic-UI/build/packaged/css/semantic.css" />');

    // actions
    $('.left.hand.icon').click(function() {
      var w = 300; //window.innerwidth;
      $('#sbIframe', parent.document).css('left', '1em')
      $('#sbIframe', parent.document).css('width', w + 'px');
    });
    $('.long.arrow.right.icon').click(function() {
      console.log('embed');
      $('#sbIframe', parent.document).prependTo('#SBInsie', parent.document);
    });

    $('.refresh.icon').click(function() {
      console.log('updateContent');
      fayeClient.publish('/updateContent', { uri: parent.window.location.href, content: parent.document.documentElement.outerHTML} );
    });

    $('.minus.checkbox.icon').click(function() {
      // FIXME
      $('#sbIframe', parent.document).css('height', $('#sbIframe', parent.document).css('height') === '50px' ? '90%' : '50px');
      console.log('toggle short');
    });
    console.log('SenseBase iframe', parent.window.location.href);
    fayeClient.publish('/annotate', { uri: parent.window.location.href} );

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

      $.jstree.defaults.core.themes.responsive = false;

      $('#treeContainer').html('<div id="annoTree"></div>');
      $('#annoTree').on('hover_node.jstree', function(e, data) {
        if (!selectMode) {
          selectAnnotation(e, data);
        }
      }).on('select_node.jstree', function(e, data) {
        selectMode = true;
        selectAnnotation(e, data);
      }).jstree({
        core : { data: byAnno },
        plugins : [ "search", "types", "wholerow" ],
        types : {
          default : {
            icon : "tags icon"
          },
          range : {
            icon : "ellipsis horizontal icon"
          },
          category : {
            icon : "tag icon"
          },
          valueQuote : {
            icon : "text width icon"
          },
          value : {
            icon : "info letter icon"
          },
          quote : {
            icon : "quote left icon"
          }
       }
      });

      console.log('treeAnnos', byAnno, 'SPLIT', treeItems);
    });

    function selectAnnotation(e, data) {
      var anno = treeItems.get(data.node.id);
      console.log('ANNO', anno);
      // clear any last selected annotation
      if (lastPlaced) {
        clearTimeout(blinkAnno);
        $(lastPlaced.selector, parent.document).html(lastPlaced.replaced);
        lastPlaced = undefined;
        selectMode = false;
      }

      $('#details').text(JSON.stringify(anno, null, 2));
      if (anno.placed) {
        $(anno.placed.selector, parent.document).html(anno.placed.replaced);
        delete anno.placed;
      }

      if (anno.exact) {
        if (!anno.selector) {
          anno.selector = 'body';
        }
        var body = $(anno.selector, parent.document).html();
        // add offset
        if (anno.instance) {
          var re = new RegExp('\\b'+anno.exact+'\\b', 'g'), cur = 1, match;
          while ((match = re.exec(body)) !== null) {
            //console.log(body.length, body.substring(0, 10), 'MATCH', anno, match, match.index, '==', cur, anno.instance);
            if (cur === anno.instance) {
              anno.offset = match.index;
              break;
            }
            cur++;
          }
          if (!anno.offset) {
            console.log(anno.exact, 'was not found');
          }
        }
        if (anno.offset) {
          console.log('\n\n:: SB searching for anno ::', anno.exact);
          // find the most specific enclosing element
          var annoselector = 'SB-anno-' + data.node.id;
          var startTag = '<span id="' + annoselector + '" class="sbAnnotation">', endTag = '</span>';
          
          if (anno.selector) {
            var toReplace = $(anno.selector, parent.document).html();
            // debugging
            var t = toReplace.substr(anno.offset - 1, anno.exact.length);
            // end debugging
            $(anno.selector, parent.document).html(toReplace.substring(0, anno.offset) + 
              startTag + 
              anno.exact + 
              endTag + 
              toReplace.substring(anno.offset + anno.exact.length));
            var placed = { selector: anno.selector, replaced: toReplace}
            anno.placed = placed;
            lastPlaced = placed;
            blinkAnno = setInterval(function() { $(annoselector, parent.document).toggleClass('sbAnnotation')}, 500);
            console.log('found enclosing', { selection: $(anno.selector, parent.document).html(), placed: placed});
            parent.location.hash = annoselector;
          } else {
            console.log('not found', anno.selector, 'for', anno);
          }
        }
      }
    }
  }
}());
parent.window.senseBaseIframe = this;

