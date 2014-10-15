// ### browseFacet
/*jslint browser: true */
/*jslint node: true */
/* global $,d3 */

'use strict';

var facetSearchTimeout, typesIcons = require('./types-icons.js');

exports.render = function(target, results, resultView, context) {
  var $target = $(target), annos = augment(results.annotationOverview);
  $target
    .bind('loaded.jstree', function(event, data) {
    data.instance.open_all();
    window.dd = data;
    $target.prepend('Filter: <input id="facetSearch">');
    $('#facetSearch').keyup(function () {
      if(facetSearchTimeout) { clearTimeout(facetSearchTimeout); }
        facetSearchTimeout = setTimeout(function () {
          var v = $('#facetSearch').val();
          $target.jstree(true).search(v);
        }, 250);
      });
    }).jstree(
      { core : {
        data :  annos,
      },
      plugins : ['types', 'search'],
      search : { fuzzy: false },
      types : typesIcons.types
    });
  $target.on('select_node.jstree', function (e, data) {
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
    el.text = el.text + ' (' + el.children.length + ')';
    el.children.forEach(function(c) {
      c = augment(c);
    });
  } else if (el.items && el.items.length > 0) {
    el.data = { value: el.text };
    el.text = el.text + ' (' + el.items.length + ')';
  }
  return el;

}
