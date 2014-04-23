var winston = require('winston');
var domain = 'localhost', http_port = 9988, method='http://';

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
  logStream : { write: function() {}},
  annotationLocations: {
    'ncbi\.nlm\.nih\.gov/pubmed/\\?term=' : { resultLinks: ['.rslt'] }, // FIXME javascript for pager
    '.*\.ncbi\.nlm\.nih\.gov/pubmed/' : { name: 'NCBI PubMed', selector: '.abstr', addRequest: [{name: 'MeSH', processor: 'pubMedXML'}] },
    '.*\.ncbi\.nlm\.nih\.gov/pmc/articles/' : { selector: '.jig-ncbiinpagenav' },
    '.*\.wikipedia\.org/' : { selector: '#bodyContent' },
    '.*\.sciencedirect\.com/science/article/' : { selector: '#centerInner' },
    '.*\.link\.springer\.com/article/' : { selector: '.abstract-content' },
    '.*bing\.com/search\\?q=' : { navLinks : ['.sb_pagF' ], resultLinks: ['.b_algo' ] },
    'clinicaltrials\.gov/ct2/results' : { navLinks : ['#list_page_controls_bottom'], resultLinks: ['.data_table'] },
    'search\.clinicalevidence\.bmj\.com/s/search.html' : { resultLinks: ['#search-results'] }, // FIXME has no pager but an option for all results
    'evidence\.nhs\.uk/search' : { navLinks : ['#Pagination'], resultLinks : ['#SearchResults'] },
    'scholar\.google\.ca/scholar\\?q=' : { navLinks: ['#gs_n'], resultLinks: ['.gs_rt'] },
    'tripdatabase\.com/search' : { navLinks: ['.pagination'], resultLinks: ['.result-main h3'] },
    'gsearch\.php\\?' : { resultLinks: ['.gs-title'] }, // FIXME javascript for pager
    'answers\.yahoo\.com/search/search_result\\?' : { navLinks: ['#ya-sr-pg'], resultLinks: ['li'] }, // FIXME javascript for pager
    'patient\.co\.uk/search.asp\\?searchterm=' : { navLinks: ['.pager'], resultLinks: ['.search-result-item'] }
  },
  structuralMatches: [
    {
      source: method + domain + '.*',
      name: 'medical report',
      matches: ['Date of Admission: (.*?)\n', 'Date of Discharge to Home:(.*?)\n', 'Admitting Diagnosis:([\s\S]*?)\n', 'Discharge Diagnosis:(.*?)\n', 'Discharge Condition:(.*?)\n',
        'Consults:(.*?)\n', 'Procedures:(.*?)\n', 'Brief History of Present Illness:(.*?)\n', 'Hospital Course:(.*?)\n', 'Physical Examination at Discharge:(.*?)\n',
        'Weight:(.*?)\n', 'General:(.*?)\n', 'HEENT:(.*?)\n', 'CVS:(.*?)\n', 'Respitory:(.*?)\n', 'Addomen:(.*?)\n', 'Extremities:(.*?)\n', 'Skin:(.*?)\n', 'Neuro:(.*?)\n',
        'Medications:(.*?)\n', 'Activity:(.*?)\n', 'Diet:(.*?)\n', 'Follow Up:(.*?)\n', 'Instructions:(.*?)\n'],
      type: 'orderedFields',
      fields: ['Date of Admission', 'Date of Discharge to Home', 'Admitting Diagnosis', 'Discharge Diagnosis', 'Discharge Condition',
        'Consults', 'Procedures', 'Brief History of Present Illness', 'Hospital Course', 'Physical Examination at Discharge',
        'Weight', 'General', 'HEENT', 'CVS', 'Respitory', 'Addomen', 'Extremities', 'Skin', 'Neuro',
        'Medications', 'Activity', 'Diet', 'Follow Up', 'Instructions']
    }
  ]
}
