// ### browseFacet
/*jslint browser: true */
/*jslint node: true */
/* global $,d3 */

'use strict';

var facetSearchTimeout, typesIcons = require('./types-icons.js').types, curAnnos;
var jstreeOpts = {
  core : { },
  plugins : ['search'],
  search : { fuzzy: false, show_only_matches: true }
};

exports.render = function(target, results, resultView, context) {
  curAnnos = $('.query.annotations').select2('val');

  var $target = $(target), annos = augment(results.annotationOverview);
  $target.css('font-size', '80%');
  $target.jstree('destroy');
  $target.html('');
  jstreeOpts.core.data = annos;
  console.log(jstreeOpts);
  $target
    .bind('loaded.jstree', function(event, data) {
      window.dd = data;
      $('#facetFilter').remove();
      $target.prepend('<div id="facetFilter">Filter: <input id="facetSearch"></div>');
      $('#facetSearch').keyup(function () {
        if(facetSearchTimeout) { clearTimeout(facetSearchTimeout); }
        facetSearchTimeout = setTimeout(function () {
          var v = $('#facetSearch').val();
          $target.jstree(true).search(v);
        }, 250);
      });
    }).jstree(jstreeOpts);
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
  // FIXME should always have a type
  el.type = el.type || 'category';
  el.icon = (typesIcons[el.type] || typesIcons.default).icon;
  if (el.children && el.children.length > 0) {
    el.text = el.text + ' [' + el.children.length + ']';
    el.state = { opened: el.children.length > 50 ? false : true };
    el.children.forEach(function(c) {
      c = augment(c);
    });
  } else if (el.size && el.size > 0) {
    if (curAnnos.indexOf(el.text) > -1) {
      el.state = { selected: true };
    }
    el.data = { value: el.text };
    el.text = el.text + ' (' + el.size + ')';
  }
  return el;

}
