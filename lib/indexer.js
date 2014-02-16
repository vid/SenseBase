var elasticsearch = require('es'), es,
  http = require('http');

var annotations = require('../lib/annotations.js'), utils = require('../lib/utils');;

exports.saveContentItem = saveContentItem;
exports.saveAnnotations = saveAnnotations;
exports.retrieveAnnotations = retrieveAnnotations;
exports.resetAnnotations = resetAnnotations;
exports.retrieveByURI = retrieveByURI;
exports.scrapeSearch = scrapeSearch;
exports.formSearch = formSearch;
exports.saveScrape = saveScrape;
exports.index = index;
exports.indexBulk = indexBulk;
exports.moreLikeThis = moreLikeThis;

// fields that are broadcast
var publishFields = {_id : '_id', uri : 'uri', timestamp: 'timestamp', title: 'title', visitors : 'visitors', annotationSummary: 'annotationSummary'};

function resultToAnno(esDoc) {
  var annoDoc = {fields : {}};
  for (var f in publishFields) {
    annoDoc.fields[publishFields[f]] = esDoc[f];
  }
  return annoDoc;
}

// indexes a contentItem by inserting or updating
function saveContentItem(desc, callback) {
  if (!desc.isHTML) {
    GLOBAL.debug('not indexing', desc.uri, desc.contentType);
    return;
  }
  var cItem;
// check if it has already been indexed
  retrieveByURI(desc.uri, function(err, results) {
    if (err) {
      GLOBAL.debug('saveContentItem retrieveByURI ERROR', err);
    }
// it has
    if (results && results._source) { 
      GLOBAL.info('INDEXING update', desc.uri);
      cItem = results._source;
// it has not
    } else {
      GLOBAL.info('INDEXING new', desc.uri);
      cItem = annotations.createContentItem(desc);
    }

    if (cItem) {
// add additional data
      if (desc.member) {
        cItem.visitors.push({ member: desc.member, '@timestamp': new Date().toISOString() });
      }
      if (desc.referer) {
        cItem.referers.push(desc.referer);
      }
      if (desc.headers) {
        cItem.headers = desc.headers;
      }
      var id = cItem._id;
      delete cItem._id;
      getEs().index({_type: 'contentItem', _id: id}, cItem, function (err, res) {
        cItem._id = id;
        if (err) {
          GLOBAL.error('INDEXING error', cItem._id, err);
        }
        if (callback) {
          callback(err, res, resultToAnno(cItem));
        }
      });
    }
  });
}

// retrieves annotations by target
function retrieveAnnotations(target, callback) {
  var p = '';
  if (Array.isArray(target)) {
    var or = '';
    target.forEach(function(t) {
      p += (or + "hasTarget:\"" + t + "\"");
      or = " OR ";
    });
  } else {
    p = "hasTarget:\"" + target + "\"";
  }
  var query = {
    size : 10000,
    query: {
      query_string : {
        query : p
      }
    }
  }

  getEs().search({ _index : GLOBAL.config.ESEARCH._index, _type : 'annotation'}, query, function(err, res) {
    callback(err, res);
  });
}

// TODO delete annotations by this set's annotator/target and save this new set. accepts an item or array.
function resetAnnotations(annotator, target, annotations, callback) {
  var deleteQuery = {
    query: {
      query_string : {
        "query" : "annotatedBy:" + annotator + " AND hastarget:" + target
      }
    }
  };

  es.deleteByQuery(deleteQuery, function (err, data) {
    saveAnnotations(annotations, callback); 
  });
}

// save an individual content item's annotations. accepts an item or array.
function saveAnnotations(target, annotations, callback) {
  indexBulk({_index : GLOBAL.config.ESEARCH._index, _type : 'annotation'}, annotations, function(err, res) {
// delay for indexing
    setTimeout(function() { updateAnnotationCounts(target, callback); }, 1000);
    if (callback && err) { callback(err); return; }
  });
}

function updateAnnotationCounts(target, callback) {
  var query = {
    size: 0,
    query : { "query_string" : {query : "hasTarget:\"" + target +"\""} },
    facets : {
      tags : { terms : {field : "validated"} }
    }
  }
  getEs().search({ _index : GLOBAL.config.ESEARCH._index, _type : 'annotation'}, query, function(err, res) { // TODO add annotatedBy
    var annotationSummary = {};
    res.facets.tags.terms.forEach(function(t) {
      annotationSummary[t.term === 'T' ? 'validated' : 'unvalidated'] = t.count;
    });
    getEs().update({_type: 'contentItem', _id: encodeURIComponent(target)}, { "doc" : { annotationSummary: annotationSummary}, "doc_as_upsert" : true }, function(err, res) { console.log(err, res);})
    if (callback) { callback(err, res); }
  });
}

// retrieves an contentItem by uri
function retrieveByURI(uri, callback) {
  getEs().get({ _id: encodeURIComponent(uri), _type: 'contentItem'}, callback);
};

// save a scrape definition
function saveScrape(scrape, callback) {
  scrape['id'] = scrape['name'];
  indexBulk({_index : GLOBAL.config.ESEARCH._index, _type : 'savedScrapes'}, scrape, function(err, res){ 
    if (callback) {
      callback(err, res);
    } else {
      if (err) throw(err); 
    }
  });
}

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

  getEs().search({ _index : GLOBAL.config.ESEARCH._index, _type : 'savedScrapes'}, q, function(err, res) {
    callback(err, res);
  });
}
// Executes a form search, returning results
function formSearch(search, callback) {
  var q = {
    fields : Object.keys(publishFields),
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
    q.query.filtered.query.bool.must.push({ query_string : { query : search.terms } });
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

  getEs().search({ _index : GLOBAL.config.ESEARCH._index, _type : 'contentItem'}, q, function(err, res) {
    if (!res || res.hits.hits.length < 1) {
      GLOBAL.info('NO HITS FOR', JSON.stringify(q, null, 2));
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

// more like this field api
function moreLikeThis(uri, callback) {
  retrieveByURI(uri, function(err, res) {
    if (err) {
      callback(err);
      return;
    }
    var mlt = require('./moreLikeThis.js');
    var content = utils.getTextFromHtml(res._source.content);

    mlt.fields = Object.keys(publishFields);
    mlt.query.bool.should[0].mlt_field.content.like_text = content;
    mlt.query.bool.should[1].mlt_field.title.like_text = res._source.title;
    var data = JSON.stringify(mlt);

// FIXME ES more like this api
    var options = {
      host: GLOBAL.config.ESEARCH.server.host,
      port: GLOBAL.config.ESEARCH.server.port,
      path: GLOBAL.config.ESEARCH._index + '/contentItem/_search',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    var buffer = '';
    var req = http.request(options, function(res) {
      res.setEncoding('utf8');
      res.on('data', function (chunk) {
        buffer += chunk;
      });
      res.on('end', function() {
       callback(null, JSON.parse(buffer));
      });
    });

    req.write(data);
    req.end();

  });
}

// get or instantiate elasticsearch connection
function getEs() {
  if (!es) {
    es = elasticsearch(GLOBAL.config.ESEARCH);
  }
  return es;
}

