// service that periodically checks for and requests queued content
/*jslint node: true */
'use strict';

var _ = require('lodash'), later = require('later');

GLOBAL.config = require('../config.js').config;
var auth = require('../lib/auth');
auth.setupUsers(GLOBAL);
var clientID = auth.clientIDByUsername('system');
var pubsub = require('../lib/pubsub-client').init({ homepage: GLOBAL.config.HOMEPAGE, clientID: clientID });
GLOBAL.config.indexer = require('../lib/indexer.js');
var jobs = [];

var searchLib = require('../lib/search.js');
setupJobs();

pubsub.subSearchUpdates(setupJobs);

function setupJobs() {
  jobs.forEach(function(job) {
    job.clear();
    job = null;
  });
  jobs = [];
  console.log('JOBS', JSON.stringify(jobs, null, 2));

  GLOBAL.config.indexer.retrieveSearches({}, function(err, res) {
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
