// module to connect to pubsub for annotation

GLOBAL.config = require('../../config.js').config;
var faye = require('faye');
var bayeux = new faye.NodeAdapter({mount: '/montr', timeout: 45});
var fayeClient = new faye.Client(GLOBAL.config.FAYEHOST);
var anno = require('../../lib/annotations');

// receive requests for annotations
exports.requestAnnotate = function(callback) {
  fayeClient.subscribe('/requestAnnotate', function(data) {
    callback(data);
  });
};

// publish request to save annotations
exports.publishAnnotations = function(uri, annotations) {
  fayeClient.publish('/saveAnnotations', { uri: uri, annotations: annotations });
}

exports.rangesFromMatches = rangesFromMatches;

// convert instances of a match to instances
function instancesFromMatches(word, text, tag) {
  var ret = [];
  var re = new RegExp('\\b'+word+'\\b', 'gi');
  var instance = 1;
  while ((match = re.exec(text)) != null) {
    console.log(text.length, text.substring(0, 10), word, match.index, text.substr(match.index, word.length));
    if (text.indexOf('>', match.index) > text.indexOf('<'.match.index)) {
      ret.push(anno.createInstance({exact: text.substr(match.index, word.length), instance: instance}));
    }
     instance++;
  }
  return ret;
}
// convert instances of a match to ranges
function rangesFromMatches(word, text, tag) {
  var ret = [];
  var re = new RegExp('\\b'+word+'\\b', 'gi');
  while ((match = re.exec(text)) != null) {
    console.log(text.length, text.substring(0, 10), word, match.index, text.substr(match.index, word.length));
     ret.push(anno.createRange({exact: text.substr(match.index, word.length), offset: match.index}));
  }
  return ret;
}

// extract document body and return matche ranges
exports.bodyRangesFromMatches = function(word, html) {
 return rangesFromMatches(word, html.substring(html.indexOf('<body')));
};

// extract document body and return match instances
exports.bodyInstancesFromMatches = function(word, html) {
 return instancesFromMatches(word, html.substring(html.indexOf('<body')));
};
