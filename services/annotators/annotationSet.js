// #annotationSet
// Finds words in text and adds tags.
// FIXME update to standalone pubsub
/*jslint node: true */

'use strict';

var name = 'AnnotationSet';
var annoLib = require('./annotateLib').init(name), annotations = require('../../lib/annotations'), utils = require('../../lib/utils.js');

exports.doProcess = function(text, callback) {
  var annoRows = [];
  candidates(text, function(sets) {
    sets.forEach(function(res) {
      console.log('RES',res);
      annoRows = annoRows.concat(getOffsets(res.quote, text, res.set, res.needsValidation));
    });
    console.log('returning', annoRows.length);
    callback(null, annoRows);
  });
};

function getOffsets(word, text, type, needsValidation) {
  var ret = [], match;
  var re = new RegExp(word, 'g');
  while ((match = re.exec(text)) !== null) {
     ret.push({"ranges":[{"start":"/section[1]","startOffset":match.index,"end":"/section[1]","endOffset":match.index + word.length}],"quote":word,'text':'Annotation term "' + word + '" ' + match.index, value: type, types: [type], validated: !needsValidation});
//    console.log("match found at " + match.index);
  }
  return ret;
}

function candidates(text, callback) {
  text = text.replace(/<script.*\/script>/gm, '').replace(/<.*?>/g, '').toLowerCase();
  var ret = [];
  GLOBAL.config.users.forEach(function(u) {
    if (u.type == 'Annotation set') {
      console.log(u);
      var terms = u.positiveTerms.toString().split(',').toString().split('\n');
      terms.forEach(function(term) {
        if (text.indexOf(term.trim()) > 0) {
          ret.push({ quote : term, set: u.username, needsValidation: u.needsValidation});
        }
      });
    }
  });
  callback(ret);

}
