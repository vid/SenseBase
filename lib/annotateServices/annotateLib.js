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

// convert instances of a match to ranges
function rangesFromMatches(word, text, tag) {
  var ret = [];
  var re = new RegExp(word, 'g');
  while ((match = re.exec(text)) != null) {
     ret.push(anno.createRange({exact: word, offset: match.index, baseTag: tag}));
  }
  return ret;
}

// extract document body and return matches
exports.bodyRangesFromMatches = function(word, html) {
 return rangesFromMatches(word, html.substring(html.indexOf('<body')), 'body');
};
