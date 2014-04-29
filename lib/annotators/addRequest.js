// secondary request for annotations

var xml2js = require('xml2js');
var annoLib = require('./annotateLib'), annotations = require('../../lib/annotations'), sites = require('../sites.js'), utils = require('../utils.js');

var name = 'addRequest';

//process({ uri: 'http://www.ncbi.nlm.nih.gov/pubmed/11139488'});

// wait for annotation requests
annoLib.requestAnnotate(process);

function process(combo) {
  var uri = combo.uri;

  var found = sites.findMatch(uri);

  GLOBAL.info(name, uri, found && found.addRequest);

// an additional request exists
  if (found && found.addRequest) {
    found.addRequest.forEach(function(areq) {
      var processor = sites.processors[areq.processor];
      var loc = processor.getURI(uri);
      console.log(loc, areq);
      // local name
      var name = areq.name;
      // retrieve contents and process
      utils.retrieve(loc, function(err, resp) {
        if (err) {
          GLOBAL.err(name, err);
        } else {
          if (processor.type === 'XML') {
            processXML(name, uri, processor, resp);
          }
        }
      });
    });
  }
}

// process retrieved content as XML
function processXML(name, uri, processor, resp) {
  var parser = new xml2js.Parser();

  parser.parseString(resp, function (err, xml) {
    if (err) {
      GLOBAL.error(name, err);
      return;
    } else {
      processor.getAnnotations(name, uri, xml, function(annoRows) {
        annoLib.publishAnnotations(name, uri, annoRows);
      });
    }
  });
}
