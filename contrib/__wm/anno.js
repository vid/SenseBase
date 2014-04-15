
var isScraper, currentAnnoName = 'currentAnno';
var fayeClient = new Faye.Client('<!-- @var FAYEHOST -->');
var treeInterface = { hover: function(anno) {}, select: function(anno) {} };
(function() {
// General setup and functions


// what are we interacting withkkk
var outputDocument = parent.document;
var $enclosure = $('#ipxContent', outputDocument);

var sbUser, isScraper;
// We are not running as iframe
if ($enclosure.length) { 
  console.log('operating in dashboard');
  sbUser = parent.window.senseBase.user;
} else {
  if (window.parent.location.pathname.indexOf('/__wm/iframe.html') === 0) {
    console.log('asset bailing');
    return;
  } 
  sbUser = window.senseBase.user;
  isScraper = sbUser == 'scraper' || window.senseBase.isScraper;
  console.log('operating in iframe', window.parent.location);
  parent.window.annotateCurrentURI = annotateCurrentURI;
  $('body', outputDocument).prepend('<div id="sbTree" style="z-index: 999; position: fixed; right: 1em; top: 0; background: orange"><a id="sbGoTopLeft">⇱</a><span id="annotationCount"></span>' +
     (isScraper ? '<img src="/__wm/icons/scraper.png" alt="Scraper" />' : '') +
     '<div id="treeContainer"></div>' + '</div>');
  $('head', outputDocument).append('<link rel="stylesheet" href="<!-- @var HOMEPAGE -->/lib/jstree/dist/themes/default/style.min.css" />');
  fayeClient.publish('/annotate', { uri: window.parent.location.href} );
  $('#sbGoTopLeft', outputDocument).click(function() { 
    var w = $('#sbTree', outputDocument).css('width');
    $('#sbTree', outputDocument).css('left', '1em').css('width', w); 
  });
}
//var startingHTML = $enclosure.html().toString();

// incrementor
if (window.parent.location) {
  annotateCurrentURI(window.parent.location.toString());
}

// receive annotations
fayeClient.subscribe('/annotations', function(data) {
  var annotations = data.annotations, uri = data.uri;
  console.log('/annotations', data);
  // it's not current but needs to be updated
  if (uri !== currentURI) {
    //FIXME should only update if its in current results
    console.log('not current, updating', uri);
    setTimeout(function() { fayeClient.publish('/getContentItem', uri);}, 2000); // FIXME delay for ES save
    return;
  }
// it's our current item, display
// group by annotator
  console.log('updating current');
  displayAnnoTree(annotations, uri, treeInterface);
});

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
  // FIXME: use lib/annotations
    var anno = { type: $('#annoType').val(), hasTarget: currentURI, annotatedBy : sbUser, category: $('#annoValue').val().split('|') };

//  var annos = [ { annotatedBy: sbUser, quote: $('#annoQuote').val(), value : $('#annoValue').val(), type: $('#annoType').val(), description: $('#annoDesc').val(), validated: true, creator: sbUser } ];
  fayeClient.publish('/saveAnnotations', { uri: currentURI, annotations: [anno] });
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

}());

var encIDs = [];
// encode a string (URI) for an ID
function encID(c) {
  return 'enc' + (encIDs.indexOf(c) > -1 ? encIDs.indexOf(c) : encIDs.push(c) - 1);
}

function deEncID(c) {
  return encIDs[c.replace('enc', '')];
}

// sets the current annotation loc
function annotateCurrentURI(u) {
  currentURI = u.replace('#'+currentAnnoName, '').replace(/#$/, '');
//  addChat('is visiting ' + '<a class="visiting">' + currentURI + '</a>');
}

include "displayAnnoTree.js"

