
# UNDER CONSTRUCTION

Interest in this software is welcome.  

## Install

Install ElasticSearch (1.0+) and Node.js (tested with version 0.10). You'll optionally need the ElasticSearch carrot2 plugin for clustering.

Check out the SenseBase repo, `cd` to it, then `npm install`; `npm install -g grunt-cli`; `npm install -g bower`

## Configure

create a config.js:

	// set up logging
	var winston = require('winston');

	['debug', 'info', 'warn', 'error'].forEach(function(e) {
	  GLOBAL[e] = winston[e];
	});

	var domain = 'localhost',
	  namespace = '',
	  port = 9999,
	  fayemount = namespace + '/faye',
	  base = 'http://' + domain + (port ? ':' + port : '') + namespace;
	var esOptions ={ _index : 'ps', server : { host : domain, port : 9200 }};
	exports.config = {
	  namespace: namespace,
	  project: 'ps',
	  FAYEMOUNT: fayemount,
	  FAYEHOST: 'http://' + domain + (port ? ':' + port : '') + fayemount,
	  ESEARCH: esOptions,
	  ESEARCH_URI: 'http://' + esOptions.server.host + ':' + esOptions.server.port + '/' + esOptions._index,
	  HOMEPAGE: base + '/',
	  AUTH_PORT: port,
	  PROXY_PORT: 8089,
	  SPOTLIGHT: { host: domain, port: 7272},
	  NOCACHE_REGEX: '.*.' + domain,
	  CACHE_DIR : '/home/vid/pcache/',
	  uploadDirectory: './uploads',
	  doCache : true,
	  doAuth: true,
	  logStream : { write: function() {}},
	  apis : { <configured api keys> }
	//
	};

Then `grunt libs`. Finally, `grunt clientids` to initialize local-site.json and assign local authentication IDs for agents.

## Run

Launch the software standalone with `node app.js` (after generating assets), or just by running `grunt` (the default task).

If including SenseBase from your own project, you can create a bootstrap that looks like this:

    var senseBase = require('SenseBase');

    senseBase.start(require('./config.js').config);

Start any services independently. For example, `node services/annotations/addRequest.js`. Or start all 'available' services by
executing `grunt services`.

# Develop

`grunt` watches code changes after starting app.js.

## Programming notes

app.js creates a configured instance of index.js.

index.js manages front-end access and bootstraps /lib/pubsub.js

All 'team' interaction is via pubsub.js. ElasticSearch is not exposed and should be firewalled.

Annotations are nested in ContentItems (ElasticSearch versions will be used to prevent conflict). ContentItems store a checksummed history.

ContentItems initially have an state of 'visited' (or 'queued' if searching, then 'visited' when retrieved). After their first annotation and an annotationSummary is added, this becomes 'annotated.'

Everything else (aside from direct field data) is saved as an annotation.

Global configuration and services used by libraries are via the GLOBAL.config and svc objects. Tests can use this to provide mocks.

## Services

SenseBase uses standalone services for annotations, retrieving searches, and other functions.

A few sample services are provided. Edit them by making them available in your local-site.json.

# Acknowledgement

This project is supported by and forms the basis of http://www.github.com/TsangLab/Proxiris, as well as work developed for the PatientSense project for [eHealth in Motion](http://www.ehealthinmotion.com) | [Dataparc](http://www.dataparc.com/) .

# Copyright notices

Uses material from NCBI. See http://www.ncbi.nlm.nih.gov/About/disclaimer.html
