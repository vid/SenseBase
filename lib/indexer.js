// indexing functions; save, query, management for Annotations and ContentItems
/*jslint node: true */

'use strict';

var _ = require('lodash'), elasticsearch = require('es'), es, http = require('http');

var  utils = require('./utils'), formQueryLib = require('./form-query.js');

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


// Executes form params, returning results
function formQuery(params, callback) {
  var query = formQueryLib.createFormQuery(params);
  var q = {
    _source : params.sourceFields || sourceFields,
    sort : params.sort || [
      { "visitors.@timestamp" : {"order" : "desc"}},
    ],
    from: params.from || 0,
    size : params.size || Math.min(hitSize, params.browseNum),
    query: query
  };
  if (params.terms) {
    q.highlight = { fields: {"title" : {}, "text" : {}}};
  }

  getEs().search({ _index : GLOBAL.config.ESEARCH._index, _type : 'contentItem'}, q, function(err, res) {
    if (err) {
      utils.passingError(err, params);

    } else {
      res.from = params.from || 0;
      res.query = q;
      if (!res || res.hits.hits.length < 1) {
        GLOBAL.debug('NO HITS FOR', JSON.stringify(q, null, 2));
      }
    }
    formQueryLib.filter(params.filters, res);
    callback(err, res);
  });
}

// Executes carrot2 cluster query
function formCluster(params, callback) {
  var query = formQueryLib.createFormQuery(params);
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
