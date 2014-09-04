// #site-requests
//
// Queries sites for additional data

/* jslint node: true */

'use strict';

var xml2js = require('xml2js');
var annotations = require('./annotations'), utils = require('./utils.js'), sites = require('./sites.js'), siteQueries = require('../util/siteQueries');

exports.processLocalFilenameSearch = function(match, uri, callback) {
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
};

exports.processFound = processFound;

function processFound(uri, callback) {
  var founds = sites.findMatch(uri);

  founds.forEach(function(found) {
// an additional request exists
    if (found.addRequest) {
      found.addRequest.forEach(function(areq) {
        // specific processor
        var processor = sites.processors[areq.processor];
        var loc = processor.getURI(uri);
        // local name
        var reqName = areq.name;
        // retrieve contents and process
        utils.retrieve(loc, function(err, resp) {
          if (err) {
            GLOBAL.error(reqName, err);
          } else {
            if (processor.type === 'XML') {
              // process XML using this processor
              processXML(reqName, uri, processor, resp, callback);
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
