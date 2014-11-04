// # Annotation set
//
// Adds categories when text is present

/*jslint node: true */

'use strict';

var name = 'Annotation set';

var annoLib = require('./annotateLib').init(name), annotations = require('../../lib/annotations'), utils = require('../../lib/utils.js');

exports.doProcess = doProcess;

// setup if we're running standalone
if(require.main === module) {
  // wait for annotation requests
  annoLib.setupAnnotator(doProcess);
}

function doProcess(combo, callback) {
  var uri = combo.uri, content = combo.content, text = combo.text, selector = combo.selector, annoRows = [];
  GLOBAL.info(name, uri, selector, 'content', content ? content.length : 'nocontent', 'text', text ? text.length : 'notext');

  if (text.length > 0) {
    annoRows.push(annotations.createAnnotation({type: 'category', annotatedBy: name, hasTarget: uri, category: category: score }));
  }

  callback(null, { name: name, uri: uri, annoRows: annoRows});
}
