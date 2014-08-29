// service that periodically checks for and requests queued content
/*jslint node: true */
'use strict';

GLOBAL.config = require('../config.js').config;
GLOBAL.config.indexer = require('../lib/indexer.js');

var _ = require('lodash'), later = require('later');

var crons = [];
checkCrons();

function checkCrons() {
  var i = crons.length;
  for (i; i > 0; i--) {
    delete crons[i];
  }

  GLOBAL.config.indexer.retrieveSearches({}, function(err, res) {
    if (res.hits && res.hits.total > 0) {
      _.pluck(res.hits.hits, '_source').forEach(function(search) {
        if (search.cron) {
          var secs = later.parse.cron(search.cron);
          console.log('setting up', search.searchName, search.cron, secs);

          // execute logTime one time on the next occurrence of the text schedule
          var cron = later.setTimeout(function() {console.log(search);}, secs);

          crons.push(cron);
        }else{ console.log('no', search);}
      });
    }
  });
  setInterval(checkCrons, 5000);
}
