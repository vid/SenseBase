
// hasQueuedUpdates and noUpdates are used to delay updates when content is being edited or viewed
var queryRefresher, hasQueuedUpdates, noUpdates;
var resultViews = {};
var lastResults, isSearching;

fayeClient.subscribe('/clusterResults', function(results) {
  console.log('clusterResults', results);
  doTreemap(results.clusters);
  updateResults(results);
});

fayeClient.subscribe('/searchResults/' + window.clientID, function(results) {
  console.log('/searchResults', results);
  updateResults(results);
});

// sets the current annotation loc
function setCurrentURI(u) {
  currentURI = u.replace(/#.*/, '');
  console.log('currentURI', currentURI);
}

console.log('/annotations/' + window.clientID);
// receive annotations
fayeClient.subscribe('/annotations/' + window.clientID, function(data) {
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
    displayAnnoTree(data.annotations, data.uri, treeInterface);
  }
});

// delete an item
fayeClient.subscribe('/deletedItem', function(item) {
  console.log('/deletedItem', item, lastResults);
  if (lastResults.hits) {
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

// add a new or updated item
fayeClient.subscribe('/updateItem', function(result) {
  console.log('/updateItem', result, lastResults);
  result = normalizeResult(result);
  if (!lastResults.hits) {
    lastResults = { hits: { total : 0, hits: [] } };
  } else {
    var i = 0, l = lastResults.hits.hits.length;
    for (i; i < l; i++) {
      console.log(i, lastResults.hits.hits[i]._source);
      if (lastResults.hits.hits[i]._source.uri === result._source.uri) {
        lastResults.hits.hits.splice(i, 1);
        break;
      }
    }
  }
  lastResults.hits.hits.unshift(result);
  updateResults(lastResults);
});

// set up form
$('.query input').keyup(function(e) {
  if(e.keyCode == 13) doSearch();
});
$('.query.submit').click(function(event) {
  doSearch();
});

$('#fromDate').datepicker();
$('#toDate').datepicker();
$('#refreshQueries').click(function(e) {
  if ($(e.target).prop('checked')) {
    setupQueryRefresher(5000);
  } else {
    clearQueryRefresher();
  }
  console.log('refrresh', queryRefresher);
});

function clearQueryRefresher() {
  if (queryRefresher) {
    clearInterval(queryRefresher);
  }
}

function setupQueryRefresher(interval) {
  clearQueryRefresher();
  queryRefresher = setInterval(doSearch, interval);
}

var ULEN = 70;
function shortenURI(u) {
  return (!u || u.length < ULEN) ? u : (u.substring(0, ULEN - 3) + '…' + u.substring(u.length - 3));
}

function updateResults(results) {
  // content is being viewed or edited, delay updates
  lastResults = results;
  if (noUpdates) {
    console.log('in noUpdates');
    hasQueuedUpdates = true;
    return;
  }
  $('.search.button').animate({opacity: 1}, 500, 'linear');
  // use arbitrary rendering to fill results
  var container = '#results';
  if (results.hits) {
    $(container).html('');
    $('#searchCount').html(results.hits.hits.length === results.hits.total ? results.hits.total : (results.hits.hits.length + '/' + results.hits.total));
    resultView(container, results);
  } else {
    $(container).html('<i>No items.</i>');
    $('#searchCount').html('0');
  }
  $('.search.submit').removeAttr('disabled');
  isSearching = false;
}

// populate and display the URI's sidebar
function displayItemSidebar(uri) {
  $('#itemContext').html(
    '<div class="item"><a target="' + encodeURIComponent(uri) + '" href="' + uri + '"><i class="external url icon"></i>New window</a></div>' +
    '<div onclick="moreLikeThis(\'' + uri +'\')" class="item"><i class="puzzle piece icon"></i>More like this</div>' +
    '<div onclick="refreshAnnos(\'' + uri +'\')" class="item"><i class="refresh icon"></i>Refresh</div>' +
    '<div class="item"><i class="delete icon"></i>Delete</div>' +
    '<div class="item"><a target="_debug" href="<!-- @var ESEARCH_URI -->/contentItem/' + encodeURIComponent(uri) + '?pretty=true"><i class="bug icon"></i>Debug</a></div>'
    );
  $('.context.dropdown').dropdown();
  setCurrentURI(uri);
  fayeClient.publish('/annotate', { clientID: window.clientID, uri: uri });
  $('#startingPage').val(uri);
  $('.details.sidebar').sidebar('show');
}

function hideItemSidebar() {
  $('.details.sidebar').sidebar('hide');
}

include "results.table.js"
include "results.scatter.js"

resultView = resultViews.table;
