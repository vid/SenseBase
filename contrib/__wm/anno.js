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

function resetAnnotateEditor() {
  $('#treeContainer').attr('height', $('#annotateBar').attr('height') - ($('#pxControls').attr('height') + $('#annotateEditor').attr('height')));
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

