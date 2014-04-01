// AFINN sentiment annotator

var querystring = require('querystring');
var http = require('http');
var request = require('request');

var annoLib = require('./annotateLib'), annotations = require('../../lib/annotations');

var name = 'AFINN Sentiment';

// wait for annotation requests
annoLib.requestAnnotate(function(combo) {
  var uri = combo.uri, html = combo.html, text = combo.text, selector = combo.selector;
  GLOBAL.info(name, uri, selector, text ? text.length : 'notext');

  // process each individual callback
  candidates(text, function(json) {
    try {
      json = JSON.parse(json);
    } catch (e) {
      GLOBAL.error('sentiment', e);
      return;
    }
    var annoRows = [], score = json[0].r.score;
    annoRows.push(annotations.createAnnotation({type: 'value', annotatedBy: name, hasTarget: uri, key: 'score', value : score }));

    var seen = {};
    ['positive', 'negative'].forEach(function(set) {
      json[0].r[set].words.forEach(function(w) {
        if (!seen[w]) {
          annoRows.push(annotations.createAnnotation({type: 'quote', annotatedBy: name, hasTarget: uri, quote: w, 
            ranges: annoLib.bodyInstancesFromMatches(w, html, selector)}));
          seen[w] = 1;
        }
      });
    });

    annoLib.publishAnnotations(uri, annoRows);
  });
});

// make a POST request and callback results
function candidates(text, callback) {
  var postData = querystring.stringify({data : text});

  var postOptions = {
      host: GLOBAL.config.SENTIMENT.host,
      port: GLOBAL.config.SENTIMENT.port,
      path: '/',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': postData.length
      }
  };
  var data = '';
  var postRequest = http.request(postOptions, function(res) {
      res.setEncoding('utf8');
      res.on('data', function (chunk) {
          data += chunk;
      });
      res.on('end', function() {
        callback(data);
      });
  });

  postRequest.write(postData);
}


