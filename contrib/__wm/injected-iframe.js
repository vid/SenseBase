(function() {
  var lastPlaced, blinkAnno, selectMode = false, displayAll = true, lastSelected;
  ready();
  function ready() {
    $('#sbIframe', parent.document).after('<div id="sbAnnotationDetails" style="background: #ffe; filter:alpha(opacity=90); opacity:0.9; position: absolute; top: 8%; left: 8%; width: 80%; height: 80%; display: none; z-index: 999; border: 1px dotted grey"><i class="close icon"></i><pre></pre></div>');
    $('#sbIframe', parent.document).after('<style>\n.sbShort { height: 10%; }\n.sbAnnotationBlink { background: yellow !important; }\n.sbAnnotation-a { background: lightgreen; }\n.sbAnnotation-b { background: lightblue; }\n</style>');
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

    // utility to manage IDs for items
    var treeItems = {
      // ids and their items
      map : {},
      // id issued in sequence
      _id : 0,
      reset : function() {
        this.map = {};
        this._id = 0;
      },
      // get an id
      id : function(o) {
        this._id++;
        o.__id = this._id;
        this.map[this._id] = o;
        return this._id;
      },
      // return the item for this id
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
              r.annotatedBy = by;
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
        var anno = treeItems.get(data.node.id);

        if (!selectMode) {
          displayAnno(anno, displayAll);
        }
      }).on('select_node.jstree', function(e, data) {
        var anno = treeItems.get(data.node.id);

        // clear select mode if it's the same anno
        if (selectMode && lastSelected === anno) {
          selectMode = false;
        } else {
          selectMode = true;
          displayAnno(anno, displayAll);
        }
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

      displayAllAnnos(treeItems);
      $('.sbAnnotation', parent.document).click(function() {
        $('#sbAnnotationDetails', parent.document).show();
        $('#sbAnnotationDetails pre', parent.document).text(JSON.stringify(treeItems.get($(this).attr('id').split('-')[2]), null, 2));
        $('#sbAnnotationDetails', parent.document).click(function() { $(this).hide();} ); 
      });
    });

    function displayAllAnnos(treeItems) {
      console.log('DII', !displayAll);
      // sort and display annotations
      var items = treeItems.map;
      for (var id in items) {
        displayAnno(items[id], !displayAll);
      }
    }

    // add annotation tags, creating single if singleDisplay is true
    function displayAnno(anno, singleDisplay) {
      console.log('ANNO', anno, { single: singleDisplay});
      // clear any last selected annotation
      clearTimeout(blinkAnno);
      $('.sbAnnotationBlink').removeClass('sbAnnotationBlink');
      if (lastPlaced) {
        $(lastPlaced.selector, parent.document).html(lastPlaced.replaced);
        lastPlaced = undefined;
        if (anno.placed) {
          delete anno.placed;
        }
      }

      // exact string
      if (anno.exact) {
        if (!anno.selector) {
          anno.selector = 'annoLocation';
        }
        var annoLocation = $(anno.selector, parent.document).html();

        // add offset by instance (occurance)
        if (anno.instance) {
          var re = new RegExp('\\b'+anno.exact+'\\b', 'g'), cur = 1, match;
          while ((match = re.exec(annoLocation)) !== null) {
            if (cur === anno.instance) {
              anno.offset = match.index;
              break;
            }
            cur++;
          }
          if (!anno.offset) {
            console.log(anno, 'was not found');
          }
        }
        if (anno.offset) {
          console.log('\n\n:: SB searching for anno ::', anno.exact);
          // find the most specific enclosing element
          var annoID = 'SB-anno-' + anno.__id;
          // FIXME demo
           console.log('by', anno.annotatedBy);
          var startTag = '<span id="' + annoID + '" class="sbAnnotation sbAnnotation-' + (anno.annotatedBy === 'AFINN Sentiment' ? 'a' : 'b') + '">', endTag = '</span>';
          
          if (anno.selector) {
            if (!singleDisplay) {
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
            } else {
              lastPlaced = placed;
            }
            lastSelected = anno;
            blinkAnno = setInterval(function() { $('#'+annoID, parent.document).toggleClass('sbAnnotationBlink')}, 500);
            console.log('found enclosing', { selection: $(anno.selector, parent.document).html(), placed: placed});
          } else {
            console.log('not found', anno.selector, 'for', anno);
          }
        }
      }
    }
  }
}());
parent.window.senseBaseIframe = this;

