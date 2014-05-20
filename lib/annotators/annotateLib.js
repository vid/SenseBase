// annotation helpers including pubsub

if (!GLOBAL.config) {
  GLOBAL.config = require('../../config.js').config;
}
var faye = require('faye');
var bayeux = new faye.NodeAdapter({mount: '/montr', timeout: 45});
var fayeClient = new faye.Client(GLOBAL.config.FAYEHOST);
var anno = require('../../lib/annotations'), utils = require('../../lib/utils');

// receive requests for annotations
exports.requestAnnotate = function(callback) {
  fayeClient.subscribe('/requestAnnotate', function(data) {
    callback(data, function(err, data) {
      if (err) {
        GLOBAL.error(err);
      } else {
        publishAnnotations(data.name, data.uri, data.annoRows);
      }
    });
  });
};

// publish request to save annotations
function publishAnnotations(annotator, uri, annotations) {
  fayeClient.publish('/saveAnnotations', { annotator: annotator, uri: uri, annotations: annotations });
}

exports.rangesFromMatches = rangesFromMatches;

// convert instances of a match to instances
function instancesFromMatches(word, text, selector) {
  var ret = [];
  var re = new RegExp('\\b'+utils.escapeRegex(word)+'\\b', 'gi');
  var instance = 1;
  while ((match = re.exec(text)) != null) {
    GLOBAL.debug(text.length, text.substring(0, 10), word, match.index, text.substr(match.index, word.length));
    if (text.indexOf('>', match.index) > text.indexOf('<'.match.index)) {
      ret.push(anno.createInstance({exact: text.substr(match.index, word.length), instance: instance, selector: selector}));
    }
     instance++;
  }
  return ret;
}
// convert instances of a match to ranges
function rangesFromMatches(word, text, selector) {
  var ret = [];
  var re = new RegExp('\\b'+word+'\\b', 'gi');
  while ((match = re.exec(text)) != null) {
    GLOBAL.debug(text.length, text.substring(0, 10), word, match.index, text.substr(match.index, word.length));
     ret.push(anno.createRange({exact: text.substr(match.index, word.length), offset: match.index, selector: selector}));
  }
  return ret;
}

// extract document body and return matche ranges
exports.bodyRangesFromMatches = function(word, html, selector) {
 return rangesFromMatches(word, html, selector);
};

// extract document body and return match instances
exports.bodyInstancesFromMatches = function(word, html, selector) {
 return instancesFromMatches(word, html, selector);
};
