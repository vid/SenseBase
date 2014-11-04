// # Pullquoter
// Tries to extract significant quotes.
/*jslint node: true */

'use strict';

// Reqular require doesn't seem to work.
var pullquoter = require('../.././node_modules/pullquoter/lib/pullquoter.js');

var name = 'Pullquoter';

var annoLib = require('./annotateLib').init(name), annotations = require('../../lib/annotations'), utils = require('../../lib/utils.js');

exports.doProcess = doProcess;

// setup if we're running standalone
if (require.main === module) {
  // wait for annotation requests
  annoLib.setupAnnotator(doProcess);
}

function doProcess(combo, callback) {
  var uri = combo.uri, html = combo.html, text = combo.text, selector = combo.selector, annoRows = [];
  GLOBAL.info(name, uri, selector, text ? text.length : 'notext');

  if (text.length > 0) {
    // process each individual callback
    var quote = pullquoter(text);
    annoRows.push(annotations.createAnnotation({type: 'value', annotatedBy: name, hasTarget: uri, key: 'quote', value : quote }));
  }

  callback(null, { name: name, uri: uri, annoRows: annoRows});
}
