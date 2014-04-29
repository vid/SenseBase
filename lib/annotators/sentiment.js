// AFINN sentiment annotator

var querystring = require('querystring'), http = require('http'), request = require('request');

var annoLib = require('./annotateLib'), annotations = require('../../lib/annotations'), utils = require('../../lib/utils.js');

var name = 'AFINN Sentiment';
exports.process = process;

// wait for annotation requests
annoLib.requestAnnotate(process);

function process(combo) {
  var uri = combo.uri, html = combo.html, text = combo.text, selector = combo.selector;
  GLOBAL.info(name, uri, selector, text ? text.length : 'notext');

  // process each individual callback
  candidates(text, function(err, json) {
    GLOBAL.info(json);
    var annoRows = [], score = json[0].r.score;
    annoRows.push(annotations.createAnnotation({type: 'value', annotatedBy: name, hasTarget: uri, key: 'score', value : score }));

    var seen = {};
    ['positive', 'negative'].forEach(function(set) {
      json[0].r[set].words.forEach(function(w) {
        if (!seen[w]) {
          annoRows.push(annotations.createAnnotation({type: 'quote', annotatedBy: name, roots: [set], hasTarget: uri, quote: w, 
            ranges: annoLib.bodyInstancesFromMatches(w, html, selector)}));
          seen[w] = 1;
        }
      });
    });

    annoLib.publishAnnotations(name, uri, annoRows);
  });
}

// make a POST request and callback results
function candidates(text, callback) {
  var data = querystring.stringify({data : text});

  var options = {
      host: GLOBAL.config.SENTIMENT.host,
      port: GLOBAL.config.SENTIMENT.port,
      path: '/',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': data.length
      }
  };
  utils.doPostJson(options, data, callback);
}


