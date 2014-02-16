
var found;
var annotations = require('../lib/annotations.js'), utils = require('../lib/utils.js');

// yucky global to simply mapping fields
var flatFields = {};

exports.init = function(json) {
  flatten([], json);
};

exports.mapToItem = mapToItem;
exports.getUnMapped = getUnMapped;
exports.funcVal = funcVal;

//  recursively map item fields in an input json file
//
//  The format is like this:
//  {
//    "__TOP__" : {
//      "Author" : ["Author"],
//    }, 
//    "My taxonomy" : {
//      "My sub taxonomy" : {
//        "My value item" : { _VAL_ : ["My value"] }
//        "My category item" : { _TAG_ : ["My category"] }
//        ...
//       },
//       ...
//    },
//    ...
//  }
//
// __TOP__ will be mapped to the root document, otherwise they are transformed to category annotations.
// use an array for the found values for multiple values
//

// functions to define field values
var funcVals = {};

// assign function to field
function funcVal(field, func) {
  funcVals[field] = func;
}

// fields that were not mapped
var unMapped = {};

// return keys with no mapping
function getUnMapped() {
  return Object.keys(unMapped).sort();
}

// converts a mapped item to an ContentItem and Annotations
function mapToItem(item, json) {
  // first pass, find fields and annos and add to a proto
  var proto = {categories: [], vals: []};
  for (var key in item) {
    var mapped = flatFields[key];
    if (mapped) {
      if (mapped.level.length === 1 && mapped.level[0] === '_TOP_') {
        proto[mapped._VAL_[0]] = item[key];
      } else if (mapped._TAG_) {
        proto.categories.push({ category: [mapped._TAG_[0] || key], content : item[key], level: mapped.level});
      } else if (mapped._VAL_) {
        proto.vals.push({ key: mapped._VAL_[0] || key, value: item[key], level: mapped.level});
      } else {
        throw Error('unknown type' + mapped);
      }
    } else {
      unMapped[key] = item;
    }
  } 

  // now make the annotations and contentItem
  for (var field in funcVals) {
    proto[field] = funcVals[field](proto);
  }

  utils.check(annotations.mainFields, proto);
  var annos = [];

// base annotation
  var aItem = annotations.createContentItem({ title: proto.title, uri: proto.uri, content: proto.content});

  // categories first
  for (var a in proto.categories) {
    var def = proto.categories[a];
// an array of categories
    if (Array.isArray(def.content)) {
      def.content.forEach(function(category) {
        var level = def.level.slice(0);
        level.push(category);var a = { hasTarget: aItem.uri, type: 'category', annotatedBy: proto.annotatedBy, category: level }
        annos.push(annotations.createAnnotation(a));
      });
// a single category
    } else {
      var level = def.level.slice(0);
      level.push(def.category[0]);
      annos.push(annotations.createAnnotation({ hasTarget: aItem.uri, type: 'category', annotatedBy: proto.annotatedBy, category: level }));
    }
  }
  // then vals
  for (var a in proto.vals) {
    var def = proto.vals[a];
    var level = def.level.slice(0);
    level.push(def.category);
    annos.push(annotations.createAnnotation({ hasTarget: aItem.uri, type: 'value', key: def.key, value: def.value, annotatedBy: proto.annotatedBy, category: level}));
  }
  return { contentItem: aItem, annotations: annos };
}

// recursively flatten fields to flatFields for fast lookups
function flatten(level, map) {
  for (var key in map) {
    var kmap = map[key];
    // we found a definition
    if (kmap._VAL_ || kmap._TAG_) {
      if (kmap._VAL_) {
        flatFields[key] = { level: level, _VAL_ : kmap._VAL_};
      } else {
        flatFields[key] = { level: level, _TAG_ : kmap._TAG_};
      }
    // presumed a level def
    } else {
      var here = level.slice(0);
      here.push(key);
      flatten(here, kmap);
    }
  }
}

