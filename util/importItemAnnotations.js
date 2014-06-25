// sample code for creating annotation items
// hasty importing spaghetti mess; avoid if possible 

var importer = require('../util/mapJsonToItemAnnotation'), siteQueries = require('./siteQueries'), annoLib = require('../lib/annotations');
var importLimit = 5;
var LOOKUP_URIS = false, SAVE = true;

console.log('LOOKUP_URIS', LOOKUP_URIS, 'SAVE', SAVE);

GLOBAL.config = require('../config.js').config;
GLOBAL.config.indexer = require('../lib/indexer.js');
GLOBAL.config.pubsub = require('../lib/pubsub.js');

var i = 0;
// get your field mappings
var fieldMappings = require(process.argv[2] || '../test/mock/fieldMapping.json');

importer.init(fieldMappings);

// get your data
var data = require(process.argv[3] || '../test/mock/mesh.json');

// process results
var imported = 0, failed = 0, count = 0, queued = { tags: 'import', relevance: 0, attempts: 0, lastAttempt: new Date().toISOString() }

// do the actual import, limited by importLimit;
data.forEach(function(d) {
  count++;
  try {
    // find uri from pubmed
    if (!d.uri && LOOKUP_URIS) {
      siteQueries.findPubMedArticle(d.Title, function(err, res) {
        if (err || !res) {
          d.uri = 'http://www.ncbi.nlm.nih.gov/pubmed/?term=' + d.Title.replace(/ /g, '+');
        } else {
          d.uri = 'http://www.ncbi.nlm.nih.gov/pubmed/' + res;
        }
        doImport(d);
      });
    } else {
      if (!d.uri && !LOOKUP_URIS) {
        d.uri = 'http://NOURI/' + count;
      }
      doImport(d);
    }

  } catch (e) {
    console.log('error', e);
    failed++;
  }

  // print stats
  if (count === data.length) {
    console.log('imported', imported, 'failed', failed);
    // fields that were not mapped
    console.log('unmapped', importer.getUnMapped());
  }

  if (importLimit > 0 && count === importLimit) {
    console.log('reached import limit');
    return;
  }
});


function doImport(d) {
  // transform if it hasn't been
  if (!d.annotatedBy) {
    var r = importer.mapToItem(d, { queued: queued });

    console.log('ITEM', r.contentItem._id, r.annotations.length);
    var cItem = r.contentItem, annotations = r.annotations;
    cItem.annotations = annotations;
  } else {
    var newannos = d.annotations.map(function(a) {
      return annoLib.createAnnotation({ hasTarget: d.uri, type: 'category', category: a['category'], annotatedBy: d.annotatedBy});
    });
    d.annotations = newannos;
      
    cItem = annoLib.createContentItem(d);
  }
  cItem.queued = queued;
  cItem.visitors = [{ member: 'import', '@timestamp': new Date().toISOString() }];
  if (SAVE) {
    GLOBAL.config.indexer._saveContentItem(cItem);
    // FIXME only works for items with abstract content
    GLOBAL.config.pubsub.requestAnnotate(cItem.uri, cItem.content);
  }

  imported++;
}

// utility assigns field value
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

