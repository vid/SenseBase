(function() {
  var selectMode = false;
  // html buffer while annotation tags are processed
  var newHTML;
  var treeInterface = { 
    hover: function(anno) {
      if (!selectMode) { 
console.log('hover', anno);
      } 
    }, 
    select: function(anno) {
      // clear select mode if it's the same anno
      if (selectMode && lastSelected === anno) {
        selectMode = false;
      } else {
        selectMode = true;
console.log('select', anno);
      }
    }
  };

  $('#sbIframe', parent.document).after('<div id="sbAnnotationDetails" style="background: #ffe; filter:alpha(opacity=90); opacity:0.9; position: absolute; top: 8%; left: 8%; width: 80%; height: 80%; display: none; z-index: 999; border: 1px dotted grey"><i class="close icon"></i><pre></pre></div>');
  $('#sbIframe', parent.document).after('<style>\n.sbShort { height: 10%; }\n.sbAnnotationBlink { background: yellow !important; }\n.sbAnnotation-a { background: lightgreen; }\n.sbAnnotation-b { background: lightblue; }\n</style>');
  var fayeClient = new Faye.Client('<!-- @var FAYEHOST -->');
// do scraper actions as appropriate
  var senseBase = window.senseBase;
  if (senseBase.isScraper) {
    $('#treeContainer').html('<h1>scraper</h1>');
    console.log('isScraper', senseBase);
    // publish our current link
    setInterval(function() {
      console.log('scraper waiting for link');
      fayeClient.publish('/visitWait');
    }, 20000);
    fayeClient.subscribe('/visit', function(msg) {
      $('#treeContainer').html(JSON.stringify(msg, null, 2));
      console.log('/visit', msg);
      if (!msg.site || !msg.site.uri || msg.site.uri.toLowerCase().indexOf('https') === 0) {
        console.log('not scraping undefined');
      } else {
        if (msg.site.uri === parent.window.location.href) {
          console.log('not re-indexing self');
        } else {
          setTimeout(function() { parent.window.location.href = msg.site.uri;}, 2000);
        }
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
    if (uri.replace(/#.*/, '') !== parent.window.location.href) {
      console.log('ignoring annotations', uri);
      return;
    }
    console.log('/annotations', data);

    var treeItems = displayAnnoTree(annotations, uri, treeInterface);
    displayAllAnnos(treeItems);
    if ($('.sbAnnotation', parent.document).length) {
      $('.sbAnnotation', parent.document).click(function() {
        $('#sbAnnotationDetails', parent.document).show();
        $('#sbAnnotationDetails pre', parent.document).text(JSON.stringify(treeItems.get($(this).attr('id').split('-')[2]), null, 2));
        $('#sbAnnotationDetails', parent.document).click(function() { $(this).hide();} ); 
      });
    }
  });

  // find the starting position of an instance
  function findInstanceOffset(anno, text) {
    var re = new RegExp('\\b'+anno.exact+'\\b', 'g'), cur = 1, match;
    while ((match = re.exec(text)) !== null) {
      if (cur === anno.instance) {
        return match.index;
      }
      cur++;
    }
  }

  // prepare and display eligible annotations
  function displayAllAnnos(treeItems) {
    var items = [], selector, newHTML;
    // two passes; first assign offsets and add to array with the same selector
    for (var i in treeItems.map) {
      var anno = treeItems.map[i];
      if (anno.selector === 'body') {
        anno.selector = '#SBEnclosure';
      }
      if (anno.instance && (!selector || selector === anno.selector)) {
        if (!newHTML) {
          selector = anno.selector;
          newHTML = $(selector, parent.document).html();
        }
        anno.offset = findInstanceOffset(anno, newHTML);
        items.push(anno);
      }
    }
    console.log(items.length, 'eligible in', selector, 'out of', i);
    // second pass, sort and display annotations, later first.
    var latest = 1, i, item;
    while (latest > -1) {
      latest = -1;
      for (i = 0; i < items.length; i++) {
        item = items[i];
        if (item && item.offset > latest) {
          latest = i;
        }
      }

      if (latest > -1) {
        newHTML = insertAnno(items[latest], newHTML);
        delete items[latest];
      }
    }
    try {
      $(selector, parent.document).html(newHTML);
    } catch (e) {
      console.log('failed for', selector, newHTML.length);
      console.log(e);
    }
  }

  // insert annotation tags at correct position
  function insertAnno(anno, newHTML) {
    var annoID = 'SB-anno-' + anno.__id;
    var startTag = '<span id="' + annoID + '" class="sbAnnotation sbAnnotation-b">', endTag = '</span>';
    
    anno.offset = findInstanceOffset(anno, newHTML);
    return newHTML.substring(0, anno.offset) + startTag + anno.exact + endTag + newHTML.substring(anno.offset + anno.exact.length);
  }
include "displayAnnoTree.js"
}());
parent.window.senseBaseIframe = this;


