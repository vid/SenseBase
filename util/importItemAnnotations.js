// sample code for creating annotation items
// imports from mapped items or proto contentItems

/*jslint node: true */

'use strict';

var importer = require('../util/mapJsonToItemAnnotation'), siteQueries = require('./siteQueries'), annoLib = require('../lib/annotations');
var importLimit = 5;
var LOOKUP_URIS = true, SAVE = true;

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
var imported = 0, failed = 0, count = 0, queued = { categories: ['import'], relevance: 0, attempts: 0, lastAttempt: new Date().toISOString() };

// do the actual import, limited by importLimit;
data.forEach(function(d) {
  count++;
  try {
    // find uri from pubmed
    if (!d.uri && LOOKUP_URIS) {
      siteQueries.findPubMedArticle(d.Title || d.title, function(err, res) {
        if (err || !res) {
          d.uri = 'http://www.ncbi.nlm.nih.gov/pubmed/?term=' + (d.Title || d.title).replace(/ /g, '+');
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
    console.log('error', e, 'for', d);
    console.trace();
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
  var cItem, annotations;
  // transform mapped item if it's not a proto item
  if (d.Title) {
    var r = importer.mapToItem(d, { queued: queued });

    console.log('ITEM', r.contentItem._id, r.annotations.length);
    cItem = r.contentItem, annotations = r.annotations;
    cItem.annotations = annotations;
  } else {
    d.queued = queued;
    cItem = annoLib.createContentItem(d);
    cItem.queued = queued;
  }
  (d.doAnnotations || []).forEach(function(a) {
    a.hasTarget = cItem.uri;
    a.annotatedBy = a.annotatedBy || cItem.annotatedBy;

    cItem.annotations.push(annoLib.createAnnotation(a));
  });
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
    throw new Error('No uri');
  }
  return uri;
});
