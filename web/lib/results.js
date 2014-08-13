// ### Results
//
// Result actions.
/*jslint browser: true */
/*jslint node: true */
/* global $,doQuery,submitQuery */
'use strict';

var currentURI, noUpdates;
// hasQueuedUpdates and noUpdates are used to delay updates when content is being edited or viewed
var queryRefresher, hasQueuedUpdates, queuedNotifier;

var lastResults, lastAnno, resultView;

// FIXME modularize these
exports.hasQueuedUpdates = hasQueuedUpdates;
exports.noUpdates = noUpdates;
exports.queuedNotifier = queuedNotifier;
exports.setupQueryRefresher = setupQueryRefresher;
exports.lastResults = lastResults;

exports.displayItemSidebar = displayItemSidebar;
exports.hideItemSidebar = hideItemSidebar;
exports.updateResults = updateResults;

var annoTree = require('./annoTree.js'), pubsub = require('../../lib/pubsub-client');

exports.init = function(submitQuery, resultViewIn) {
  resultView = resultViewIn;

  // receive annotations
  pubsub.annotations(function(data) {
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
  pubsub.subDeletedItem(function(item) {
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

  // set up form
  $('.query.input').keyup(function(e) {
    if (e.keyCode == 13) submitQuery();
  });
  $('.query.submit').click(submitQuery);

  $('#fromDate').datepicker();
  $('#toDate').datepicker();
  $('#refreshQueries').click(function(e) {
    if ($(e.target).prop('checked')) {
      setupQueryRefresher(5000);
    } else {
      clearQueryRefresher();
    }
  });


  // Add new or update item.
  pubsub.updateItem(function(result) {
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

function setupQueryRefresher(interval) {
  clearQueryRefresher();
  queryRefresher = setInterval(doQuery, interval);
}

// populate and display the URI's sidebar
function displayItemSidebar(uri) {
  $('#itemContext').html(
    '<div class="item"><a target="' + encodeURIComponent(uri) + '" href="' + uri + '">' +
    '<div class="header item">Annotation menu</div>' +
    '<a title="Subscribe to annotation" class="disabled subscribe annotation">' +
      '<i class="rss icon"></i>Subscribe' +
    '</a>'
    );
  // subscribe to annotation
  $('.subscribe.annotation').click(function() {
    if (lastAnno) {
      $('.subscribe.modal').modal('show');
      $('#subscribeItems').val('annotations:'+lastAnno.flattened);
    }
  });
  $('.context.dropdown').dropdown();
  setCurrentURI(uri);
  pubsub.annotate(uri);
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

var treeInterface = {
  hover: function(anno) {},
  select: function(anno, e, data) {
    // selected an annotation
    if (anno) {
      lastAnno = anno;
      $('.subscribe.annotation').removeClass('disabled');
      console.log(anno);
      $('#annoType option:contains(anno.type)').prop('selected', true);
      // for now categories only
      $('#annoValue').val(anno.text);
      $('#annoBy').val(anno.annotatedBy);
      $('#annotatedAt').html(anno.annotatedAt || '&nbsp;');
      $('.filter.icon').click(function() {
        console.log(anno, 'filtering on', this);
        if ($(this).hasClass('by')) {
          $('#annoMember').val('"' + anno.annotatedBy + '"');
          $('#annotationState').val('provided');
        } else {
          $('#annoSearch').val('"' + anno.text + '"');
        }
        submitQuery();
      });

      // set state buttons accordingly
      $('.annotation.button').removeClass('disabled');
      if (anno.state === 'erased') {
        $('.erase.annotation').addClass('disabled');
      } else if (anno.state === 'validated') {
        $('.validate.button').addClass('disabled');
      } else {
        $('.unvalidate.button').addClass('disabled');
      }
      var annoFunctions = { anno: anno, select: function() { console.log(anno); } };
      $('.annotation.button').click(annoFunctions.select);
    } else {
      $('.subscribe.annotation').addClass('disabled');
      lastAnno = null;
    }
    // it has children
    if (data.node.children.length < 1) {
      $('.annotation.children').hide();
    } else {
      $('.annotation.children').show();
      $('.annotation.children .count').html(data.node.children.length);
    }
  }
};

function updateResults(results, newView) {
  resultView = newView || resultView;
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
    resultView.render(container, results, this);
  } else {
    $(container).html('<i>No items.</i>');
    $('#queryCount').html('0');
  }
}
