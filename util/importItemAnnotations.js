// sample code for creating annotation items (TODO: convert to test)

var importer = require('../util/mapJsonToItemAnnotation'), indexer = require('../lib/indexer');

GLOBAL.config = require('../config.js').config;
var i = 0;

function fv(vals, key) {
  if (!vals) return;
  vals.forEach(function(v) {
    if (v.key === key && vals[key] !== 'Not available') {
      return vals[key];
    }
  });
}

// add any function value assigners
importer.funcVal('uri', function(data) { 
  return data.uri || fv(data.vals.LinkFullPaper) || fv(data.vals.linkPubMed) || fv(data.vals.linkJrn) ||
    'http://testing/' + i++; 
  });

// get your field mappings
var fieldMappings = require(process.argv[2] || '../test/mock/fieldMapping.json');

importer.init(fieldMappings);

// get your data
var data = require(process.argv[3] || '../test/mock/mesh.json');

// process results
data.forEach(function(d) {
    try {
      var r = importer.mapToItem(d);
      console.log('ITEM', r.contentItem._id, r.annotations.length);
      var cItem = r.contentItem, annotations = r.annotations;
      cItem.visitors = [{ member: 'demo', '@timestamp': new Date().toISOString() }];
      indexer._saveContentItem(cItem);
      indexer.saveAnnotations(cItem.uri, annotations);
//    indexer.updateAnnotations(cItem.uri);
    } catch (e) {
      console.log(e);
    }
  return; 
});

// fields that were not mapped
console.log('unmapped', importer.getUnMapped());

