// service that periodically checks for and requests queued content
/*jslint node: true */
'use strict';

var _ = require('lodash'), later = require('later');

require(process.cwd() + '/index.js').setup();
var clientID = GLOBAL.svc.auth.clientIDByUsername('system');

var pubsub = require('../lib/pubsub-client').init({ homepage: GLOBAL.config.HOMEPAGE, clientID: clientID }),
  searchLib = require('../lib/search.js');

var jobs = [];

setupJobs();

// capture updated searches
pubsub.search.subUpdated(setupJobs);

function setupJobs() {
  jobs.forEach(function(job) {
    job.clear();
    job = null;
  });
  jobs = [];

  GLOBAL.svc.indexer.retrieveSearches({}, function(err, res) {
    utils.passingError(err);
    if (res.hits && res.hits.total > 0) {
      _.pluck(res.hits.hits, '_source').forEach(function(search) {
        if (search.cron) {
          var sched = later.parse.cron(search.cron);
          console.log('setting up', search.searchName, search.cron, sched);

          var cron = later.setInterval(function() {
            console.log('running', new Date(), search);
            searchLib.queueSearcher(search);
          }, sched);

          jobs.push(cron);
        }
      });
    }
  });
}
