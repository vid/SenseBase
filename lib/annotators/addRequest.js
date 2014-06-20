// secondary request for annotations
// find any secondary requests relevant to a URI and execute them

var xml2js = require('xml2js');
var annoLib = require('./annotateLib'), annotations = require('../../lib/annotations'), sites = require('../sites.js'), utils = require('../utils.js'), siteQueries = require('../../util/siteQueries');

var name = 'addRequest';

//process({ uri: 'http://www.ncbi.nlm.nih.gov/pubmed/11139488'});

// wait for annotation requests
annoLib.requestAnnotate(doProcess);

function doProcess(combo, callback) {
  var uri = combo.uri;

  // FIXME: hack for finding mesh
  var match = GLOBAL.config.HOMEPAGE + 'files/';
  // it's a local file, try to locate it on databases
  if (uri.indexOf(match) === 0) {
    siteQueries.findPubMedArticle(uri.replace(match, ''), function(err, res, u) {
      if (res) {
        console.log('found', u);
        processFound(u, function(err, res) {
          // now substitute back the local URI
          res.uri = uri;

          res.annoRows.forEach(function(r) {
            r.hasTarget = uri;
          });
          callback(null, res);
        });
      } else {
        processFound(uri, callback);
      }
    });
  } else {
    processFound(uri, callback);
  }
}

function processFound(uri, callback) {
  var founds = sites.findMatch(uri);

  founds.forEach(function(found) {
// an additional request exists
    if (found.addRequest) {
      found.addRequest.forEach(function(areq) {
        // specific processor
        var processor = sites.processors[areq.processor];
        var loc = processor.getURI(uri);
        GLOBAL.info(name, loc, found.addRequest, areq.name);
        // local name
        var name = areq.name;
        // retrieve contents and process
        utils.retrieve(loc, function(err, resp) {
          if (err) {
            GLOBAL.error(name, err);
          } else {
            if (processor.type === 'XML') {
              // process XML using this processor
              processXML(name, uri, processor, resp, callback);
            } else {
              GLOBAL.error('unknown processor type', processor.type);
            }
          }
        });
      });
    }
  });
}

// process retrieved content as XML
function processXML(name, uri, processor, resp, callback) {
  var parser = new xml2js.Parser();

  parser.parseString(resp, function (err, xml) {
    if (err) {
      GLOBAL.error(name, err);
      return;
    } else {
      processor.getAnnotations(name, uri, xml, function(err, annoRows) {
        callback(err, {name: name, uri: uri, annoRows: annoRows});
      });
    }
  });
}
