// module to connect to pubsub for annotation

GLOBAL.config = require('../../config.js').config;
var faye = require('faye');
var bayeux = new faye.NodeAdapter({mount: '/montr', timeout: 45});
var fayeClient = new faye.Client(GLOBAL.config.FAYEHOST);
var anno = require('../../lib/annotations');

// receive requests for annotations
exports.requestAnnotate = function(callback) {
  fayeClient.subscribe('/requestAnnotate', function(cItem) {
    callback(cItem);
  });
};

// publish request to save annotations
exports.publishAnnotations = function(annotations) {
  fayeClient.publish('/saveAnnotations', annotations);
};

// convert instances of a match to ranges
exports.rangesFromMatches = function(word, text) {
  var ret = [];
  var re = new RegExp(word, 'g');
  while ((match = re.exec(text)) != null) {
     ret.push(anno.createRange({exact: word, offset: match.index}));
  }
  return ret;
}


