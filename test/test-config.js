var winston = require('winston');
var domain = 'localhost', http_port = 9988;

var logger = new (winston.Logger)({
    transports: [
      new (winston.transports.Console)({ level: 'error' }),
      new (winston.transports.File)({ filename: 'tests.log' })
    ]
  });

GLOBAL.debug = logger.debug;
GLOBAL.info = logger.info;
GLOBAL.warn = logger.warn;
GLOBAL.error = logger.error;

var esOptions ={ _index : 'test', server : { host : domain, port : 9200 }};

exports.config = {
  project: 'sensebase-test',
  DOMAIN: domain,
  FAYEHOST: 'http://' + domain + ':' + http_port + '/montr',
  ESEARCH: esOptions,
  HTTP_PORT: 9988,
  ESEARCH_URI: 'http://' + domain + ':' + esOptions.server.port + '/' + esOptions._index,
  HOMEPAGE: 'http://' + domain,
  AUTH_PORT: http_port,
  PROXY_PORT: 7079,
  SPOTLIGHT: { host: domain, port: 6272},
  SENTIMENT: { host: domain, port: 8002},
  NOCACHE_REGEX: '.*.' + domain,
  CACHE_DIR : './cache',
  uploadDirectory: './uploads',
  doCache : true,
  doAuth: true,
  logStream : { write: function() {}}
}