// ### Results
//
// Result actions. Interact with result set and views.
/*jslint browser: true */
/*jslint node: true */
/* global $ */
'use strict';

var currentURI, noUpdates, context = {};
// hasQueuedUpdates and noUpdates are used to delay updates when content is being edited or viewed
var querySub, queryRefresher, hasQueuedUpdates, queuedNotifier;

var lastResults, resultView;

// FIXME modularize these
exports.hasQueuedUpdates = hasQueuedUpdates;
exports.noUpdates = noUpdates;
exports.setupQueryRefresher = setupQueryRefresher;

exports.displayItemSidebar = displayItemSidebar;
exports.hideItemSidebar = hideItemSidebar;
exports.updateResults = updateResults;
exports.doQuery = doQuery;
exports.moreLikeThis = moreLikeThis;
exports.view = resultView;

var annoTree = require('./annoTree.js'), utils = require('../lib/clientUtils'), treeInterface = require('./tree-interface'),
  browseCluster = require('../lib/browseCluster'), browseTree = require('../lib/browseTree'),
  browseTreemap = require('../lib/browseTreemap');

exports.init = function(ctx, view) {
  resultView = view;
  context = ctx;

  // receive annotations
  context.pubsub.annotations(function(data) {
    console.log('/annotations', data);
    // update query items
    if (data.annotationSummary && lastResults.hits) {
      var i = 0, l = lastResults.hits.hits.length;
      for (i; i < l; i++) {
        if (lastResults.hits.hits[i]._id === data.uri) {
          lastResults.hits.hits[i]._source.annotationSummary = data.annotationSummary;
          break;
        }
      }
      updateResults(lastResults);
    }

    if (data.uri === currentURI) {
      annoTree.display(data.annotations, data.uri, treeInterface);
    }
  });

  // delete an item
  context.pubsub.subDeletedItem(function(item) {
    console.log('/deletedItem', item, lastResults);
    if (lastResults && lastResults.hits) {
      var i = 0, l = lastResults.hits.hits.length;
      for (i; i < l; i++) {
        if (lastResults.hits.hits[i]._id === item._id) {
          lastResults.hits.hits.splice(i, 1);
          updateResults(lastResults);
          return;
        }
      }
      console.log('deletedItem not found', item);
    }
  });


  // Add new or update item.
  context.pubsub.updateItem(function(result) {
    console.log('/updateItem', result, lastResults);
    result = normalizeResult(result);
    if (!lastResults.hits) {
      lastResults = { hits: { total : 0, hits: [] } };
    } else {
      var i = 0, l = lastResults.hits.hits.length;
      for (i; i < l; i++) {
        if (lastResults.hits.hits[i]._source.uri === result._source.uri) {
          lastResults.hits.hits.splice(i, 1);
          break;
        }
      }
    }
    lastResults.hits.hits.unshift(result);
    updateResults(lastResults);
  });
};

// FIXME normalize fields between base and _source
function normalizeResult(result) {
  if (result.uri) {
    console.log('normalizing', result);
    if (!result._source) {
      result._source = {};
    }
    ['title', 'timestamp', 'uri'].forEach(function(f) {
      result._source[f] = result[f];
    });
  }
  return result;
}

function clearQueryRefresher() {
  if (queryRefresher) {
    clearInterval(queryRefresher);
  }
}

function moreLikeThis(uris) {
  context.pubsub.moreLikeThis(uris);
}

// perform a general query
function doQuery(options) {
  context.pubsub.query(gotResults, options);
}

function gotResults(results) {
  updateResults(results);

  var browser;
  if (results.nav === 'annotations') {
    browser = browseTreemap;
  } else if (results.nav === 'tree') {
    browser = browseTree;
  } else if (results.nav === 'cluster') {
    browser = browseCluster;
  }
  if (browser) {
  $('#browse').html();
    browser.render(results, '#browse', resultView);
  } else {
    $('.browse.sidebar').sidebar('hide');
  }
}

function setupQueryRefresher(interval) {
  clearQueryRefresher();
  queryRefresher = setInterval(doQuery, interval);
}

// populate and display the URI's sidebar
function displayItemSidebar(uri) {
  // subscribe to annotation
  $('.subscribe.annotation').click(function() {
    if (treeInterface.lastAnno) {
      $('.subscribe.modal').modal('show');
      $('#subscribeItems').val('annotation:'+treeInterface.lastAnno.flattened);
    }
  });
  $('.context.dropdown').dropdown();
  setCurrentURI(uri);
  context.pubsub.annotate(uri);
  $('.details.sidebar').sidebar('show');
}

function hideItemSidebar() {
  $('.details.sidebar').sidebar('hide');
}

// sets the current annotation loc
function setCurrentURI(u) {
  currentURI = u.replace(/#.*/, '');
  console.log('currentURI', currentURI);
}

function updateResults(results) {
  if (results) {
    lastResults = results;
  } else {
    results = lastResults;
  }

  // content is being viewed or edited, delay updates
  if (noUpdates) {
    console.log('in noUpdates');
    hasQueuedUpdates = true;
    clearTimeout(queuedNotifier);
    queuedNotifier = setInterval(function() { $('.toggle.item').toggleClass('red'); }, 2000);
    return;
  }

  // clear queued notifier
  $('.toggle.item').removeClass('red');
  clearInterval(queuedNotifier);

  $('.query.button').animate({opacity: 1}, 500, 'linear');
  // use arbitrary rendering to fill results
  var container = '#results';
  if (results.hits) {
    $(container).html('');
    $('#queryCount').html(results.hits.hits.length === results.hits.total ? results.hits.total : (results.hits.hits.length + '/' + results.hits.total));
    resultView.render(container, results, context);
  } else {
    $(container).html('<i>No items.</i>');
    $('#queryCount').html('0');
    resultView.render(container, results, context);
  }
}



// **** move these to views **********

exports.removeSelected = function() {
  var i = lastResults.hits.hits.length, sel = getSelected();
  for (i; i > 0; ) {
    i--;
    if (sel.indexOf(lastResults.hits.hits[i]._source.uri) < 0) {
      delete lastResults.hits.hits[i];
    }
  }
  updateResults(lastResults);
};

exports.getSelected = getSelected;

// return all items selected
function getSelected() {
  var selected = [];
  $('.selectItem').each(function() {
    if ($(this).is(':checked')) {
      selected.push(utils.deEncID($(this).attr('name').replace('cb_', '')));
    }
  });
  return selected;
}
