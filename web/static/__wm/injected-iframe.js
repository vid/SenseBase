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
  var fayeClient = new Faye.Client('http://es.fungalgenomics.ca/faye');

  $('body').append('<span id="annotationCount"></span><div id="treeContainer"></div>');
  $('head').append('<link rel="stylesheet" href="http://es.fungalgenomics.ca/lib/jstree/dist/themes/default/style.min.css" />');
  $('head').append('<link rel="stylesheet" href="http://es.fungalgenomics.ca/lib/semantic-ui/build/packaged/css/semantic.css" />');

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
var treeFilterTimeout;
// display all annotations, then return a structure containing instances mapped to IDs
function displayAnnoTree(annotations, uri) {
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

  // create positions of tree items
  var treeMap = {}, treeRoot = { text: 'Annotations', children: []}, annoTotal = 0, curParent;
  annotations.forEach(function(cur) {
    annoTotal++;
    // get parent position (position without current)
    if (!cur.position) {
      console.log('missing position', cur);
      return;
    }
    var ppos = cur.position.slice(0, cur.position.length - 1);
    // find or create parents
    var roots = [], curAdd = treeRoot;
    
    ppos.forEach(function(cpos) {
      roots.push(cpos);
      curParent = treeMap[roots];
      if (!curParent) {
        curParent = { text: cpos, children: [] };
        console.log('creating', curParent, roots);
        treeMap[roots] = curParent;
        curAdd.children.push(curParent);
      }
        curAdd = curParent;
    });

    if (treeMap[cur.position]) {
      cur.children = treeMap[cur.position].children;
      cur.id = treeMap[cur.position].id || treeItems.id(cur);
    } else {
      cur.children = [];
      cur.id = treeItems.id(cur);
    }
    cur.text = cur.position[cur.position.length - 1];

    // add ranges
    if (cur.type === 'quote') {
      var instances = [];
      cur.ranges.forEach(function(r) {
        instances.push({ type: 'range', text: r.exact, id: treeItems.id(r) });
      });
      cur.children = instances;
    // display key : value
    } else if (cur.type === 'value' || cur.type === 'valueQuote') {
      cur.text = cur.key + ':' + cur.value;
    // should be ok as-is
    } else if (cur.type === 'category') {
    }

    curParent.children.push(cur);
    treeMap[cur.position] = cur;
  });

  console.log('TREE', treeRoot, annoTotal);

  $('#annotationCount').html(annoTotal);

  $.jstree.defaults.core.themes.responsive = false;
  $.jstree.defaults.search.fuzzy = false;

  $('#treeContainer').html('<div id="annoTree"></div>');
  $('#annoTree').jstree('open_all');
  $('#annoTree').on('hover_node.jstree', function(e, data) {
    var anno = treeItems.get(data.node.id);
    treeInterface.hover(anno, e, data);
  }).on('select_node.jstree', function(e, data) {
    var anno = treeItems.get(data.node.id);
    treeInterface.select(anno, e, data);
  }).jstree({
    core : { data: treeRoot },
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
  $('#annoTree').jstree('open_all');
  $('#treeFilter').keyup(function () {
    if(treeFilterTimeout) { clearTimeout(treeFilterTimeout); }
    treeFilterTimeout = setTimeout(function () {
      var v = $('#treeFilter').val();
      $('#annoTree').jstree(true).search(v);
    }, 250);
  });

  console.log('treeAnnos', treeMap);
  return treeItems;
}

}());
parent.window.senseBaseIframe = this;


