// basic more like this classifier

var querystring = require('querystring');
var http = require('http');
var request = require('request');

var annoLib = require('./annotateLib'), annotations = require('../../lib/annotations'), indexer = require('../../lib/indexer');

var name = 'Classify';

// wait for annotation requests
annoLib.requestAnnotate(function(combo) {
  var uri = combo.uri, html = combo.html, text = combo.text;
  GLOBAL.info(name, uri, text.length);
  // FIXME we can use content directly
  indexer.moreLikeThis(uri, function(err, mlt) {
    if (err) {
      GLOBAL.error('Classify error', uri, err);
      return;
    }

    console.log('Classify', uri, mlt.hits.total);
    if (mlt.hits.total > 1) {
      // take the second result (first is this doc)
      var candidate = mlt.hits.hits[1];
      indexer.retrieveAnnotations(candidate.fields.uri, function(err, annos) {
        if (err) {
          GLOBAL.error('Classify annotations error', candidate.uri, err);
          return;
        }
        if (annos.hits.total > 0) {
          var annoRows = [];
          annos.hits.hits.forEach(function(anno) {
            if (anno._source.type === 'category') {
              var anno = { validated : false, hasTarget : uri, annotatedBy: name, type: 'category', category: anno._source.category};
              console.log('add', anno);
              annoRows.push(annotations.createAnnotation(anno));
            }
          });
          if (annoRows.length > 0) {
            annoLib.publishAnnotations(uri, annoRows);
          }
        }
      });
    }
  });
});


