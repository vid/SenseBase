
(= (= (= (= (= (= (=
# UNDER CONSTRUCTION
(= (= (= (= (= (= (=

npm install SenseBase

# Manual install

* Copy tika-app (tested with tika-app-1.4.jar) to ext-lib for document conversion


# Configure

create a config.js:

```var winston = require('winston');
var domain = 'my.great.domain';

GLOBAL.debug = winston.debug;
GLOBAL.info = winston.info;
GLOBAL.warn = winston.warn;
GLOBAL.error = winston.error;

exports.config = {
  project: 'proxiris',
  DOMAIN: domain,
  FAYEHOST: 'http://faye.' + domain + ':9999/montr',
  ESEARCH: { _index : 'ps', server : { host : 'es.' + domain, port : 9200 } },
  HOMEPAGE: 'http://dashboard.' + domain,
  AUTH_PORT: 9999,
  PROXY_PORT: 8089,
  SPOTLIGHT: { host: 'spotlight' + domain, port: 7272},
  SENTIMENT: { host: 'sentiment' + domain, port: 9002},
  NOCACHE_REGEX: '.*.' + domain,
  CACHE_DIR : '/some/dir',
  uploadDirectory: './uploads',
  doCache : true,
  doAuth: true,
  logStream : { write: function() {}},
//  logStream : fs.createWriteStream('/tmp/connect.log'),
  serviceKeys: {
    wikiMeta: 186691395332
  }
}```


# run

create a bootstrap that looks like this:

```var senseBase = require('./index.js');

senseBase.start(require('./config.js').config);```

* start services

node bootstrap.js

