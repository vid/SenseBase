// # addRequest
// Secondary request for annotations.
//
// Find any secondary requests relevant to a URI and execute them.
/*jslint node: true */

'use strict';

var siteRequests = require(process.cwd() + '/lib/site-requests.js');

var name = 'PubmedArticle';

var annoLib = require('./annotateLib').init(name);
//process({ uri: 'http://www.ncbi.nlm.nih.gov/pubmed/11139488'});

// wait for annotation requests
annoLib.setupAnnotator(doProcess);

function doProcess(combo, callback) {
  var uri = combo.uri;

  // FIXME: hack for finding mesh
  var match = GLOBAL.config.HOMEPAGE + 'files/';
  // it's a local file, try to locate it on databases
  if (uri.indexOf(match) === 0) {
    siteRequests.processLocalFilenameSearch(match, uri, callback);
  } else {
    siteRequests.processFound(uri, callback);
  }
}
