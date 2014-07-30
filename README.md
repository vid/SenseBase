
(= (= (= (= (= (= (=
# UNDER CONSTRUCTION
(= (= (= (= (= (= (=

Install ElasticSearch and Node.js (tested with version 0.10).

`npm install SenseBase`
`npm install -g grunt`

Then `npm install`, `bower install`, `grunt libs`

# Configure

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
	  annotationLocations: {

	  },
	  structuralMatches: [ <configured structuralMatches> ],
	  apis : { <configured api keys> }
	//
	};

Copy site.json to local-site.json for local site data.

# Run

if including SenseBase from your own project, create a bootstrap (app.js) that looks like this:

    var senseBase = require('SenseBase');

    senseBase.start(require('./config.js').config);

start any services

then `node app.js`


# Develop

* npm install -g grunt-cli
* grunt
* Edit assets, grunt will generate final files

# Programming notes

app.js creates a configured instance of sensebase.js (index.js).

index.js manages access and bootstraps /lib.pubsub.js

All 'team' interaction is via pubsub.js. ElasticSearch is not exposed.

Annotations are a child relationship to contentItems.

ContentItems initially have an state of 'visited' (or 'queued' if scraping, then 'visited' when scraped). After their first annotation and an annotationSummary is added, this becomes 'annotated.'

Everything else (aside from direct field data) is saved as an annotation.

Global configuration and services used by libraries is via the GLOBAL.config object. Tests can use this to provide mocks.

# Acknowledgement

This project is supported by and forms the basis of http://www.github.com/TsangLab/Proxiris, as well as work developed for the PatientSense project for eHealth in Motion | Dataparc.

# Copyright notices

Uses material from NCBI. See http://www.ncbi.nlm.nih.gov/About/disclaimer.html

