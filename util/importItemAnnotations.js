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
  var uri = data.uri || fv(data.vals.LinkFullPaper) || fv(data.vals.linkPubMed) || fv(data.vals.linkJrn);
  if (!uri) {
    throw Error('No uri');
  }
  return uri;
});

// get your field mappings
var fieldMappings = require(process.argv[2] || '../test/mock/fieldMapping.json');

importer.init(fieldMappings);

// get your data
var data = require(process.argv[3] || '../test/mock/mesh.json');

// process results
var imported = 0, failed = 0,
  queued = { tags: 'import', relevance: 0, attempts: 0, lastAttempt: new Date().toISOString() }
data.forEach(function(d) {
    try {
      var r = importer.mapToItem(d, { queued: queued });

      console.log('ITEM', r.contentItem._id, r.annotations.length);
      var cItem = r.contentItem, annotations = r.annotations;
      cItem.queued = queued;
      cItem.visitors = [{ member: 'import', '@timestamp': new Date().toISOString() }];
      indexer._saveContentItem(cItem);
      indexer.saveAnnotations(cItem.uri, annotations);
      imported++;
//    indexer.updateAnnotations(cItem.uri);
    } catch (e) {
      failed++;
      console.log(e);
    }
});

console.log('imported', imported, 'failed', failed);
// fields that were not mapped
console.log('unmapped', importer.getUnMapped());

