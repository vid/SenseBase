
exports.createAnnotation = createAnnotation;
exports.createContentItem = createContentItem;
exports.createRange = createRange;

// contentItem required fields
var mainFields = ['title', 'uri', 'content'], utils = require('../lib/utils.js'), annotations = require('../lib/annotations.js');
exports.mainFields = mainFields;

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
  var cItem = { title: desc.title, uri: desc.uri, content: desc.content};
  cItem.timestamp = desc.timestamp || new Date().toISOString();
  ['visitors', 'referers', 'headers'].forEach(function(k) {
    cItem[k] = desc[k] || [];
  });

  cItem._id = encodeURIComponent(desc.uri);

  return cItem;
}

// validates and creates an annotation
function createAnnotation(desc) {
  utils.check(['type', 'hasTarget', 'annotatedBy'], desc);

  var anno = { type: desc.type, hasTarget: desc.hasTarget, annotatedAt : desc.annotatedAt || new Date().toISOString(), annotatedBy : desc.annotatedBy};
  
  if (desc.type === 'quote') {
    utils.check(['ranges', 'quote'], desc);
    anno.quote = desc.quote;
    anno.ranges = desc.ranges;
  } else if (desc.type === 'category') {
    utils.check(['category'], desc);
    anno.category = desc.category;
  } else if (desc.type === 'value') {
    utils.check(['key', 'value'], desc);
    anno.key = desc.key;
    anno.value = desc.value;
  } else if (desc.type === 'valueQuote') {
    utils.check(['ranges', 'key', 'value'], desc);
    anno.key = desc.key;
    anno.value = desc.value;
    anno.ranges = desc.ranges;
  } else {
    throw Error('unknown type ' + type);
  }
  return anno;
}

// validates and creates an annotation range

function createRange(desc) {
  var fields = ['exact', 'offset'];
  utils.check(fields, desc);
  return { exact: desc.exact, offset: desc.offset};
}

