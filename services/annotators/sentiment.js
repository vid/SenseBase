// AFINN sentiment annotator
/*jslint node: true */

'use strict';

var analyze = require('Sentimental').analyze;

var name = 'AFINN Sentiment';

var annoLib = require('./annotateLib').init(name), annotations = require('../../lib/annotations'), utils = require('../../lib/utils.js');

exports.doProcess = doProcess;

// setup if we're running standalone
if (require.main === module) {
  // wait for annotation requests
  annoLib.setupAnnotator(name, doProcess);
}

function doProcess(combo, callback) {
  var uri = combo.uri, content = combo.content, text = combo.text, selector = combo.selector, annoRows = [];
  GLOBAL.info(name, uri, selector, 'content', content ? content.length : 'nocontent', 'text', text ? text.length : 'notext');

  if (text.length > 0) {
    // process each individual callback
    var sentiments = analyze((text + '.').trim());
    var score = sentiments.score;
    annoRows.push(annotations.createAnnotation({type: 'value', annotatedBy: name, hasTarget: uri, key: 'score', isA: 'Number', value : score }));

    var seen = {};
    ['positive', 'negative'].forEach(function(set) {
      sentiments[set].words.forEach(function(w) {
        if (!seen[w]) {
          try {
            annoRows.push(annotations.createAnnotation({type: 'quote', annotatedBy: name, roots: [set], hasTarget: uri, quote: w,
              ranges: annoLib.bodyInstancesFromMatches(w, content, selector)}));
            seen[w] = 1;
          } catch (e) {
            console.log('annoRow failed', e);
          }
        }
      });
    });
  }

  callback(null, { name: name, uri: uri, annoRows: annoRows});
}
