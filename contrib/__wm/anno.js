// General setup and functions

var fayeClient = new Faye.Client('<!-- @var FAYEHOST -->');
var services = [ 'Classify', 'AnnotationSet', 'WikiMeta', 'Spotlight', 'Sentiment'];
var currentAnnoName = 'currentAnno';

var outputDocument = parent.document;
var $enclosure = $('#ipxContent', outputDocument);
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

// incrementor
if (window.parent.location) {
  annotateCurrentURI(window.parent.location.toString());
}

// receive annotations
var annos = fayeClient.subscribe('/annotations', function(annotations) {
  console.log('annotations', annotations);
// group by annotator
  var annoBy = {};
  annotations.forEach(function(a) {
    if (!annoBy[a.annotatedBy]) { annoBy[a.annotatedBy] = []; }
      annoBy[a.annotatedBy].push(a);
  });
  var byAnno = [];
  for (var by in annoBy) {
    var byInstances = [];
    annoBy[by].forEach(function(ann) {
      var id = encID(ann.hasTarget);
      var instances = [];
      if (ann.type === 'quote') {
        var instances = [];
        ann.ranges.forEach(function(r) {
          instances.push({ type: 'range', text: r.exact, id: id });
        });
        byInstances.push({ type: 'quote', text: ann.quote, id: id, children : instances});
      } else if (ann.type === 'value') {
        byInstances.push({ type: 'value', text: ann.key + ':' + ann.value, id: id});
      } else if (ann.type === 'category') {
        var last = null, first = null, cats = ann.category, c;
// break out category levels
        while (c = cats.shift()) {
          var me = { type: 'category', text: c, id: id, children: []};
          if (!first) { first = me } else { last.children.push(me);}
          last = me;
        }
        byInstances.push(first);
      } else {
       console.log('unknown type', type);
      }
    });
    byAnno.push({ text: by, id: encID(annoBy[by].hasTarget), children: byInstances});
console.log('byAnno', byAnno);
  }
  var curTree = '#annoTree1';
  $('#treeContainer').html('<div id="annoTree1"></div>');
//  var i = $.jstree.create(curTree, {
    $(curTree).jstree({
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
  // init tree filter
  var to = false;
  $('#treeFilter').keyup(function () {
    if (to) { clearTimeout(to); }
    to = setTimeout(function () {
      var v = $('#treeFilter').val();
      $(curTree).jstree(true).search(v);
    }, 250);
  });
});

var encIDs = [];
// encode a string (URI) for an ID
function encID(c) {
  return (encIDs.indexOf(c) > -1 ? encIDs.indexOf(c) : encIDs.push(c) - 1);
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
//  addChat('is visiting ' + '<a class="visiting">' + currentURI + '</a>');
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

