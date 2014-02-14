
(= (= (= (= (= (= (=
# UNDER CONSTRUCTION
(= (= (= (= (= (= (=

npm install SenseBase

Then npm install if you are working directly in the source base.

Presuming a debian derived distro, you will need to have build-essentials installed

For document conversion, copy tika-app (tested with tika-app-1.4.jar) to ext-lib to match bin/extractText.sh

# Configure

create a config.js:

     
    // logging
    var winston = require('winston');
     
    GLOBAL.debug = winston.debug;
    GLOBAL.info = winston.info;
    GLOBAL.warn = winston.warn;
    GLOBAL.error = winston.error;

    var domain = 'my.great.domain';
    var esOptions ={ _index : 'ps', server : { host : 'es.' + domain, port : 9200 }};
    
    exports.config = {
      project: 'sensebase',
      DOMAIN: domain,
      FAYEHOST: 'http://faye.' + domain + ':9999/montr',
      ESEARCH:  esOptions,
      ESEARCH_URI: 'http://es.' + domain + ':' + esOptions.server.port + '/' + esOptions._index,
      HOMEPAGE: 'http://dashboard.' + domain,
      AUTH_PORT: 9999,
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

# Acknowledgement

This project is supported by and forms the basis of http://www.github.com/TsangLab/Proxiris.

