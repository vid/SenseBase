// indexing functions; save, search, management for Annotations and ContentItems

var elasticsearch = require('es'), es,
  http = require('http');

var annotations = require('../lib/annotations.js'), utils = require('../lib/utils');

exports.saveHTMLContentItem = saveHTMLContentItem;
exports.saveContentItem = saveContentItem;
exports._saveContentItem = _saveContentItem;
exports.saveAnnotations = saveAnnotations;
exports.retrieveAnnotations = retrieveAnnotations;
exports.resetAnnotations = resetAnnotations;
exports.retrieveByURI = retrieveByURI;
exports.scrapeSearch = scrapeSearch;
exports.formSearch = formSearch;
exports.formCluster = formCluster;
exports.saveScrape = saveScrape;
exports.moreLikeThis = moreLikeThis;
exports.deleteContentItems = deleteContentItems;
exports.updateContent = updateContent;
exports.updateQueued = updateQueued;

// fields that are broadcast
var publishFields = ['_id', 'uri', 'timestamp', 'title', 'visitors', 'annotationSummary'];
// fields that are returned in a query
var sourceFields = ['_id', 'uri', 'timestamp', 'title', 'visitors.*', 'annotationSummary.*', 'state', 'queued.*'];

// copy a cItem to elasticsearch field result format
function resultToContentItem(esDoc) {
  var annoDoc = {_source : {}};
  publishFields.forEach(function(f) {
    annoDoc._source[f] = esDoc[f];
  });
  return annoDoc;
}

// determines if an html title exists, if so, index this page
function saveHTMLContentItem(desc, callback) {
  var m = /<title.*?>(.*)<\/title>/mi.exec(desc.content);
  if (m && m[1]) {
    var title = m[1].replace(/<.*?>/g);
    GLOBAL.debug('INDEX', desc.uri, title, desc.content.length);
    desc.title = title;
    saveContentItem(desc, callback);
    return;
  }
  GLOBAL.debug('not an html item', desc.uri);
  callback(false);
}

