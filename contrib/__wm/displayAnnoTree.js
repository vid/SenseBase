
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

  var annoBy = {}, annoTotal = 0;
  // cluster by annotator
  annotations.forEach(function(a) {
    annoTotal++;
    if (!annoBy[a.annotatedBy]) { annoBy[a.annotatedBy] = []; }
      annoBy[a.annotatedBy].push(a);
  });
  // need to add a hierarchy from different anno types
  var byAnno = [];
  for (var by in annoBy) {
    var byInstances = [];
    var id = 0;
    annoBy[by].forEach(function(ann) {
      if (ann.type === 'quote') {
        var instances = [];
        ann.ranges.forEach(function(r) {
          r.annotatedBy = by;
          instances.push({ type: 'range', text: r.exact, id: treeItems.id(r) });
        });
        byInstances.push({ type: 'quote', text: ann.quote, id: treeItems.id(ann), children : instances});
      } else if (ann.type === 'value') {
        byInstances.push({ type: 'value', text: ann.key + ':' + ann.value, id: treeItems.id(ann)});
      } else if (ann.type === 'category') {
        var last = null, first = null, cats = ann.category, c;
// break out category levels
        while (c = cats.shift()) {
          var me = { type: 'category', text: c, id: treeItems.id(ann), children: []};
          if (!first) { first = me; } else { last.children.push(me);}
          last = me;
        }
        byInstances.push(first);
      } else {
       console.log('unknown type', ann.type);
      }
    });
    byAnno.push({ text: by, id: treeItems.id(by), children: byInstances});
  }
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
    core : { data: byAnno },
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

  console.log('treeAnnos', byAnno, 'SPLIT', treeItems);
  return treeItems;
}
