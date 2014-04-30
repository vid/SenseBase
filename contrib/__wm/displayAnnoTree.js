
// display all annotations, then return a structure containing instances mapped to IDs
function displayAnnoTree(annotations, uri) {
  // utility to manage IDs for items
  var treeItems = {
    // ids and their items
    map : {},
    // id issued in sequence
    _id : 0,
    reset : function() {
      this.map = {};
      this._id = 0;
    },
    // get an id
    id : function(o) {
      this._id++;
      o.__id = this._id;
      this.map[this._id] = o;
      return this._id;
    },
    // return the item for this id
    get : function(i) {
      return this.map[i];
    }
  };

  // create positions of tree items
  var treeMap = {}, treeRoot = { text: 'Annotations', children: []}, annoTotal = 0, curParent;
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
        curParent = { text: cpos, children: [] };
        console.log('creating', curParent, roots);
        treeMap[roots] = curParent;
        curAdd.children.push(curParent);
      }
        curAdd = curParent;
    });

console.log('DD', cur.position, treeMap);
    if (treeMap[cur.position]) {
      cur.children = treeMap[cur.position].children;
      cur.id = treeMap[cur.position].id || treeItems.id(cur);
    } else {
      cur.children = [];
      cur.id = treeItems.id(cur);
    }
    cur.text = cur.position[cur.position.length - 1];

    // add ranges
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

    curParent.children.push(cur);
    treeMap[cur.position] = cur;
  });

  console.log('TREE', treeRoot, annoTotal);

  $('#annotationCount').html(annoTotal);

  $.jstree.defaults.core.themes.responsive = false;

  $('#treeContainer').html('<div id="annoTree"></div>');
  $('#annoTree').on('hover_node.jstree', function(e, data) {
    var anno = treeItems.get(data.node.id);
    treeInterface.hover(anno);
  }).on('select_node.jstree', function(e, data) {
    var anno = treeItems.get(data.node.id);
    treeInterface.select(anno);
  }).jstree({
    core : { data: treeRoot },
    plugins : [ "search", "types", "wholerow" ],
    types : {
      default : {
        icon : "tags icon"
      },
      range : {
        icon : "ellipsis horizontal icon"
      },
      category : {
        icon : "tag icon"
      },
      valueQuote : {
        icon : "text width icon"
      },
      value : {
        icon : "info letter icon"
      },
      quote : {
        icon : "quote left icon"
      }
   }
  });

  console.log('treeAnnos', treeMap);
  return treeItems;
}
