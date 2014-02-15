var spotlight = require('./annotateServices/spotlight.js');
var sentiment = require('./annotateServices/sentiment.js');
var classify = require('./annotateServices/classify.js');
var structural = require('./annotateServices/structural.js');
var annotationSet = require('./annotateServices/annotationSet.js');
//var wikimeta = require('./annotateServices/wikimeta.js');

var faye = require('faye');
var queue = require('queue-async');

// annotation cache
var savedAnnos = {}
//var allServices = [spotlight, sentiment, annotationSet, classify];
var allServices = [sentiment];
allServices.forEach(function(service) {
  savedAnnos[service.name] = {};
});

exports.annotate = function(services, uri, text, callback) {
  var useServices = [];
  allServices.forEach(function(service) {
    console.log(service, services, services.indexOf(service));
    if (services.indexOf(service.name) > -1) {
      useServices.push(service);
    }
  });
  GLOBAL.debug('processing with', useServices.map(function(m) { return m.name}));
  var getAnnos = queue();
  useServices.forEach(function(service) { // get cached or new for doc
    getAnnos.defer(function(saveCB) {
      if (savedAnnos[service.name][uri]) {
        console.log(uri, 'found', service.name, savedAnnos[service.name][uri].length);
        callback(service.name, savedAnnos[service.name][uri]);
        saveCB(null, []);
      } else {
        console.log(uri, 'processing');
          service.process(text, function(err, annoRows) {
            if (err) {
              console.log('annotate ERROR', service.name, err);
            } else {
              var retRows = {};
              var seen = {};
              var ser = function(a) { return a.quote + a.ranges[0].startOffset + a.types};
              annoRows.forEach(function(ar) { // delete any annotations in a tag
                var r = ar.ranges[0];
                if (text.indexOf('<', r.startOffset + 1) > text.indexOf('>', r.startOffset)) {
                //  console.log('ignoring intag ', text.substr(r.startOffset, 100));
                } else {
                //   console.log('keeping ', text.substr(r.startOffset, 100));
                  ar.created = new Date().toISOString();
                  ar.creator = service.name;
                  if (!retRows[ar.quote]) { retRows[ar.quote] = { quote: ar.quote, instances: [], created: new Date().toISOString()} }
                  if (!seen[ser(ar)]) { // FIXME: what's up w duplicates
                    retRows[ar.quote].instances.push(ar);
                    seen[ser(ar)] = 1;
                  }
                }
              });
              savedAnnos[service.name][uri] = retRows;
              callback(service.name, retRows);
              saveCB(null, retRows);
            } 
          });
      }
    });
    getAnnos.awaitAll(function(err, results) {
      var all = [];
      if (results) {
        results.forEach(function(result) {
          if (result) {
            for (var i in result) {
              result[i].instances.forEach(function(instance) {
                all.push(instance);
              });
            }
            var bayeux = new faye.NodeAdapter({mount: '/montr', timeout: 45});
            var fayeClient = new faye.Client(GLOBAL.config.FAYEHOST);
            fayeClient.publish('/saveAnnotations', { uri: uri, annotations: all});
          }
        });
      }
    });
  });
}

