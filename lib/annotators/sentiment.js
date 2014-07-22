// AFINN sentiment annotator

var querystring = require('querystring'), http = require('http'), request = require('request'), analyze = require('Sentimental').analyze;


var annoLib = require('./annotateLib'), annotations = require('../../lib/annotations'), utils = require('../../lib/utils.js');

var name = 'AFINN Sentiment';
exports.doProcess = doProcess;

// wait for annotation requests
annoLib.requestAnnotate(doProcess);

function doProcess(combo, callback) {
  var uri = combo.uri, html = combo.html, text = combo.text, selector = combo.selector;
  GLOBAL.info(name, uri, selector, text ? text.length : 'notext');

  // process each individual callback
  var sentiments = analyze((text + '.').trim());
  GLOBAL.info(sentiments);
  var annoRows = [], score = sentiments.score;
  annoRows.push(annotations.createAnnotation({type: 'value', annotatedBy: name, hasTarget: uri, key: 'score', value : score }));

  var seen = {};
  ['positive', 'negative'].forEach(function(set) {
    sentiments[set].words.forEach(function(w) {
      if (!seen[w]) {
        annoRows.push(annotations.createAnnotation({type: 'quote', annotatedBy: name, roots: [set], hasTarget: uri, quote: w,
          ranges: annoLib.bodyInstancesFromMatches(w, html, selector)}));
        seen[w] = 1;
      }
    });
  });

  callback(null, { name: name, uri: uri, annoRows: annoRows});
}
