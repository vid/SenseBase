// indexing functions; save, query, management for Annotations and ContentItems
/*jslint node: true */

'use strict';

var _ = require('lodash'), elasticsearch = require('es'), es, http = require('http');

var annotations = require('../lib/annotations.js'), utils = require('../lib/utils');

// checksum content for uniqueness

// fields that are sent
var hitSize = 3000, publishFields = ['_id', 'uri', 'timestamp', 'title', 'visitors', 'annotationSummary'];
// fields that are returned in a query
var sourceFields = ['_id', 'uri', 'timestamp', 'title', 'visitors.*', 'annotationSummary.*', 'state'];

exports.retrieveByURI = retrieveByURI;
exports.formQuery = formQuery;
exports.formCluster = formCluster;
exports.moreLikeThis = moreLikeThis;
exports.deleteContentItems = deleteContentItems;
exports.sourceFields = sourceFields;

// use saveRecord partial for common search/retrievals

exports.saveContentItem = saveRecord('contentItem', function(data) { return encodeURIComponent(data.uri); });
exports.saveItemHistory = saveRecord('contentItemHistory', function(data) { return encodeURIComponent(data.uri); });

exports.saveSubscription = saveRecord('subscription', function(data) { return encodeURI(data.member + '/' + data.match); });
exports.retrieveSubscriptions = retrieveRecords('subscription', ['member', 'match', 'created']);

// reusable ID generation
var searchID = function(data) { return encodeURI(data.member + '/' + data.searchName); };
exports.searchID = searchID;
exports.saveSearch = saveRecord('savedSearches', searchID);
exports.retrieveSearches = retrieveRecords('savedSearches', ['searchName', 'cron', 'input', 'relevance', 'team', 'categories', 'member', 'targetResults', 'lastSearch', 'searches']);

exports.saveSearchLog = saveRecord('searchLog');
exports.retrieveSearcherLogs = saveRecord('searchLog', ['searcherID', 'searchDate']);

exports.saveQuery = saveRecord('savedQueries', function(data) { return encodeURI(data.member + '/' + data.queryName); });
exports.retrieveQueries = retrieveRecords('savedQueries', ['queryName', 'member', 'number', 'members', 'terms', 'annotations', 'filters']);

// for testing
exports.saveRecord = saveRecord;
exports.retrieveRecords = retrieveRecords;

// copy a cItem to elasticsearch field result format
function resultToContentItem(esDoc) {
  var annoDoc = {_source : {}};
  publishFields.forEach(function(f) {
    annoDoc._source[f] = esDoc[f];
  });
  return annoDoc;
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
        }
        getEs().delete({ _type: 'contentItem', _id : encodeURIComponent(encodeURIComponent(uri))}, function(err, deleteRes) {
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

// Retrieves a complete contentItem by URI.
function retrieveByURI(uri, callback) {
  var query = {
    query: {
      term: {
        uri : uri
      }
    }
  };
  getEs().search({ _index : GLOBAL.config.ESEARCH._index, _type : 'contentItem'}, query, function(err, res) {
    if (!err && res && res.hits.total) {
      if (res.hits.total > 1) {
        // That would be weird.
        throw new Error('more than one result for', uri);
      }
      res = res.hits.hits[0];
    }
    callback(err, res);
  });
}

// save member record partial
function saveRecord(rType, idFun) {
  return function(records, callback) {
    GLOBAL.debug('inserting', records.length, rType);
    if (!_.isArray(records)) {
      records = [records];
    }
    var tc = [];
    records.forEach(function(d) {
      var meta = {_index : GLOBAL.config.ESEARCH._index, _type : rType};
      if (idFun) {
          meta._id = idFun(d);
      }
      tc.push({ index : meta});
      tc.push(d);
    });
    getEs().bulk(tc, function (err, data) {
      callback(err, data, records);
    });
  };
}

// Retrieve record partial, using options.member or *
// FIXME limit "for"
function retrieveRecords(rType, source) {
  return function(options, callback) {
    var q = {
      _source : source,
      size : hitSize,
      "query": {
        "filtered": {
          "query": {
            "bool": {
              "must": [
                {
                  query_string: {
                    query: 'member:' + (options.member ? '"' + options.member + '"' : '*')
                  }
                }
              ]
            }
          }
        }
      }
    };

    getEs().search({ _index : GLOBAL.config.ESEARCH._index, _type : rType}, q, function(err, res) {
      callback(err, res);
    });
  };
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
  if (_.isArray(params.annotationSearch) && params.annotationSearch.length) {
    params.annotationSearch.forEach(function(anno) {
      if (anno.length > 0) {
        if (anno.indexOf(':') > 0) {
          // FIXME value hack
          var a = anno.replace(/"/g, '').split(':');
          qs.push('(annotations.key:"' + a[0] + '" AND annotations.value:"' + a[1] + '")');
        } else {
          qs.push('annotations.category:"' + anno + '"');
        }
      }
    });
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
    from: options.from || 0,
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
      res.from = options.from || 0;
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
