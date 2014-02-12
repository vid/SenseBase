
exports.createAnnotation = createAnnotation;
exports.addAnnotation = addAnnotation;
exports.createAnnotationItem = createAnnotationItem;
exports.createRange = createRange;

// validates and creates an annotation item
function createAnnotationItem(desc) {
  check(['title', 'uri', 'content'], desc);
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

  check(['annotatedBy'], desc);

  var anno = { type: desc.type, annotatedAt : desc.annotatedAt || new Date().toISOString(), annotatedBy : desc.annotatedBy};
  
  if (desc.type === 'quote') {
    if (!desc.range) {
      throw Error('missing range');
    }
    anno.range = desc.range;
  } else if (desc.type === 'tag') {
    if (!desc.tag) {
      throw Error('missing tag');
    }
    anno.tag = desc.tag;
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
  check(fields, desc);
  return { exact: desc.exact, offset: desc.offset, range: desc.range};
}

// verify the keys are present
function check(arr, desc) {
  arr.forEach(function(k) {
    if (!desc[k]) {
     throw Error("missing field " + k);
    }
  });
}

