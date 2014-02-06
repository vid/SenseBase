var elasticsearch = require('es'), es;

exports.indexPage = indexPage;
exports.retrieveByURI = retrieveByURI;
exports.getEsDoc = getEsDoc;
exports.scrapeSearch = scrapeSearch;
exports.formSearch = formSearch;
exports.saveScrape = saveScrape;
exports.index = index;
exports.indexBulk = indexBulk;

// formats a cachedPage based on input
function getEsDoc(options) {
  var esDoc;
  esDoc = { uri : options.uri, title: options.title, content : options.content, '@timestamp': new Date().toISOString(), visitors: [], referers: []};

  if (options.member) {
    esDoc.visitors.push({ member: options.member, '@timestamp': new Date().toISOString() });
  }
  if (options.referer) {
    esDoc.referers.push(options.referer);
  }
  if (options.headers) {
      esDoc.headers = options.headers;
  }
  if (options.annotations) {
    // merge annotations FIXME
    var da = esDoc.annotations || '[]';
    da = JSON.parse(da);
    options.annotations.forEach(function(a) {
      var there = false;
      da.forEach(function(anno) {
        if ((anno.value || anno.quote) == (a.value || a.quote)) {
          there = true;
        }
      });
      if (!there) {
        da.push(a);
      }
    });
    esDoc.annotations = JSON.stringify(da, null, 2);
  }
  return esDoc;
}

// indexes a cachedPage by inserting or updating
function indexPage(options) {
  if (!options.isHTML) {
    GLOBAL.debug('not indexing', options.uri, options.contentType);
    return;
  }
  var esDoc, existed;
  retrieveByURI(options.uri, function(err, results) {
    if (err) {
      GLOBAL.debug('indexPage retrieveByURI ERROR', err);
    }
    if (results && results._source) { // create starting doc
      GLOBAL.info('INDEXING existing', options.uri);
      esDoc = results._source;
      existed = true;
    } else {
      GLOBAL.info('INDEXING new', options.uri);
      esDoc = getEsDoc(options);
    }
    if (esDoc) {
      getEs().index({_type: 'cachedPage', _id: encodeURIComponent(options.uri)}, esDoc, function (err, res) {
        if (err) {
          GLOBAL.error('INDEXING error', options.uri, err);
        }
        if (options.callback) {
          options.callback(err, res);
        }
      });
    }
  });
}

// save a scrape definition
function saveScrape(scrape, callback) {
  scrape['id'] = scrape['name'];
  indexBulk({_index : 'ps', _type : 'savedScrapes'}, scrape, function(err, res){ 
    if (callback) {
      callback(err, res);
    } else {
      if (err) throw(err); 
    }
  });
}

// retrieves a cachedPage by uri
function retrieveByURI(uri, callback) {
  getEs().get({ _id: encodeURIComponent(uri), _type: 'cachedPage'}, callback);
};

function scrapeSearch(search, callback) {
  var qchecks = [], qhosts = [];
  var q = {
    fields : ['name', 'status', 'lastRun', 'author', 'tags', 'found'],
/*    sort : [
      { "lastRun" : {"order" : "desc"}},
    ],*/
    size : 500,
    "query": {
      "filtered": {
        "query": {
          "bool": {
            "must_not": [{ match : { status : 'deleted' } }]
          }
        }
      }
    }
  };

  getEs().search({ _index : 'ps', _type : 'savedScrapes'}, q, function(err, res) {
    callback(err, res);
  });
}

// Executes a form search, returning results
function formSearch(search, callback) {
  var q = {
    fields : ['_id', 'uri', '@timestamp', 'title', 'visitors', 'annotations', 'accessors'],
    sort : [
      { "visitors.@timestamp" : {"order" : "desc"}},
    ],
    size : 500,
    "query": {
      "filtered": {
        "query": {
          "bool": {
            "must": []
          }
        }
      }
    }
  };

  if (search.terms) { 
    q.query.filtered.query.bool.must.push({ match : { content : search.terms } });
  }
  if (search.annotations) { 
    q.query.filtered.query.bool.must.push({ match : { annotations : search.annotations } });
  }
  if (search.member) { 
    q.query.filtered.query.bool.must.push({ match : { 'visitors.member' : search.member } });
  }

  var dates = [];
  if (search.from) { 
    dates.push( { range: { "@timestamp" : { gt: search.from} } });
  }
  if (search.to) { 
    dates.push( { range: { "@timestamp" : { gt: search.to} } });
  }
  if (dates.length) {
    q.query.filtered.filter = { filter : dates };
  }

  getEs().search({ _index : 'ps', _type : 'cachedPage'}, q, function(err, res) {
    if (!res || res.hits.hits.length < 1) {
      GLOBAL.debug('NO HITS FOR', JSON.stringify(q, null, 2));
    }
    callback(err, res);
  });
}

// indexes a single document
function index(options, doc, callback) {
  indexBulk(options, [doc], callback);
}

// indexes a set of documents
function indexBulk(options, docs, callback) {
  if (!Array.isArray(docs)) { docs = [docs]; }
  GLOBAL.debug('inserting', docs.length, options._type);
  var tc = [];
  docs.forEach(function(d) {
    tc.push({ index : options});
    tc.push(d);
  });
  getEs().bulk(tc, function (err, data) {
    if (err) {
      GLOBAL.error('on', options, docs);
      throw (err);
    }
    if (callback) callback();
  });
}

exports.search = function(options, query, callback) {
  getEs().search(options, query, callback);
};

// get or instantiate elasticsearch connection
function getEs() {
  if (!es) {
    es = elasticsearch(GLOBAL.config.ESEARCH);
  }
  return es;
}

