// ### browseFacet
/*jslint browser: true */
/*jslint node: true */
/* global $,d3 */

'use strict';

var facetSearchTimeout, typesIcons = require('./types-icons.js').types, curAnnos;
var unitSep = '␟'; // see annotations
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
      var ref = data.instance.get_node(data.selected[i]);
      if (ref.data.type === 'category' && !ref.children.length) {
        context.queryLib.addAnnotationTag(ref.data.value);
      } else {
        var d = ref.data;
        var fields = $('.select.fields').val().split(',');
        window.d = data;
        var t = [d.type].concat(ref.parents.slice(0, ref.parents.length - 2).reverse().map(function(p) { return data.instance.get_node(p).data.value; })).concat(d.value).join(unitSep);
        fields.push(t);
        $('.select.fields').val(fields.join(',').replace(/^,/, ''));
      }
    }
  });

};

// add facet counts &c
function augment(el) {
  // FIXME should always have a type
  el.type = el.type || 'category';
  el.icon = (typesIcons[el.type] || typesIcons.default).icon;
  el.data = { value: el.text, type: el.type };
  // branch
  if (el.children && el.children.length > 0) {
    el.state = { opened: el.children.length > 50 ? false : true };
    el.children.forEach(function(c) {
      c = augment(c);
    });
    el.text = el.text + ' [' + el.children.length + ']';
  // value or category
  } else if (el.size && el.size > 0) {
    if (curAnnos.indexOf(el.text) > -1) {
      el.state = { selected: true };
    }
    el.text = el.text + ' (' + el.size + ')';
  }
  return el;

}
