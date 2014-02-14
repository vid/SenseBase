
var mainFields = ['title', 'uri', 'content'], utils = require('../lib/utils.js');;
exports.createAnnotation = createAnnotation;
exports.addAnnotation = addAnnotation;
exports.createAnnotationItem = createAnnotationItem;
exports.createRange = createRange;
exports.mainFields = mainFields;

// Annotation types:
// 
// category - document level category
// quote - indicates a document quote
// value - value assigned to document

// validates and creates an annotation item
function createAnnotationItem(desc) {
  utils.check(mainFields, desc);
  var aItem = { title: desc.title, uri: desc.uri, content: desc.content};
  aItem.timestamp = desc.timestamp || new Date().toISOString();
  ['visitors', 'referers', 'headers', 'annotations'].forEach(function(k) {
    aItem[k] = desc[k] || [];
  });

  return aItem;
}

// validates and creates an annotation
function createAnnotation(desc) {
  if (!desc.type) {
    throw Error('missing type');
  }

  utils.check(['annotatedBy'], desc);

  var anno = { type: desc.type, annotatedAt : desc.annotatedAt || new Date().toISOString(), annotatedBy : desc.annotatedBy};
  
  if (desc.type === 'quote') {
    if (!desc.range) {
      throw Error('missing range');
    }
    anno.range = desc.range;
  } else if (desc.type === 'category') {
    utils.check(['category'], desc);
    anno.category = desc.category;
  } else if (desc.type === 'value') {
    utils.check(['key', 'value'], desc);
    anno.key = desc.key;
    anno.value = desc.value;
  } else {
    throw Error('missing type ' + type);
  }
  return anno;
}

// adds a new annotation to an item
function addAnnotation(item, desc) {
  item.annotations.push(desc);
}

// validates and creates an annotation range

function createRange(desc) {
  var fields = ['exact', 'offset', 'range'];
  utils.check(fields, desc);
  return { exact: desc.exact, offset: desc.offset, range: desc.range};
}

