// ### Results
//
// Result actions. Interact with result set and views.
/*jslint browser: true */
/*jslint node: true */
/* global $ */
'use strict';

// currentURI is exported
var currentURI, noUpdates, context = {};
// hasQueuedUpdates and noUpdates are used to delay updates when content is being edited or viewed
var hasQueuedUpdates, queuedNotifier;

var lastResults, resultView;

exports.hasQueuedUpdates = hasQueuedUpdates;
exports.noUpdates = noUpdates;

exports.displayItemSidebar = displayItemSidebar;
exports.hideItemSidebar = hideItemSidebar;

exports.gotResults = gotResults;
exports.gotNavigation = gotNavigation;
exports.updateResults = updateResults;
exports.moreLikeThis = moreLikeThis;
exports.setResultView = setResultView;
exports.getLastResults = function() { return lastResults; };

var annoTree = require('./annoTree.js'), utils = require('../lib/clientUtils'), treeInterface = require('./tree-interface'),
  browseCluster = require('../lib/browse-cluster'), browseFacet = require('../lib/browse-facet'),
  browseTreemap = require('../lib/browse-treemap'), browseDebug = require('../lib/browse-debug');

exports.init = function(ctx, view) {
  setResultView(view);
  context = ctx;
  treeInterface.init(ctx);

  // delete an item
  context.pubsub.item.subDeleted(function(item) {
    console.log('/item/deleted', item, lastResults);
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
  context.pubsub.item.subUpdated(function(results) {
    console.log('/item/updated', results, 'lastResults', lastResults);
    results.forEach(function(result) {
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
    });
    updateResults(lastResults);
  });
};

function setResultView(view) {
  resultView = view;
  // FIXME
  exports.view = resultView;
}

// FIXME normalize fields between base and _source
function normalizeResult(result) {
  if (result.uri) {
    console.log('normalizing', result);
    if (!result._source) {
      result._source = {};
    }
    ['title', 'timestamp', 'uri', 'annotationSummary', 'annotations', 'visitors'].forEach(function(f) {
      result._source[f] = result[f];
    });
  }
  return result;
}

function moreLikeThis(uris) {
  context.pubsub.item.moreLikeThis(uris);
}

// Query results were received
function gotResults(res) {
  results.JSONquery = JSON.stringify(results.query, null, 2);
  console.log('gotResults', res);
  updateResults(res.results);
}

// Navigation results to accompany results
function gotNavigation(results) {
  console.log('gotNavigation', results, browser);
  var browser;
  if (results.navigator === 'treemap') {
    browser = browseTreemap;
  } else if (results.navigator === 'facet') {
    browser = browseFacet;
  } else if (results.navigator === 'cluster') {
    browser = browseCluster;
  } else if (results.navigator === 'debug') {
    browser = browseDebug;
  }
  if (browser) {
    $('.browse.sidebar').sidebar('show');
    $('#browse').html();
    browser.render('#browse', results, resultView, context);
  } else {
    $('.browse.sidebar').sidebar('hide');
  }
}

// populate and display the URI's sidebar
function displayItemSidebar(uri) {
  exports.currentURI = uri;
  // watchannotation
  $('.watch.annotation').click(function() {
    if (treeInterface.lastAnno) {
      $('.watch.modal').modal('show');
      $('#watchItems').val('annotation:'+treeInterface.lastAnno.flattened);
    }
  });
  $('.context.dropdown').dropdown();
  currentURI = uri.replace(/#.*/, '');

  context.pubsub.item.annotations.request(uri, function(data) {
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
  $('.details.sidebar').sidebar('show');
}

function hideItemSidebar() {
  exports.currentURI = null;
  $('.details.sidebar').sidebar('hide');
}

// Update displayed results using results view.  If passed results are null, use lastResults.
function updateResults(results) {
  if (results === undefined) {
    results = lastResults;
  }
  lastResults = results;

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
