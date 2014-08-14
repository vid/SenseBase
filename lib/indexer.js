// indexing functions; save, query, management for Annotations and ContentItems
/*jslint node: true */

'use strict';

var elasticsearch = require('es'), es, http = require('http'),  crypto = require('crypto');

var annotations = require('../lib/annotations.js'), utils = require('../lib/utils');

// checksum content for uniqueness

// fields that are sent
var hitSize = 3000, publishFields = ['_id', 'uri', 'timestamp', 'title', 'visitors', 'annotationSummary'];
// fields that are returned in a query
var sourceFields = ['_id', 'uri', 'timestamp', 'title', 'visitors.*', 'annotationSummary.*', 'state'];

exports._saveContentItem = _saveContentItem;
exports.saveAnnotations = saveAnnotations;
exports.saveSubscription = saveSubscription;
//exports.deleteSubscription = deleteSubscription;
exports.retrieveSubscriptions = retrieveSubscriptions;
exports.retrieveAnnotations = retrieveAnnotations;
exports.retrieveByURI = retrieveByURI;
exports.retrieveSearches = retrieveSearches;
exports.formQuery = formQuery;
exports.formCluster = formCluster;
exports.saveSearch = saveSearch;
exports.moreLikeThis = moreLikeThis;
exports.deleteContentItems = deleteContentItems;
exports.updateQueued = updateQueued;
exports.sourceFields = sourceFields;

// copy a cItem to elasticsearch field result format
function resultToContentItem(esDoc) {
  var annoDoc = {_source : {}};
  publishFields.forEach(function(f) {
    annoDoc._source[f] = esDoc[f];
  });
  return annoDoc;
}

