// ### browseFacet
/*jslint browser: true */
/*jslint node: true */
/* global $,d3 */

'use strict';

exports.render = function(target, results, resultView, context) {
  var annos = augment(results.annotationOverview);
  console.log('AA', annos);
  $(target).bind('loaded.jstree', function(event, data) {
      data.instance.open_all();
    })
    .jstree({ 'core' : {
      'data' :  annos
    }
  })
  .on('select_node.jstree', function (e, data) {
    var i, j;
    for(i = 0, j = data.selected.length; i < j; i++) {
      console.log(data.instance.get_node(data.selected[i]));
      context.queryLib.addAnnotationTag(data.instance.get_node(data.selected[i]).data.value);
    }
  });

};

// add facet counts &c
function augment(el) {
  if (el.children && el.children.length > 0) {
    el.children.forEach(function(c) {
      c = augment(c);
    });
  } else if (el.items && el.items.length > 0) {
    el.data = { value: el.text };
    el.text = el.text + ' (' + el.items.length + ')';
  }
  return el;

}
