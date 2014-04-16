(function() {
  var lastPlaced, blinkAnno, selectMode = false, displayAll = true, lastSelected;
  var treeInterface = { 
    hover: function(anno) {
      if (!selectMode) { 
        displayAnno(anno, displayAll);
      } 
    }, 
    select: function(anno) {

    // clear select mode if it's the same anno
    if (selectMode && lastSelected === anno) {
      selectMode = false;
    } else {
      selectMode = true;
      displayAnno(anno, displayAll);
    }
    }
  };
  ready();
  function ready() {
    $('#sbIframe', parent.document).after('<div id="sbAnnotationDetails" style="background: #ffe; filter:alpha(opacity=90); opacity:0.9; position: absolute; top: 8%; left: 8%; width: 80%; height: 80%; display: none; z-index: 999; border: 1px dotted grey"><i class="close icon"></i><pre></pre></div>');
    $('#sbIframe', parent.document).after('<style>\n.sbShort { height: 10%; }\n.sbAnnotationBlink { background: yellow !important; }\n.sbAnnotation-a { background: lightgreen; }\n.sbAnnotation-b { background: lightblue; }\n</style>');
    var fayeClient = new Faye.Client('<!-- @var FAYEHOST -->');
  // do scraper actions as appropriate
    var senseBase = window.senseBase;
    if (senseBase.isScraper) {
      $('#treeContainer').html('<h1>scraper</h1>');
      console.log('isScraper', senseBase);
      // publish our current link
      setTimeout(function() {
        var links = [];
        $('a', parent.document).each(function(i, l) { links.push(l.href); });
        console.log('scraper publishing current link', senseBase.user, links.length);
        fayeClient.publish('/visited', { uri: parent.window.location.href, content: parent.document.documentElement.outerHTML, scraper: senseBase.user, links: links}); 
        // if no current links, wait for more
        setInterval(function() {
          console.log('scraper waiting for link');
          fayeClient.publish('/visited', { scraper: senseBase.user});
        }, 20000);
      }, 2000);
      fayeClient.subscribe('/visit', function(msg) {
        $('#treeContainer').html(JSON.stringify(msg, null, 2));
        console.log('/visit', msg);
        if (!msg.site.uri || msg.site.uri.toLowerCase().indexOf('https') === 0) {
          console.log('not scraping undefined');
        } else {
          setTimeout(function() { parent.window.location.href = msg.site.uri;}, 2000);
        }
      });
      return;
    }

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

      var treeItems = displayAnnoTree(annotations, uri, treeInterface);
      displayAllAnnos(treeItems);
      $('.sbAnnotation', parent.document).click(function() {
        $('#sbAnnotationDetails', parent.document).show();
        $('#sbAnnotationDetails pre', parent.document).text(JSON.stringify(treeItems.get($(this).attr('id').split('-')[2]), null, 2));
        $('#sbAnnotationDetails', parent.document).click(function() { $(this).hide();} ); 
      });
    });

    function displayAllAnnos(treeItems) {
      // sort and display annotations, longest first
      var items = $.extend({}, treeItems.map), longest = 1;
      while (longest > 0) {
        longest = 0;
        for (var id in items) {
          if (items[id].exact) {
            if (items[id].exact.length > longest) {
              longest = parseInt(id, 10);
            }
          } else {
            delete items[id];
          }
        }
        if (items[id]) {
      console.log('ITEMS', longest, items[id].exact.length);
          displayAnno(items[id], !displayAll);
          delete items[id];
        }
      }
    }

  }
  // add annotation tags, creating single if singleDisplay is true
  function displayAnno(anno, singleDisplay) {
//    console.log('ANNO', anno, { single: singleDisplay});
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
        // find the most specific enclosing element
        var annoID = 'SB-anno-' + anno.__id;
        // FIXME demo
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
//          console.log('found enclosing', { selection: $(anno.selector, parent.document).html(), placed: placed});
        } else {
          console.log('not found', anno.selector, 'for', anno);
        }
      }
    }
  }
include "displayAnnoTree.js"
}());
parent.window.senseBaseIframe = this;