// save a well formed cItem
function _saveContentItem(cItem, callback) {
  var id = cItem._id || encodeURIComponent(cItem.uri);

  if (id.indexOf('http') !== 0) {
    throw new Error('_saveContentItem not an http id ' + JSON.stringify(id, null, 2));
  }

  // determine and assign state
  cItem.previousState = cItem.state;
  if (!cItem.content || cItem.content.length < 1) {
    cItem.state = 'queued';
    delete cItem.sha1;
    delete cItem.text;
  } else {
    cItem.sha1 = crypto.createHash('sha1').update(cItem.content, 'utf8').digest('hex');
    cItem.text = utils.getTextFromHtml(cItem.content);
    if (cItem.annotationSummary) {
      cItem.state = 'annotated';
    } else {
      cItem.state = 'visited';
   }
  }
  // update annotation summary
  var annotationSummary = { validated: 0, unvalidated: 0, erased: 0 };
  (cItem.annotations || []).forEach(function(a) {
    if (a.state === utils.states.annotations.erased) {
      annotationSummary.erased = annotationSummary.erased + 1;
    } else if (a.state === utils.states.annotations.validated) {
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

// delete (move to remove) array of cItem by URI
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
      if (callback) {
        callback(err);
      } else {
        throw(err);
      }
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

// retrieves an contentItem by uri
function retrieveByURI(uri, callback) {
  getEs().get({ _id: encodeURIComponent(uri), _type: 'contentItem'}, callback);
}

// save a subscription
function saveSubscription(subscription, callback) {
  indexBulk({_index : GLOBAL.config.ESEARCH._index, _type : 'subscriptions'}, subscription, function(err, res) {
    if (callback) {
      callback(err, res);
    } else {
      if (err) throw(err);
    }
  });
}

// Retrieve existing searches.
// FIXME limit "for"
function retrieveSubscriptions(member, options, callback) {
  var q = {
    _source : ['member', 'match', 'created'],
    size : hitSize,
    "query": {
      "filtered": {
        "query": {
          "bool": {
            "must": [
              {
                query_string: {
                  query:  options.for || 'member:"' +member + '"'
                }
              }
            ]
          }
        }
      }
    }
  };

  getEs().search({ _index : GLOBAL.config.ESEARCH._index, _type : 'subscriptions'}, q, function(err, res) {
    callback(err, res);
  });
}

// save a search definition
function saveSearch(search, callback) {
  indexBulk({_index : GLOBAL.config.ESEARCH._index, _type : 'savedSearches'}, search, function(err, res){
    if (callback) {
      callback(err, res);
    } else {
      if (err) throw(err);
    }
  });
}

// retrieve existing searches
function retrieveSearches(member, callback) {
  var qchecks = [], qhosts = [];
  var q = {
    _source : ['searchName', 'cron', 'input', 'relevance', 'team', 'categories', 'member', 'targetResults'],
    size : hitSize,
    query: {
      bool: {
        must: [
          {
            query_string: {
              query: 'member:"' + member + '"'
            }
          }
        ]
      }
    }
  };

  getEs().search({ _index : GLOBAL.config.ESEARCH._index, _type : 'savedSearches'}, q, function(err, res) {
    callback(err, res);
  });
}

// formulates a query based on form contents
function createFormQuery(params) {
  var qs = [], query_string;

  if (params.terms) {
    if (params.terms.indexOf(':') < 0) {
      qs.push('(text:"' + params.terms + '" OR title:"' + params.terms + '")');
    } else {
      qs.push(params.terms);
    }
  }

  if (params.member && params.annotationState) {
    switch(params.annotationState) {
      case 'visited' :
        qs.push('visitors.member:' + params.member);
        break;
      case 'requested' :
        qs.push('(annotationSummary.requestedFrom:' + params.member + ' OR state:retreived)');
        break;
      case 'provided' :
        qs.push('annotations.annotatedBy:' + params.member);
        break;
      default:
       GLOBAL.error('unknown validationState', params.validationState);
    }
  }

  if (params.validationState && params.validationState !== 'all') {

    switch(params.validationState) {
      case 'queued' :
        qs.push('state:queued');
        break;
      case utils.states.annotations.erased :
        qs.push('state:' + utils.states.annotations.erased);
        break;
      case 'valOrUnval' :
        qs.push('NOT state:queued');
        break;
      case utils.states.annotations.validated :
        qs.push('annotationSummary.validated:>0');
        break;
      case utils.states.annotations.unvalidated :
        qs.push('annotationSummary.unvalidated:>0');
        break;
      case 'notann' :
        qs.push('(annotationSummary.validated:<1 AND annotationSummary.unvalidated:<1)');
        break;
      default:
       GLOBAL.error('unknown validationState', params.validationState);
    }
  }

// annomerge
  if (params.annotationSearch) {
    if (params.annotationSearch.indexOf(':') > 0) {
      // FIXME value hack
      var a = params.annotationSearch.replace(/"/g, '').split(':');
      qs.push('annotations.key:' + a[0] + ' AND annotations.value:' + a[1]);
    } else {
      qs.push('annotations.category:' + params.annotationSearch);
    }
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
  if (params.from) {
    dates.push( { range: { "@timestamp" : { gt: params.from} } });
  }
  if (params.to) {
    dates.push( { range: { "@timestamp" : { gt: params.to} } });
  }
  if (dates.length) {
    query.filtered = {filter : { filter : dates } }
  }
*/

  return query;
}

// Executes form params, returning results
function formQuery(params, callback, options) {
  options = options || {};
  var query = createFormQuery(params);
  var q = {
    _source : options.sourceFields || sourceFields,
    sort : options.sort || [
      { "visitors.@timestamp" : {"order" : "desc"}},
    ],
    size : options.size || Math.min(hitSize, params.browseNum),
    query: query
  };
  if (params.terms) {
    q.highlight = { fields: {"title" : {}, "text" : {}}};
  }

  getEs().search({ _index : GLOBAL.config.ESEARCH._index, _type : 'contentItem'}, q, function(err, res) {
    if (err) {
      utils.passingError(err, params);

    } else {
      res.query = q;
      if (!res || res.hits.hits.length < 1) {
        GLOBAL.debug('NO HITS FOR', JSON.stringify(q, null, 2));
      }
    }
    callback(err, res);
  });
}

// Executes carrot2 cluster query
function formCluster(params, callback) {
  var query = createFormQuery(params);
  var q = {
    "search_request" : {
      _source : sourceFields.concat(['text']),
      sort : [
        { "visitors.@timestamp" : {"order" : "desc"}},
      ],
      size : Math.min(hitSize, params.browseNum),
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
    if (err) {
      GLOBAL.error('formCluster, carrot2 extension not installed?', err, q);
      callback(err);
      return;
    }
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
    if (callback) {
      callback(err, data);
    } else {
      if (err) {
        GLOBAL.error('on', options, docs);
        throw (err);
      }
    }
  });
}

// more like this field api
function moreLikeThis(uris, callback) {
  // FIXME use all URIs
  var uri = uris[0];
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
