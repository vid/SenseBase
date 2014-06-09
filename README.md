
(= (= (= (= (= (= (=
# UNDER CONSTRUCTION
(= (= (= (= (= (= (=

Install ElasticSearch.

npm install SenseBase

Then ```npm install```, ```bower install``` if you are working directly in the source base.

Presuming a debian derived distro, you will need to have build-essentials installed

# Configure

create a config.js:
     
    // logging
    var winston = require('winston');
     
    GLOBAL.debug = winston.debug;
    GLOBAL.info = winston.info;
    GLOBAL.warn = winston.warn;
    GLOBAL.error = winston.error;

    var domain = 'my.great.domain', http_port = 9999;
    var esOptions ={ _index : 'ps', server : { host : 'es.' + domain, port : 9200 }};
    
    exports.config = {
      project: 'sensebase',
      DOMAIN: domain,
      FAYEHOST: 'http://faye.' + domain + ':' + http_port + '/montr',
      ESEARCH:  esOptions,
      ESEARCH_URI: 'http://es.' + domain + ':' + esOptions.server.port + '/' + esOptions._index,
      HOMEPAGE: 'http://dashboard.' + domain,
      AUTH_PORT: http_port,
      HTTP_PORT: http_port,
      PROXY_PORT: 8089,
      SPOTLIGHT: { host: 'spotlight' + domain, port: 7272},
      SENTIMENT: { host: 'sentiment' + domain, port: 9002},
      NOCACHE_REGEX: '.*.' + domain,
      CACHE_DIR : '/some/dir',
      uploadDirectory: './static/files',
      doCache : true,
      doAuth: true,
      logStream : { write: function() {}}
    }

Copy site.json to local-site.json for local site data.

# Run

if including SenseBase from your own project, create a bootstrap (app.js) that looks like this:

    var senseBase = require('SenseBase');

    senseBase.start(require('./config.js').config);

start any services

then ```node app.js```


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

