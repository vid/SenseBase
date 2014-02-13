// General setup and functions

var fayeClient = new Faye.Client('FAYEHOST');
var services = [ 'Classify', 'AnnotationSet', 'WikiMeta', 'Spotlight', 'Sentiment'];
var currentAnnoName = 'currentAnno';

var outputDocument = parent.document;
var $enclosure = $('#pxContent', outputDocument);
var startingHTML = $enclosure.html().toString();

if (!$enclosure.length) { // We are not running as iframe
  console.log('enclosure is pxContent');
  $enclosure = $('#pxContent', outputDocument);
  outputDocument = preview;
} else {
  console.log('enclosure is parent');
  parent.window.annotateCurrentURI = annotateCurrentURI;
}

var pxMember = parent.window.pxMember;
var isScraper = pxMember == 'scraper' || parent.window.pxScraper;
$('#pxMember').html(pxMember);

// tree setup 

// shared across multiple subscribes
var treeData; 
// retreive data from selected tree nodes
var idMap = {}; 
// incrementor
var ids = 0; 

if (window.parent.location) {
  annotateCurrentURI(window.parent.location.toString());
}

function resetTreeData() {
  ids = 0;
  idMap = {};
  treeData = {
    json_data : {
      data : [
      ]
    },
    "types" : { 
      "types" : { 
        "default" : { 
           "select_node" : function(e) {
             this.toggle_node(e);
           } 
        }
      } 
    },
    plugins : [ 'json_data', 'ui', 'themes', 'crrm', 'types' ]
  };
}

// annotation

var annos = fayeClient.subscribe('/annotations', function(message) {
  console.log('annotations', message.annotations);
  addChat('is visiting ' + '<a class="visiting">' + message.uri + '</a>');
  if (message.uri === currentURI) { // FIXME add to subscription
    var terms = [];
    for (var k in message.annotations) {
      var ann = message.annotations[k];
      var instances = [];
      ann.instances.forEach(function(c) {
        instances.push({ data: (c.value || ann.quote), attr: { id: ++ids} });
        idMap[ids] = c;
      });
      terms.push({ data: ann.value || ann.quote, attr: { id: ++ids }, children : instances});
      idMap[ids] = ann;
    }
    treeData.json_data.data.push({ data: message.service, metadata : { id : ids++}, children: terms});
    updateTree();
  }
});

function updateTree() {
  $("#annoTree").jstree(treeData).bind("select_node.jstree", function (e, data) {
    var id = data.rslt.obj.attr('id');
    var selected= idMap[id];
    if (selected.value) {
      setAnnotation(selected);
    }
    if (selected && selected.tagset) {
      var hier = {};
      // split tags, FIXME data structure on annotators
      selected.tagset.forEach(function(t) { 
        var s = t.split(':');
        if (s.length === 2) {
          hier[s[0]] = s[1];
        } else {
          hier[s] = t;
        }
      });
    }
  });
  $('#annoTree').bind('hover_node.jstree', function (e, data) {
    var id = data.rslt.obj.attr('id');
    var hovered = idMap[id];
    if (hovered && hovered.ranges) {
      console.log('hovered range', hovered);
      markAnno(hovered.ranges[0].startOffset + annoOffset, hovered.quote, true);
    } else {
      console.log('upper', hovered);
    }
  });
}

// offset for agent automation
var annoOffset = -816; 

function markAnno(start, text, jump) {
console.log('markAnno', startingHTML.substr(start, 90));
  var found = -1;
  while (start > 0 && found < 0) { 
    found = startingHTML.indexOf(text, start);
    start--;
  }
  window.parent.location.hash = '';
  if (found < 1) {
    return;
  }
  console.log(found, text);
  $enclosure.html(startingHTML.substring(0, found) + '<span style="background-color: lightblue" id="' + currentAnnoName + '">' + text + '</span>' + startingHTML.substring(found + text.length));
  if (jump) {
    window.parent.location.hash = currentAnnoName;
  }
}

