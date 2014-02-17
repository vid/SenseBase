// sample code for creating annotation items (TODO: convert to test)

var importer = require('../util/mapJsonToItemAnnotation'), indexer = require('../lib/indexer');

GLOBAL.config = require('../config.js').config;
var i = 0;

// add any function value assigners
importer.funcVal('uri', function(data) { return 'http://testing/' + i++; });

// get your field mappings
var fieldMappings = require(process.argv[2] || '../test/mock/fieldMapping.json');

importer.init(fieldMappings);

// get your data
var data = require(process.argv[3] || '../test/mock/mesh.json');

// process results
data.forEach(function(d) {
  var r = importer.mapToItem(d);
  console.log('\n\nITEM', r.contentItem._id, JSON.stringify(r.annotations, null, 2));
  var cItem = r.contentItem, annotations = r.annotations;
  cItem.visitors = [{ member: 'demo', '@timestamp': new Date().toISOString() }];

  indexer._saveContentItem(cItem);
  indexer.saveAnnotations(cItem.uri, annotations);
});

// fields that were not mapped
console.log('unmapped', importer.getUnMapped());