// indexes a contentItem by inserting or updating
function saveContentItem(desc, callback) {
  GLOBAL.debug('saveContentItem', desc.uri, desc.contentType);
  var cItem;
// check if it has already been indexed
  retrieveByURI(desc.uri, function(err, results) {
//    utils.passingError(err);
// it has
    if (results && results._source) { 
      GLOBAL.info('INDEXING update', desc.uri);
      cItem = results._source;
      cItem.content = desc.content;
      cItem.title = desc.title || cItem.title;
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

  if (cItem.content && cItem.content !== utils.NOCONTENT) {
    // FIXME use ES copy_to
    cItem.text = utils.getTextFromHtml(cItem.content);
  }
  
  // determine and assign state
  cItem.previousState = cItem.state;
  if (!cItem.content || cItem.content.length < 1) {
    cItem.state = 'queued';
  } else if (cItem.annotationSummary) {
    cItem.state = 'annotated';
  } else {
    cItem.state = 'visited';
  }
  // update annotation summary
  annotationSummary = { validated: 0, unvalidated: 0, erased: 0 };
  (cItem.annotations || []).forEach(function(a) {
    if (a.state === utils.states.erased) {
      annotationSummary.erased = annotationSummary.erased + 1;
    } else if (a.state === utils.states.validated) {
      annotationSummary.validated = annotationSummary.validated + 1;
    } else {
      annotationSummary.unvalidated = annotationSummary.unvalidated + 1;
    }
  });

  cItem.annotationSummary = annotationSummary;

  delete cItem._id;
  // annomerge
  getEs().index({_type: 'contentItem', _id: id}, cItem, function (err, res) {
    cItem._id = id;
    if (err) {
      GLOBAL.error('INDEXING error', cItem._id, err);
    }
    if (callback) {
      callback(err, res, cItem);
    }
  });
}

// retrieves annotations by target
function retrieveAnnotations(target, callback) {
  retrieveByURI(target, function(err, res) {
    if (res._source) {
      callback(null, res._source.annotations);
    } else {
      callback(err, null);
    }
  });
}

// delete (move to delete) array of cItem by URI
function deleteContentItems(cItemURIs, callback) {
  cItemURIs.forEach(function(uri) {
    retrieveByURI(uri, function(err, uriRes) {
      if (err) { console.log('delete retrieve err', err); return; }
      if (!uriRes._source) { console.log('delete not retrieved', uriRes); return; }
      // save to removedItem
      getEs().index({_type: 'removedItem'}, uriRes._source, function (err, removeRes) {
        // annomerged
        if (err) { 
          console.log('delete anno err', err); 
          return; 
        }
        getEs().delete({ _type: 'contentItem', _id : encodeURIComponent(uri)}, function(err, deleteRes) {
          if (callback) {
            callback(err, deleteRes);
          }
          if (err) { 
            console.log('delete err', err); 
            return; 
          }
        });
      });
    });
  });
}

// delete annotations by this set's target and optionally annotator, and optionally save new set
function resetAnnotations(options, callback) {
  // annomerged
  console.log('FIXME resetAnnotations');
}

// save an individual content item's annotations. accepts an item or array.
// FIXME: use versioning to detect collisions. if an exact annotation exists, save will fail
function saveAnnotations(target, newAnnos, callback) {
  if (!annotations || annotations.length < 1) {
    GLOBAL.error('trying to save 0 annotations');
    if (callback) { callback(); }
    return;
  }
  retrieveByURI(target, function(err, res) {
    if (err) {
      callback(err);
      return;
    }

    var cItem = res._source;
    // retrieve existing CI's annotations
    var curAnnos = cItem.annotations || [];
    //FIXME better duplicate detection
    curAnnos.forEach(function(ca) {
      if (newAnnos.indexOf(ca)) {
        delete curAnnos[ca];
      }
    });

    newAnnos = curAnnos.concat(newAnnos);
    cItem.annotations = newAnnos;
    _saveContentItem(cItem, callback);

  });

}

// update queue lastAttempt
function updateQueued(uri, queued, callback) {
  // annomerge
  getEs().update({_type: 'contentItem', _id: encodeURIComponent(uri)}, { 'doc' : { queued: queued} }, function(err, res) {
    callback(err, res);
  });
}

// update the contents of a contentItem
function updateContent(desc, callback) {
  saveHTMLContentItem(desc, callback);
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

// formulates a query based on form contents
function createFormQuery(search) {
  var qs = [], query_string;

  if (search.terms) { 
    if (search.terms.indexOf(':') < 0) {
      qs.push('(text:"' + search.terms + '" OR title:"' + search.terms + '")');
    } else {
      qs.push(search.terms);
    }
  }

  if (search.member && search.annotationState) {
    switch(search.annotationState) {
      case 'visited' :
        qs.push('visitors.member:' + search.member);
        break;
      case 'requested' :
        qs.push('(annotationSummary.requestedFrom:' + search.member + ' OR state:retreived)');
        break;
      case 'provided' : 
        qs.push('annotations.annotatedBy:' + search.member);
        break;
      default:
       GLOBAL.error('unknown validationState', search.validationState);
    }
  }

  if (search.validationState && search.validationState !== 'all') {

    switch(search.validationState) {
      case 'queued' : 
        qs.push('state:queued');
        break;
      case utils.state.erased :
        qs.push('state:' + utils.state.erased);
        break;
      case 'valOrUnval' :
        qs.push('NOT state:queued');
        break;
      case 'val' :
        qs.push('annotationSummary.validated:>0');
        break;
      case 'unval' : 
        qs.push('annotationSummary.unvalidated:>0');
        break;
      case 'notann' : 
        qs.push('(annotationSummary.validated:<1 AND annotationSummary.unvalidated:<1)');
        break;
      default:
       GLOBAL.error('unknown validationState', search.validationState);
    }
  }

// annomerge
  if (search.annotations) { 
    qs.push('annotations.category:' + search.annotations);
  }

  if (!qs.length) {
    query_string = '*';
  } else {
    query_string = qs.join(' AND ');
  }

  var query = {
    bool : {
      must : [
        { 
          query_string : { 
            query : query_string 
         } 
       }
      ]
    }
  };

/*
FIXME
  var dates = [];
  if (search.from) { 
    dates.push( { range: { "@timestamp" : { gt: search.from} } });
  }
  if (search.to) { 
    dates.push( { range: { "@timestamp" : { gt: search.to} } });
  }
  if (dates.length) {
    query.filtered = {filter : { filter : dates } }
  }
*/

  return query;
}

// Executes a form search, returning results
function formSearch(search, callback, options) {
  options = options || {};
  var query = createFormQuery(search);
  var q = {
    _source : options.sourceFields || sourceFields,
    sort : options.sort || [
      { "visitors.@timestamp" : {"order" : "desc"}},
    ],
    size : options.size || 500,
    query: query
  };
  if (search.terms) {
    q.highlight = { fields: {"title" : {}, "text" : {}}};
  }

  getEs().search({ _index : GLOBAL.config.ESEARCH._index, _type : 'contentItem'}, q, function(err, res) {
    if (err) {
      utils.passingError(err);
      res = {query : JSON.stringify(q, null, 2), error: err};
    } else {
      res.query = q;
      if (!res || res.hits.hits.length < 1) {
        GLOBAL.debug('NO HITS FOR', JSON.stringify(q, null, 2));
      }
    }
    callback(err, res);
  });
}

// Executes carrot2 cluster search
function formCluster(search, callback) {
  var query = createFormQuery(search);
  var q = {
    "search_request" : {
      _source : sourceFields.concat(['text']),
      sort : [
        { "visitors.@timestamp" : {"order" : "desc"}},
      ],
      size : 500,
      query: query
    }, 
    "query_hint": "*",
    "algorithm": "lingo",
    "field_mapping": {
      "title": ["_source.title"],
      "content": ["_source.text"],
      "url": ["_source.uri"]
    }
  };

  doPost('/contentItem/_search_with_clusters', JSON.stringify(q), function(err, res) {
    res.query = q;
    if (!res || res.hits.hits.length < 1) {
      GLOBAL.info('NO HITS FOR', JSON.stringify(q, null, 2));
    }
    // FIXME don't send text
    callback(err, res);
  });
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

    doPost('/contentItem/_search', data, callback);
  });
}

// get or instantiate elasticsearch connection
function getEs() {
  if (!es) {
    es = elasticsearch(GLOBAL.config.ESEARCH);
  }
  return es;
}

// POST for es functions that aren't locally supported
function doPost(path, data, callback) {
  var options = {
    host: GLOBAL.config.ESEARCH.server.host,
    port: GLOBAL.config.ESEARCH.server.port,
    path: GLOBAL.config.ESEARCH._index + path,
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(data)
    }
  };
  utils.doPostJson(options, data, callback);
}



