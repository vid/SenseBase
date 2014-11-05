// # Annotation set
//
// Adds categories when text is present

/*jslint node: true */

'use strict';

var name = 'Annotation set';

var _ = require('lodash');

var annoLib = require('./annotateLib').init(name), annotations = require('../../lib/annotations'), utils = require('../../lib/utils.js');
var annotationSets = [];

exports.doProcess = doProcess;
exports.setAnnotationSets = setAnnotationSets;

// setup if we're running standalone
if (require.main === module) {
  // retrieve annotation sets
  setup();
  // wait for annotation requests
  annoLib.setupAnnotator(doProcess);
  console.log(process.argv[1], annotationSets.length, 'sets');
}

// configure with these annotation sets
function setAnnotationSets(sets) {
  annotationSets = sets.map(function(s) {
    s.re = new RegExp('(' + s.terms.join('|') + ')', 'i');
    return s;
  });
}

// Retrieve annotation sets and subscribe to updates
function setup() {
  // FIXME
  setAnnotationSets(require('../../annotationSets.json'));
  /*
  require(process.cwd() + '/index.js').setup();
  var clientID = GLOBAL.svc.auth.clientIDByUsername('system');

  var pubsub = require('../lib/pubsub-client').init({ homepage: GLOBAL.config.HOMEPAGE, clientID: clientID });
  GLOBAL.svc.indexer.retrieveAnnotationSets(function(err, res) {
    utils.passingError(err);
    if (res.hits && res.hits.total > 0) {
      setAnnotationSets(_.pluck(res.hits.hits, '_source'));
    }
  });

  pubsub.members.subUpdated(setup);
  */
}

function doProcess(combo, callback) {
  var uri = combo.uri, content = combo.content, text = combo.text, selector = combo.selector, annoRows = [];
  GLOBAL.info(name, uri, selector, 'content', content ? content.length : 'nocontent', 'text', text ? text.length : 'notext');

  if (text.length > 0) {
    annotationSets.forEach(function(aset) {

     if (text.match(aset.re)) {
       var roots = aset.position.slice(0);
       var cat = roots.pop();
       annoRows.push(annotations.createAnnotation({type: 'category', annotatedBy: name, hasTarget: uri, roots: roots, category: cat }));
     }
   });
  }

  callback(null, { name: name, uri: uri, annoRows: annoRows});
}
