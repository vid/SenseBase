// # annoTree
//
// Displays an items' annotations

/*jslint browser: true */
/*jslint node: true */
/* global $ */
'use strict';

var treeFilterTimeout, typesIcons = require('./types-icons.js');

// display all annotations, then return a structure containing instances mapped to IDs
exports.display = function(annotations, uri, treeInterface) {
  // utility to manage IDs for items
  var treeItems = {
    // ids and their items
    mapped : {},
    // id issued in sequence
    _id : 0,
    reset : function() {
      this.mapped = {};
      this._id = 0;
    },
    // get an id
    id : function(o) {
      this._id++;
      o.__id = this._id;
      // FIXME collusion with tree state
      o._state = o.state;
      this.mapped[this._id] = o;
      return this._id;
    },
    // return the item for this id
    get : function(i) {
      return this.mapped[i];
    }
  };

  // create positions of tree items
  var treeMap = {}, treeRoot = { state: { opened: true }, text: 'Annotations', children: []}, annoTotal = 0, curParent;
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
        curParent = { state: { opened: true}, text: cpos, children: [] };
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
    cur.state = { opened : true};
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

    if (!curParent) {
      console.log('MISSING curParent', cur);
      curParent = treeRoot;
    }
    curParent.children.push(cur);
    treeMap[cur.position] = cur;
  });

  console.log('TREE', treeRoot, annoTotal);

  $('#annotationCount').html(annoTotal);

  $.jstree.defaults.core.themes.responsive = false;
  $.jstree.defaults.search.fuzzy = false;

  $('#treeContainer').html('<div id="annoTree" style="height: 100%"></div>');
  var $tree = $('#annoTree');
  $tree.on('hover_node.jstree', function(e, data) {
    var anno = treeItems.get(data.node.id);
    treeInterface.hover(anno, e, data);
  }).on('select_node.jstree', function(e, data) {
    var anno = treeItems.get(data.node.id);
    treeInterface.select(anno, e, data);
  }).jstree({
    core : { data: treeRoot },
    plugins : [ "search", "types", "wholerow" ],
    types : typesIcons.types
  });
  /*
  $tree.bind("loaded.jstree", function (event, data) {
      $(this).jstree("open_all");
  })
  */

  $('#treeFilter').keyup(function () {
    if(treeFilterTimeout) { clearTimeout(treeFilterTimeout); }
    treeFilterTimeout = setTimeout(function () {
      var v = $('#treeFilter').val();
      $tree.jstree(true).search(v);
    }, 250);
  });

  console.log('treeAnnos', treeMap, 'treeItems', treeItems);
  exports.treeItems = treeItems;
  return treeItems;
};
