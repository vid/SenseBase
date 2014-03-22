(function() {
  var lastPlaced;
  ready();
  function ready() {
  // do scraper actions as appropriate
    var senseBase = window.senseBase;
    if (senseBase.isScraper) {
      console.log('isScraper', senseBase);
      // publish our current link
      setTimeout(function() {
        console.log('scraper publishing current link', senseBase.user);
        fayeClient.publish('/links', { scraped: parent.window.location.href, scraper: senseBase.user }); 
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
    $('.left.hand.icon').click(function() {
      var w = window.innerWidth;
      $('#sbIframe', parent.document).css('left', '1em')
      $('#sbIframe', parent.document).css('width', w);
    });

    var fayeClient = new Faye.Client('<!-- @var FAYEHOST -->');
    console.log('SenseBase iframe', parent.window.location.href);
    fayeClient.publish('/annotate', { uri: parent.window.location.href} );

    $('.refresh.icon').click(function() {
      fayeClient.publish('/annotate', { uri: parent.window.location.href, contents: $('body', parent.document.documentElement.outerHTML)} );
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

      $.jstree.defaults.core.themes.responsive = false;

      $('#treeContainer').html('<div id="annoTree"></div>');
      $('#annoTree').on('hover_node.jstree', function(e, data) {
        var anno = treeItems.get(data.node.id);
        console.log('ANNO', anno);
        if (lastPlaced) {
          $(lastPlaced.anchor, parent.document).html(lastPlaced.replaced);
          lastPlaced = undefined;
        }
  
        if (anno.placed) {
          $(anno.placed.anchor, parent.document).html(anno.placed.replaced);
          delete anno.placed;
        }

        if (anno.exact) {
          var body = parent.document.documentElement.outerHTML.substring(parent.document.documentElement.outerHTML.indexOf('<body'));
// add offset
          if (anno.instance) {
            var re = new RegExp('\\b'+anno.exact+'\\b', 'g'), cur = 1, match;
            while ((match = re.exec(body)) != null) {
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
            var annoAnchor = 'sbAnno-' + data.node.id;
            var startTag = '<span id="' + annoAnchor + '" style="background: lightblue">', endTag = '</span>';
            var tagsLen = startTag.length + endTag.length;
            
  // first we need to work with text
            var prevID = body.lastIndexOf(' id="', anno.offset);
            anchorSel = '#';
            anchorType = 'id';
            if (prevID < 0) {
              prevID = body.lastIndexOf(' class="', anno.offset);
              anchorSel = '.';
              anchorType = 'class';
            }
            var tagStart = body.lastIndexOf('<', prevID);
            var tagEnd = body.indexOf('>', prevID);
  // text to validate our id
            var valText = body.substring(tagEnd + 1, anno.offset + anno.exact.length);
            var idFrag = body.substring(tagStart, tagEnd + 1);
  // now DOM
  // the most immediate id before our element.
            var anchor = $(idFrag).attr(anchorType);
  console.log('starting anchor', prevID, 'anchor', anchorSel, anchor, {'valText': valText, idFrag: idFrag});
  // but it may be closed before our anno. so we search outward from it.
            curAnchor = $(anchorSel + anchor, parent.document);
            // searching while we can, the current selection contains our text, and its the finest selection
            while (curAnchor && curAnchor[0] && (curAnchor[0].outerHTML.indexOf(valText) < 0 || curAnchor.length > 0)) {
              anchor = $(anchorSel + anchor, parent.document).parents("[id]:first").attr(anchorType);
              curAnchor = $(anchorSel + anchor, parent.document);
              console.log('trying outer of', anchor);
            }
            if (!anchor) {
              anchor = 'body';
              anchorSel = '';
              curAnchor = $(anchorSel + anchor, parent.document);
            }
            if (curAnchor) {
              console.log('found enclosing', anchor, curAnchor);
              var toReplace = $(anchorSel + anchor, parent.document).html();
              $(anchor, parent.document).html(toReplace.substring(0, anno.offset - tagEnd - 1) + 
                startTag + 
                anno.exact + 
                endTag + 
                toReplace.substring((anno.offset - tagEnd) + anno.exact.length - 1));
              var placed = { anchor: anchorSel + anchor, replaced: toReplace}
              anno.placed = placed;
              lastPlaced = placed;
              parent.location.hash = anchorSel + annoAnchor;
            } else {
              console.log('not found', anchor, 'for', anno);
            }
          }
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
    });
  }
}());
parent.window.senseBaseIframe = this;

