
// queuedUpdates and noUpdates are used to delay updates when content is being edited or viewed
var queryRefresher, queuedUpdates, noUpdates;

fayeClient.subscribe('/clusterResults', function(results) {
  console.log('clusterResults', results);
  doTreemap(results.clusters);
  updateResults(results);
});

fayeClient.subscribe('/searchResults', function(results) {
  console.log('/searchResults', results);
  updateResults(results);
});

// delete an item
fayeClient.subscribe('/deletedItem', function(item) {
  console.log('/deletedItem', item, lastResults);
  if (lastResults.hits) {
    var i = 0, l = lastResults.hits.hits.length;
    for (i; i < l; i++) {
      console.log('>>',lastResults.hits.hits[i], item._id);
      if (lastResults.hits.hits[i]._id === item._id) {
        lastResults.hits.hits.splice(i, 1);
        updateResults(lastResults);
        return;
      }
    }
    console.log('deletedItem not found', item);
  }
});

// add a new or updated item
fayeClient.subscribe('/updateItem', function(result) {
  console.log('/updateItem', result, lastResults);
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

// set up form
$('.search input').keyup(function(e) {
  if(e.keyCode == 13) doSearch();
});
$('.search.button').click(function(event) {
  doSearch();
});

$('#fromDate').datepicker();
$('#toDate').datepicker();
$('#refreshQueries').click(function(e) {
  if ($(e.target).prop('checked')) {
    setupQueryRefresher(5000);
  } else {
    if (queryRefresher) {
      clearInterval(queryRefresher);
    }
  }
  console.log('refrresh', queryRefresher);
});

function setupQueryRefresher(interval) {
  queryRefresher = setInterval(doSearch, interval);
}

// input element
var spinner = $(".spinner").spinner({
  spin: function( event, ui ) {
    if ( ui.value < 0 ) {
      $( this ).spinner( "value", 'once only' );
      return false;
    }
  }
});

var ULEN = 70;
function shortenURI(u) {
  return (!u || u.length < ULEN) ? u : (u.substring(0, ULEN - 3) + '…' + u.substring(u.length - 3));
}

// formulate search parameters
function getSearchOptions() {
  var options = { terms : $('#termSearch').val(), annotations : $('#annoSearch').val(),
    validationState: $('#validationState').val(), annotationState: $('#annotationState').val(),
    from: $('#fromDate').val(), to: $('#toDate').val(),
    member: $('#annoMember').val() };
  return options;
}

function doSearch() {
  fayeClient.publish('/search', getSearchOptions());
  $('.search.button').animate({opacity: 0.2}, 200, 'linear');
}

// for updating
var lastResults;

function updateResults(results) {
  // content is being viewed or edited, delay updates
  if (noUpdates) {
    console.log('in noUpdates');
    queuedUpdates = results;
    return;
  }
  lastResults = results;
  $('.search.button').animate({opacity: 1}, 500, 'linear');
    // use arbitrary rendering to fill #results
  if (results.hits) {
    resultsTable('#results', results);
  } else {
    $('#results').html('<i>No items.</i>');
    $('#searchCount').html('0');
  }
  queuedUpdate = null;
}

// populate and display the URI's sidebar
function displayItemSidebar(uri) {
  $('#itemContext').html(
    '<div class="item"><a target="' + encodeURIComponent(uri) + '" href="' + uri + '"><i class="external url icon"></i>New window</a></div>' +
    '<div onclick="moreLikeThis(\'' + uri +'\')" class="item"><i class="puzzle piece icon"></i>More like this</div>' +
    '<div class="item"><i class="delete icon"></i>Delete</div>' +
    '<div class="item"><a target="_debug" href="<!-- @var ESEARCH_URI -->/contentItem/' + encodeURIComponent(uri) + '?pretty=true"><i class="bug icon"></i>Debug</a></div>'
    );
  $('.context.dropdown').dropdown();
  fayeClient.publish('/annotate', { uri: uri });
  $('#startingPage').val(uri);
  annotateCurrentURI(uri);
  $('.details.sidebar').sidebar('show');
}

function hideItemSidebar() {
  $('.details.sidebar').sidebar('hide');
}

include "results.table.js"

