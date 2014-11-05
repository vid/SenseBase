// # annotateLib
// Annotation helpers including pubsub.
/*jslint node: true */

'use strict';

require('../../index.js').setup();

var pubsub, annoLib = require('../../lib/annotations'), utils = require('../../lib/utils'), auth = require('../../lib/auth');

exports.init = function(name) {
  var clientID = GLOBAL.svc.auth.clientIDByUsername(name);
  pubsub = require('../../lib/pubsub-client').init({ homepage: GLOBAL.config.HOMEPAGE, clientID: clientID });
  return this;
};

// receive requests for annotations
exports.setupAnnotator = function(name, callback) {
  var annotate = function(data) {
    callback(data, function(err, data) {
      if (err) {
        GLOBAL.error(err);
      } else {
        // add annotator name to its roots
        data.annoRows.forEach(function (annoRow) {
          annoRow.roots = annoRow.roots || [];
          annoRow.roots.unshift(data.name);
        });
        pubsub.item.annotations.adjure([data.uri], data.annoRows);
      }
    });
  };
  pubsub.item.annotations.subAnnotate(annotate);
  pubsub.item.annotations.subAnnotate(annotate, name.replace(/ /g, '_'));
};

exports.rangesFromMatches = rangesFromMatches;

// convert instances of a match to instances
function instancesFromMatches(word, text, selector) {
  var match, ret = [];
  var re = new RegExp('\\b'+utils.escapeRegex(word)+'\\b', 'gi');
  var instance = 1;
  while ((match = re.exec(text)) !== null) {
    GLOBAL.debug(text.length, text.substring(0, 10), word, match.index, text.substr(match.index, word.length));
    // It's not in a tag
    if (text.indexOf('>', match.index) > text.indexOf('<'.match.index)) {
      ret.push(annoLib.createInstance({exact: text.substr(match.index, word.length), instance: instance, selector: selector}));
    }
    instance++;
  }
  return ret;
}
// convert instances of a match to ranges
function rangesFromMatches(word, text, selector) {
  var ret = [], match;
  var re = new RegExp('\\b'+word+'\\b', 'gi');
  while ((match = re.exec(text)) !== null) {
    GLOBAL.debug(text.length, text.substring(0, 10), word, match.index, text.substr(match.index, word.length));
     ret.push(annoLib.createRange({exact: text.substr(match.index, word.length), offset: match.index, selector: selector}));
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
