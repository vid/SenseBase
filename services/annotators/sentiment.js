// AFINN sentiment annotator
/*jslint node: true */

'use strict';

var analyze = require('Sentimental').analyze;

var annoLib = require('./annotateLib'), annotations = require('../../lib/annotations'), utils = require('../../lib/utils.js');

var name = 'AFINN Sentiment';
exports.doProcess = doProcess;

// wait for annotation requests
annoLib.requestAnnotate(doProcess);

function doProcess(combo, callback) {
  var uri = combo.uri, html = combo.content, text = combo.text, selector = combo.selector, annoRows = [];
  GLOBAL.info(name, uri, selector, text ? text.length : 'notext');

  if (text.length > 0) {
    // process each individual callback
    var sentiments = analyze((text + '.').trim());
    var score = sentiments.score;
    annoRows.push(annotations.createAnnotation({type: 'value', annotatedBy: name, hasTarget: uri, key: 'score', value : score }));

    var seen = {};
    ['positive', 'negative'].forEach(function(set) {
      sentiments[set].words.forEach(function(w) {
        if (!seen[w]) {
          try {
            annoRows.push(annotations.createAnnotation({type: 'quote', annotatedBy: name, roots: [set], hasTarget: uri, quote: w,
              ranges: annoLib.bodyInstancesFromMatches(w, html, selector)}));
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