function annotateCurrentURI(u) {
  currentURI = u.replace('#'+currentAnnoName, '').replace(/#$/, '');
  resetTreeData();
  console.log('resetting to', currentURI);
  if (currentURI) {
    $('#annoTree').html('<img src="/__wm/spinner.gif" alt="spinner" />');
    fayeClient.publish('/annotate', { services : services, uri: currentURI});
  }
}

function addChat(msg) {
  var n = new Date();
  $('#collabStream').append('<span style="width: 10em; color: green">' + n.getHours() + ":"  + n.getMinutes() + ":" + n.getSeconds() + '</span> ' + pxMember  + ' <i>' + msg + '</i><br />');
  $('.visiting').click(function(t) {
    annotateCurrentURI($(this).text());
  });
}

$('.morenext').click(function() {
  $(this).next().toggle();
});

// search

$('#searchForm').submit(function(event) {
  event.preventDefault();
  var search = { terms : $('#termSearch').val(), annotations : $('#annoSearch').val(), 
    from: $('#fromDate').val(), to: $('#toDate').val(),
    member: $('#searchMember').val() };
  fayeClient.publish('/search', search); 
});

var searchRes = fayeClient.subscribe('/searchResults', function(searchResults) {
  console.table('searchResults', searchResults);
});

// collab
var collab = fayeClient.subscribe('/collab', function(message) {
  addChat(message.text);
});
$('#collabInput').keypress(function(e) {
  if(e.which == 13) {
    fayeClient.publish('/collab', { text : $('#collabInput').val()});
    $('#collabInput').val('');
    return false;
  }
});

// scrape
if (isScraper) {
  console.log('I am a scraper');

  fayeClient.subscribe('/scrape', function(link) {
    console.log('/scrape', link);
    outputDocument.location = link;
  });
  var links = [];
  var myDomain = currentURI.split('/')[2];
  for (var i = 0; i < outputDocument.links.length; i++) {
    var href = outputDocument.links[i].href;
    var link = href.split('/')[2];
    console.log(href, link, myDomain);
    var inDomain = (link.indexOf(myDomain) > -1);
    if (link && (href.toLowerCase().indexOf('pdf') < 0) ) {
      links.push(href);
    }
    setTimeout(function() { 
//      console.log('sending', links); fayeClient.publish('/links', { site: currentURI, links: links};)
      setInterval(function() { console.log('sending', links); fayeClient.publish('/links', { site: currentURI, links: []})}, 5000);
    }, 1000);
  }
}

$('#updateAnnotations').click(function() {
    annotateCurrentURI(outputDocument.location.toString());
});

$('#annoNew').click(function() {
  selectingAnno = true;
  clearAnno();
});

$('#annoCancel').click(function() {
  selectingAnno = false;
  clearAnno();
  $('#annotateEditor').hide();
  return false;
});

$('#annoSave').click(function() {
  var annos = [ { quote: $('#annoQuote').val(), value : $('#annoValue').val(), types: $('#types').val(), description: $('#annoDesc').val(), validated: true, creator: pxMember } ];
  fayeClient.publish('/saveAnnotations', { uri: currentURI, annotations: annos });
  return false;
});

$('#annoUnsave').click(function() {
  return false;
});

$('#annoErase').click(function() {
  return false;
});

var teams = [ {people : [
    { name : 'Andy', icon: 'demo.png', activities : [{annotate : 'default'}, { search : true}]}
    , { name : 'Betty', icon: 'manager.png', activities : [{annotate : 'default'}, { search : true}]}
  ]}, 
  { services : [
    { name:'Spotlight', icon:'dbpedia.jpg', active:true, activities : [{annotate : 'default'}]}
    , { name : 'Sentiment', icon : 'sentiment.jpg', activities : [{annotate:'default'}]}
    , { name : 'WikiMeta', icon : 'wikimeta.png', activities : [{annotate:'true'}]}
    , { name : 'Carrot2', icon : 'carrot2.png', activities : [{annotate:'true'}]}
    , { name : 'Board members', icon : 'board.jpg', activities : [{annotate : true}]}
    , { name : 'MicroRDF', icon: 'rdf.png', activities : [{annotate: true}]} 
    , { name : 'MycoMine', icon : 'mycomine_logo.png', activities : [{annotate:true}]} 
    , { name : 'GATE', icon : 'gate.jpg', activities : [{annotate:true}]} 
    , { name : 'DC', icon: 'dublin_core.png', activities : [{annotate:'true'}, { search : 'default'}]} 
    , { name : 'ElasticSearch', icon : 'esearch.png', activities : [{search : 'default'}, {storage: 'default'}]} 
  ]}
]

// display selected and available team members
$('.teamToggle').each(function() {
  var $p = $(this);
  $p.append('<div class="toggle ui-widget-header " title="Drag and drop team members">Team <span class="ind">-</span></div><div class="team"><div class="dotbox selected"></div><div class="toggle ui-widget-header" title="Drag and drop team members">Available <span class="ind">+</span></div><div class="dotbox available"></div></div></div>');
  var $c = $p.find('.available');
  var $s = $p.find('.selected');
  var f = $p.attr('for');
  teams.forEach(function(team) {
    $.each(team, function(i, indi) {
      $.each(indi, function(m, member) {
        member.activities.forEach(function(activity) {
          for (var a in activity) {
            if (a == f) {
              $el = activity[a] == 'default' ? $s : $c;
              $el.append('<a class="' + member.name + '" title="' + member.name + '" id="' + member.name + '">' + (member.icon ? '<img src="icons/' + member.icon + '" />' : '<span style="background-color: lightgrey; margin: 1px; padding: 5px">' + member.name+'</span>') + '</a>');
            }
          }
        });
      });
    });
  });
  $s.sortable();
  $c.find('a').draggable({
      cancel: "a.ui-icon", 
      revert: "invalid", 
      containment: "document",
      helper: "clone",
      cursor: "move"
    });
 
  $s.droppable({
    activeClass: "ui-state-highlight",
    drop: function( event, ui ) {
      $(this).append(ui.draggable);
    }
  });
  $s.find('a').draggable({
      cancel: "a.ui-icon",
      revert: "invalid",
      containment: "document",
      helper: "clone",
      cursor: "move"
    });
 
  $c.droppable({
    activeClass: "ui-state-highlight",
    drop: function( event, ui ) {
      $(this).append(ui.draggable);
    }
  });
});

$('.toggle').click ( function () {
  var $next = $(this).next();
  $next.toggle ();

  if ($next.is (':visible' ) === true ) {
    $(this).find('.ind').html('-');
  } else {
    $(this).find('.ind').html('+');
  }
});

$(document).tooltip();
var resizeIframe = function(event, ui) {
  var w = Math.round(ui.size.width);
  window.parent.pxContent.style.left = (w + 5) + 'px';
  window.parent.pxContent.style.width = window.parent.innerWidth - (ui.size.width + 5);
  try {
  console.log('SZ', window.parent.innerWidth, ui.size.width);
  $('#pxContent').next().style.width = w - 5 + 'px';
  } catch (e) {
    console.log('failed resize', e);
  }
};

if (window.parent.pxContent) {
  resizeIframe(null, { size: { width: 300}});
  $("#pxControls" ).on("resize", resizeIframe );
}

// annotation functions
var selectingAnno = false;

$enclosure.mouseup(function() {
  if (!selectingAnno) {
    return;
  }
   var selection = outputDocument.getSelection();
  var startOffset = (selection.getRangeAt ? selection.getRangeAt(0) : selection.createRange()).startOffset;
  var text = selection.toString();
  markAnno(startOffset, text);
  var selected = { quote: text, value : text, created: new Date(), types: '', annoDesc: ''};
  setAnnotation(selected);
  return false;
});

function setAnnotation(selected) {
  $('#annoQuote').val(selected.quote); 
  $('#annoValue').val(selected.value || ''); 
  $('#created').val(selected.created || ''); 
  $('#types').val(selected.types || '');
  $('#annoDesc').val(selected.text || '');
  $('#annotateEditor').show();
  return false;
}

function clearAnno() {
  setAnnotation({});
  $enclosure.html(startingHTML);
}

