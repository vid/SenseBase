
var found;

//  recursively map item fields in an input json file
//
//  The format is like this:
//  {
//    "__TOP__" : {
//      "Author" : ["Author"],
//    }, 
//    "My taxonomy" : {
//      "My sub taxonomy" : {
//        "My level" : ["My level", "my_level"]
//        ...
//       },
//       ...
//    },
//    ...
//  }
//
// __TOP__ will be mapped to the root document, otherwise they are transformed to tag annotations.
// use an array for the found values to permit multiple values
//

module.exports = function(json) {
  flatten(json);
};

module.mapToItem = mapToItem;

function mapToItem(item, json) {
  var res = {annotations: {}};
  for (var key in item) {
    var mapped = flatNodes[k];
    if (mapped) {
      if (mapped === ['__TOP__']) {
        res[mapped.values[0]] = item[k];
      } else {
        res.annotations[mapped.values[0]] = item[k];
      }
    }
  }
}

// yucky global cause everything else was giving me hives today
var flatNodes = {};
function flatten(level, map) {
  for (var key in map) {
    var kmap = map[key];
    // we found a definition
    if (Array.isArray(kmap)) {
      flatNodes[key] = { level: level, values : kmap };
    } else {
      var here = level.slice(0);
      here.push(key);
      flatten(here, kmap);
    }
  }
}

var h = require('./ohtnFieldMapping.json');
flatten([], h);

console.log(flatNodes.PTSAudit);
console.log(flatNodes.JurisInc_High);

