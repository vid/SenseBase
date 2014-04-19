var winston = require('winston');
var domain = 'localhost';

GLOBAL.debug = winston.debug;
GLOBAL.info = winston.info;
GLOBAL.warn = winston.warn;
GLOBAL.error = winston.error;

var esOptions ={ _index : 'test', server : { host : domain, port : 9200 }};

exports.config = {
  project: 'sensebase-test',
  DOMAIN: domain,
  FAYEHOST: 'http://' + domain + ':9999/montr',
  ESEARCH: esOptions,
  ESEARCH_URI: 'http://' + domain + ':' + esOptions.server.port + '/' + esOptions._index,
  HOMEPAGE: 'http://' + domain,
  AUTH_PORT: 9999,
  PROXY_PORT: 8089,
  SPOTLIGHT: { host: domain, port: 7272},
  SENTIMENT: { host: domain, port: 9002},
  NOCACHE_REGEX: '.*.' + domain,
  CACHE_DIR : './cache',
  uploadDirectory: './uploads',
  doCache : true,
  doAuth: true,
  logStream : { write: function() {}}
}
