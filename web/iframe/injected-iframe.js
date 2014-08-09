// ### injected-iframe
/*jslint browser: true */
/*jslint node: true */
/* global $ */

'use strict';

// Fixes some cross site issues.
document.domain = require('tldjs').getDomain(document.domain);

var loc = window.location, doc = document, $sbPortal = $('#sbPortal'), $sbIframe = $sbPortal;
// running in an iframe
if (parent.window.location) {
  loc = parent.window.location;
  doc = parent.document;
  $sbIframe = $('#sbIframe', parent.document);
}
var pubsub = require('../lib/pubsub'), pageAnnotations = require('../lib/page-annotations');

exports.inject = function() {
  var annoTree = require('../lib/annoTree');
  var selectMode = false, lastSelected;
  // html buffer while annotation categories are processed
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

  console.log('SenseBase iframe', loc.href, $sbPortal.attr('id'));

  $sbPortal.html('<div style="background: black; padding: 6px; margin: 0px; height: 1em">' +
    '<i class="minus checkbox inverted icon"></i> <i class="hand left inverted icon"></i> <i class="refresh inverted icon"></i>' +
    '<i class="long arrow right inverted icon"></i>' +
    '<span style="background: white; float: right" a class="ui black circular label" id="annotationCount"> &nbsp; </span></div>' +
    '<div id="treeContainer" style="position: relative; top: 1em; overflow: auto; width: 100%"></div> ');
  $sbPortal.append('<div id="sbAnnotationDetails" style="background: #ffe; filter:alpha(opacity=90); opacity:0.9; position: absolute; top: 8%; left: 8%; width: 80%; height: 80%; display: none; z-index: 999; border: 1px dotted grey"><i class="close icon"></i><pre></pre></div>');
  $sbPortal.after('<style>\n.sbShort { height: 10%; }\n.sbAnnotationBlink { background: yellow !important; }\n.sbAnnotation-a { background: lightgreen; }\n.sbAnnotation-b { background: lightblue; }\n</style>');

  // actions
  $('.left.hand.icon').click(function() {
    var w = 300; //window.innerwidth;
    $sbIframe.css('left', '1em');
  });
  $('.long.arrow.right.icon').click(function() {
    console.log('embed');
    $sbPortal.prependTo('#SBInsie', doc);
  });

  $('.refresh.icon').click(function() {
    console.log('updateContent');
    pubsub.updateContent({ uri: loc.href, content: doc.documentElement.outerHTML} );
  });

  $('.minus.checkbox.icon').click(function() {
    console.log('!!', $('#sbIframe', parent.document).html());
    $sbIframe.css('left', (parent.window.innerWidth - 50) + 'px');
    $sbIframe.css('height', '28px');
    console.log('toggle short');
  });
  pubsub.annotate(loc.href);
  pubsub.annotations(function(data) {
    var annotations = data.annotations, uri = data.uri;
    if (uri.replace(/#.*/, '') !== loc.href) {
      console.log('ignoring annotations', uri);
      return;
    }
    console.log('/annotations', data);

    var treeItems = annoTree.display(annotations, uri, treeInterface);
    displayAllAnnos(treeItems);
    if ($('.sbAnnotation', doc).length) {
      $('.sbAnnotation', doc).click(function() {
        $('#sbAnnotationDetails', doc).show();
        $('#sbAnnotationDetails pre', doc).text(JSON.stringify(treeItems.get($(this).attr('id').split('-')[2]), null, 2));
        $('#sbAnnotationDetails', doc).click(function() { $(this).hide();} );
      });
    }
  });

// FIXME: this needs to be better organized. but it's fun for now.
  pageAnnotations.findAndPublish(parent.window, parent.document.location.href);

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
    var items = [], selector, newHTML, i;
    // two passes; first assign offsets and add to array with the same selector
    for (i in treeItems.map) {
      var anno = treeItems.map[i];
      console.log(anno);
      if (anno.selector === 'body') {
        anno.selector = '#SBEnclosure';
      }
      if (anno.instance && (!selector || selector === anno.selector)) {
        if (!newHTML) {
          selector = anno.selector;
          newHTML = $(selector, doc).html();
        }
        anno.offset = findInstanceOffset(anno, newHTML);
        items.push(anno);
      }
    }
    console.log(items.length, 'eligible in', selector, 'out of', i);
    // second pass, sort and display annotations, later first.
    var latest = 1, item;
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
      $(selector, doc).html(newHTML);
    } catch (e) {
      console.log('failed for', selector, newHTML.length);
      console.log(e);
    }
  }

  // insert annotation categories at correct position
  function insertAnno(anno, newHTML) {
    var annoID = 'SB-anno-' + anno.__id;
    var startTag = '<span id="' + annoID + '" class="sbAnnotation sbAnnotation-b">', endTag = '</span>';

    anno.offset = findInstanceOffset(anno, newHTML);
    return newHTML.substring(0, anno.offset) + startTag + anno.exact + endTag + newHTML.substring(anno.offset + anno.exact.length);
  }
};
