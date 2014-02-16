// AFINN sentiment annotator

var querystring = require('querystring');
var http = require('http');
var request = require('request');

var annoLib = require('./annotateLib'), annotateLib, annotations = require('../../lib/annotations');

var name = 'AFINN Sentiment';

// wait for annotation requests
annoLib.requestAnnotate(function(cItem, text, callback) {

  candidates(text, function(json) {
    try {
      json = JSON.parse(json);
    } catch (e) {
      callback(e);
      return;
    }
    var positive = json[0].r.positive.words;
    var negative = json[0].r.negative.words;
    var annoRows = [], rows;
    var score = 0;
    positive.forEach(function(w) {
      rows = annoLib.rangesFromMatches(w, text);
      annoRows = annoRows.concat(annotations.createAnnotation({type: 'quote', annotatedBy: name, hasTarget: cItem.uri, quote: w, ranges: rows}));
    });
    negative.forEach(function(w) {
      rows = annoLib.rangesFromMatches(w, text);
      annoRows = annoRows.concat(annotations.createAnnotation({type: 'quote', annotatedBy: name, hasTarget: cItem.uri, quote: w, ranges: rows}));
    });

    GLOBAL.debug('publishing', annoRows.length);
    annoRows.push(annotations.createAnnotation({type: 'value', annotatedBy: name, hasTarget: cItem.uri, key: 'score', value : score }));
    annoLib.publishAnnotations(annoRows);
  });
});

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

