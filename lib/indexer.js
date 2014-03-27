var elasticsearch = require('es'), es,
  http = require('http');

var annotations = require('../lib/annotations.js'), utils = require('../lib/utils');

exports.saveContentItem = saveContentItem;
exports._saveContentItem = _saveContentItem;
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
exports.deleteContentItems = deleteContentItems;
exports.updateContent = updateContent;

// fields that are broadcast
var publishFields = ['_id', 'uri', 'timestamp', 'title', 'visitors', 'annotationSummary'];
// fields that are returned in a query
var sourceFields = ['_id', 'uri', 'timestamp', 'title', 'visitors.*', 'annotationSummary.*'];

// copy a cItem to elasticsearch field result format
function resultToAnno(esDoc) {
  var annoDoc = {_source : {}};
  publishFields.forEach(function(f) {
    annoDoc._source[f] = esDoc[f];
  });
  return annoDoc;
}

// indexes a contentItem by inserting or updating
function saveContentItem(desc, callback) {
  GLOBAL.debug('saveContentItem', desc.uri, desc.contentType);
  if (!desc.isHTML) {
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
      _saveContentItem(cItem, callback);
    }
  });
}

// save a well formed cItem
function _saveContentItem(cItem, callback) {
  var id = cItem._id || encodeURIComponent(cItem.uri);
  if (id.indexOf('http') !== 0) {
    throw Error('_saveContentItem not an http id ' + JSON.stringify(id, null, 2));
  }
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
  };

  getEs().search({ _index : GLOBAL.config.ESEARCH._index, _type : 'annotation'}, query, function(err, res) {
    callback(err, res);
  });
}

// delete (move to delete) array of cItem by URI
function deleteContentItems(cItemURIs, callback) {
  cItemURIs.forEach(function(uri) {
    retrieveByURI(uri, function(err, res) {
      if (err) { console.log('delete retrieve err', err); return; }
      if (!res._source) { console.log('delete not retrieved', res); return; }
      getEs().index({_type: 'removedItem'}, res._source, function (err, res) {
        if (err) { console.log('delete index err', err); return; }
        retrieveAnnotations(uri, function(err, res) {  
          if (err) { console.log('delete anno err', err); return; }
          //FIXME
//          saveAnnotations(uri, res.hits.hits.map(function(a) { return a._source; }));
          getEs().delete({ _type: 'contentItem', _id : encodeURIComponent(uri)}, function(err,res) {
            if (callback) {
              callback(err, res);
            }
            if (err) { console.log('delete err', err); return; }
          });
        });
      });
    });
  });
}

// delete annotations by this set's target and optionally annotator, and optionally save new set
function resetAnnotations(options, callback) {
  var deleteQuery = {
    query: {
      query_string : {
        "query" : (options.annotator ? "annotatedBy:" + options.annotator + ' AND ' : '') + 'hasTarget:"' + options.target + '" AND validated:false'
      }
    }
  };

  getEs().deleteByQuery({ _type: 'annotation' }, deleteQuery, function (err, data) {
    if (options.annotations && options.annotations.length) {
      saveAnnotations(options.annotations, callback); 
    } else {
      if (callback) {
        callback(err, data);
      }
    }
  });
}

// save an individual content item's annotations. accepts an item or array.
function saveAnnotations(target, annotations, callback) {
  if (!annotations || annotations.length < 1) {
    GLOBAL.error('trying to save 0 annotations');
    if (callback) { callback(); }
    return;
  }
  indexBulk({_index : GLOBAL.config.ESEARCH._index, _type : 'annotation', parent : target}, annotations, function(err, res) {
// FIXME delay for indexing
    if (err) {
      GLOBAL.error('saveAnnotations', err);
    } else {
      setTimeout(function() { updateAnnotationCounts(target, callback); }, 1000);
    }
    if (callback) { callback(err); }
  });
}

// update the contents of a contentItem
function updateContent(target, content, callback) {
  getEs().update({_type: 'contentItem', _id: encodeURIComponent(target)}, { "doc" : { content: content} }, function(err, res) {
    if (err) {
      GLOBAL.error('updateAnnotationCounts update', err);
    }
    if (callback) { callback(err, res); }
  });
}

function updateAnnotationCounts(target, callback) {
  var query = {
    size: 0,
    query : { "query_string" : {query : "hasTarget:\"" + target +"\""} },
    facets : {
      tags : { terms : {field : "validated"} }
    }
  };
  getEs().search({ _index : GLOBAL.config.ESEARCH._index, _type : 'annotation'}, query, function(err, res) { // TODO add annotatedBy
    console.log('CHECK DOC-AS_UPSERT');
    if (err) {
      GLOBAL.error('updateAnnotationCounts search', err);
    } else {
      var annotationSummary = {};
      res.facets.tags.terms.forEach(function(t) {
        annotationSummary[t.term === 'T' ? 'validated' : 'unvalidated'] = t.count;
      });
      getEs().update({_type: 'contentItem', _id: encodeURIComponent(target)}, { "doc" : { annotationSummary: annotationSummary}, "doc_as_upsert" : true }, function(err, res) { 
        if (err) {
          GLOBAL.error('updateAnnotationCounts update', err);
        }
      });
    }
    if (callback) { callback(err, res); }
  });
}

// retrieves an contentItem by uri
function retrieveByURI(uri, callback) {
  getEs().get({ _id: encodeURIComponent(uri), _type: 'contentItem'}, callback);
}

// save a scrape definition
function saveScrape(scrape, callback) {
  scrape.id = scrape.name;
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
var qs = '', and = "";

  if (search.terms) { 
    if (search.terms.indexOf(':') < 0) {
      qs = 'content:"' + search.terms + '" OR title:"' + search.terms + '"';
    } else {
      qs = search.terms;
    }
    and = ' AND ';
  }
  if (search.member) { 
    qs += and + 'visitors.member:' + search.member;
  }

  if (!qs) {
    qs = '*';
  }
/*
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
*/

  var q = {
    _source : sourceFields,

    sort : [
      { "visitors.@timestamp" : {"order" : "desc"}},
    ],
    size : 500,
    query: { 
      bool : {
        must : [
          { 
            query_string : { 
            query : qs 
          } 
         }
        ]
      }
    }
  };

  if (search.annotations) { 
    q.query.bool.must.push(
      {
        has_child : {
          type : "annotation",
          query : {
            query_string : {
              query : search.annotations
            }
          }
        }
      });
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

    mlt.fields = sourceFields;
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

