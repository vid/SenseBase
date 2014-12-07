// ContentItem and Annotation library.
//
// This should be renamed "items" or similar.
//
/*jslint node: true */
'use strict';

exports.createAnnotation = createAnnotation;
exports.createContentItem = createContentItem;
exports.createRange = createRange;
exports.createInstance = createInstance;

// contentItem required fields
var mainFields = ['title', 'uri'], utils = require('../lib/utils.js');
var unitSep = '␟';
exports.unitSep = unitSep;
exports.mainFields = mainFields;

// FIXME implement universal semantic system
var dataTypes = {
  Date: function(d) { return new Date(Date.parse(d)); },
  Number: Number,
  String: String
};

exports.dataTypes = dataTypes;

var utils = require('../lib/utils.js');
// Annotation types:
//
// category - document level category
// quote - quotes in document ranges
// value - value assigned to document
// valueQuote - value assigned to document ranges

// validates and formats a contentItem
function createContentItem(desc) {
  utils.check(mainFields, desc);
  if (!desc.content && !desc.queued) {
    utils.checkError(desc, 'content OR queued');
  }
  var cItem = { title: desc.title, uri: desc.uri, headers: desc.headers || {}, created: desc.created};
  // save values as arrays
  ['annotations', 'visitors', 'referers'].forEach(function(k) {
    var v = desc[k] || [];
    if (!Array.isArray(v)) {
      v = [v];
    }
    cItem[k] = v;
  });

// transfer properties if present
  ['state', 'queued'].forEach(function(k) {
    if (desc[k]) {
      cItem[k] = desc[k];
    }
  });

  // item has content so has been visited
  if (desc.content) {
    cItem.content = desc.content;
  } else {
  // add queing information
    cItem.queued = desc.queued;
  }

  cItem._id = encodeURIComponent(desc.uri);

  return cItem;
}

// validates and creates an annotation.
// pass .roots to insert into hierarchy
function createAnnotation(desc) {
  utils.check(['type', 'hasTarget', 'annotatedBy'], desc);

  var anno = { type: desc.type, hasTarget: desc.hasTarget, annotatedAt : desc.annotatedAt || new Date().toISOString(), annotatedBy : desc.annotatedBy, state: desc.state || utils.states.annotations.unvalidated};

 // used to create a hierarchical position
 // FIXME reconcile roots / position
  var position = desc.roots || [], flattened = desc.type + unitSep;
  anno.roots = desc.roots || [];
  if (desc.type === 'quote') {
    utils.check(['ranges', 'quote'], desc);
    if (!desc.ranges || desc.ranges.length < 1) {
      utils.checkError(desc, 'missing ranges');
    }
    anno.quote = desc.quote;
    anno.ranges = desc.ranges;
    position.push(anno.quote);
    flattened += position.join(unitSep);
  } else if (desc.type === 'category') {
    utils.check(['category'], desc);
    anno.category = Array.isArray(desc.category) ? desc.category : [desc.category];
    position = position.concat(anno.category);
    flattened += position.join(unitSep);
  } else if (desc.type === 'value') {
    utils.check(['key', 'value'], desc);
    anno.key = desc.key;
    anno.value = desc.value;
    position.push(anno.key);
    flattened += position.join(unitSep) + unitSep + desc.value;

// add data types
    if (desc.isA) {
      try {
        anno.isA = desc.isA;
        anno.typed = {};
        anno.typed[desc.isA] = dataTypes[desc.isA](desc.value);
      } catch (e) {
        anno.typed.failure = e;
        GLOBAL.warn('isA failed', e, desc);
      }
    }
  } else if (desc.type === 'valueQuote') {
    utils.check(['ranges', 'key', 'value'], desc);
    anno.key = desc.key;
    anno.value = desc.value;
    anno.ranges = desc.ranges;
    position.push(anno.key);
    flattened += position.join(unitSep) + unitSep + desc.value;
  } else {
    throw new Error('unknown type ' + desc.type);
  }
  anno.position = position;
  anno.flattened = flattened;
  if (anno.attributes) {
    anno.attributes = desc.attributes; // additional attributes
  }
  return anno;
}

// validates and creates an annotation range

function createRange(desc) {
  var fields = ['exact', 'offset', 'selector'];
  utils.check(fields, desc);
  return { exact: desc.exact, offset: desc.offset, selector: desc.selector};
}

// validates and creates an annotation instance
function createInstance(desc) {
  var fields = ['exact', 'instance', 'selector'];
  utils.check(fields, desc);
  return { exact: desc.exact, instance: desc.instance, selector: desc.selector};
}
