// # form-query
//
// Form related queries built with indexer.
//
/*jslint node: true */
'use strict';

var _ = require('lodash');
var utils = require('./utils.js');

exports.shouldFilter = shouldFilter;

// Perform filtering of a resultset based on filters
exports.filter = function(filters, res) {
  if (!filters || !res || !res.hits || !res.hits.hits) {
    return res;
  }
//  console.log('FILTERING', filters);
  _.pluck(res.hits.hits, '_source').forEach(function(cItem) {
    if (cItem.annotations) {
      var i = cItem.annotations.length - 1;
      for (; i> -1; i--) {
         if (shouldFilter(filters, cItem.annotations[i])) {
           console.log('removing', i, cItem.annotations.length);
           cItem.annotations.splice(i, 1);
         }
      }
    } else {
      console.log('no annos', cItem);
    }
  });
  return res;
};

// Return true if this field should be filtered out
function shouldFilter(filters, anno) {
  for (var i = filters.length - 1; i > -1; i--) {
    var filter = filters[i];
    if (filter.type === anno.type) {
      if (_.isEqual(filter.position, anno.position)) {
        if (anno.isA && anno.isA === 'Date') {
          var filterDate = new Date(filter.value), fieldDate = new Date(anno.typed.Date);
          if (filter.operator === '<') {
            return fieldDate < filterDate;
          } else if (filter.operator === '>') {
            return fieldDate > filterDate;
          } else {
            return filterDate === fieldDate;
          }
        }
      } else {
        return filter.value == anno.value;
      }
    }
  }
  return false;
}

// Summarize a result set's annotations.
exports.summarizeAnnotations = function(results, includeItems) {
  var root = { text : 'Annotations', size: 0, children: [] }; //, items: []
  // build a size of hierarchical annotations
  results.hits.hits.forEach(function(hit) {
    (hit._source.annotations || []).forEach(function(anno) {
      // for each start at the root
      var last = root;
      // iterate through its annotations
      if (!anno.position) {
        GLOBAL.error('missing anno position', anno);
      } else {
        anno.position.forEach(function(p) {
          var cur;
          // find its parent
          last.children.forEach(function(c) {
            if (c.text === p) {
              cur = c;
              return;
            }
          });
          // or create it
          if (!cur) {
            last.children.push({text: p, size: 0, children: []}); //, items: []
            cur = last.children[last.children.length - 1];
          }
          // increment its instances
          cur.size += 1;

          // add items for views requiring them

          if (includeItems) {
            // add uri for item selecting
            if (!cur.items) {
              cur.items = [];
            }
            if (cur.items.indexOf(hit._source.uri) < 0) {
              cur.items.push(hit._source.uri);
            }
          }
          // use it as the basis for the cur up
          last = cur;
        });
        last.type = anno.type;
      }
    });
  });
  return root;
};

// formulates a query based on form contents
exports.createFormQuery = function(options) {
  var qs = [], query_string, params = options.query || {};

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
  if (_.isArray(params.annotations) && params.annotations.length) {
    params.annotations.forEach(function(anno) {
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
};
