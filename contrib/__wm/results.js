
// set up form
// initiate search
$('.search input').keyup(function(e) {
  if(e.keyCode == 13) doSearch();
});
$('#searchForm').click(function(event) {
  doSearch();
});

var queryRefresher;

$('#fromDate').datepicker();
$('#toDate').datepicker();
$('#refreshQueries').click(function(e) {
  if ($(e.target).prop('checked')) {
    queryRefresher = setInterval(doSearch, 5000);
  } else {
    if (queryRefresher) {
      clearInterval(queryRefresher);
    }
  }
});

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

function doSearch() {
  var search = { terms : $('#termSearch').val(), annotations : $('#annoSearch').val(),
    from: $('#fromDate').val(), to: $('#toDate').val(),
    member: $('#searchMember').val() }
  fayeClient.publish('/search', search);
  $('.search.button').animate({opacity: 0.2}, 200, 'linear');
}

fayeClient.subscribe('/searchResults', function(results) {
  console.log('/searchResults', results);
  updateResults(results);
});

// add a new or updated item
fayeClient.subscribe('/updateItem', function(result) {
  console.log('/update', result, lastResults);
  if (!lastResults.hits) {
    lastResults = { hits: { total : 0, hits: [] } };
  } else {
    var i = 0, l = lastResults.hits.hits.length;
    for (i; i < l; i++) {
      if (lastResults.hits.hits[i]._source.uri === result._source.uri) {
        delete lastResults.hits.hits[i];
        break;
      }
    }
  }
  lastResults.hits.hits.unshift(result);
  lastResults.hits.total++;
  updateResults(lastResults);
});

// for updating
var lastResults;

function updateResults(results) {
  lastResults = results;
  $('.search.button').animate({opacity: 1}, 500, 'linear');
  $('#holder').html('<div id="results"><table id="resultsTable" class="ui sortable table segment"><thead><tr><th class="descending">Rank</th><th>Document</th><th>Visitors</th><th>Annotations</th></tr></thead><tbody></tbody></table></div>');
  if (results.hits) {
    var count = 0;
    results.hits.hits.forEach(function(r) {
      var v = r.fields || r._source;
      var row = '<tr id="' + encID(v.uri) + '"><td>' + (r._score ? r._score : ++count) + '</td><td>' +
        '<div><a target="_link" href="' + v.uri + '"></a><a class="selectURI" href="'+ v.uri + '">' + (v.title ? v.title : '(no title)') + '</a><br />' + 
        '<a class="selectURI" href="'+ v.uri + '">' + shortenURI(v.uri) + '</a></div>'+
	'</td><td class="rowVisitors">';
      // roll up visitors
      if (v.visitors) {
        var vv = '', va = {};
        v.visitors.forEach(function(visitor) {
          var a = va[visitor.member] || { visits: []};
          a.visits.push(visitor['@timestamp']);
          va[visitor.member] = a;
        });
        for (var a in va) {
          vv += '<h4 class="showa">' + a + ' <a class="ui black circular label">' + va[a].visits.length + '</a> </h3><div class="hidden">' + JSON.stringify(va[a].visits) + '</div>';
        }
        row += '' + vv;
      }
      row += '</td><td class="rowAnnotations">';
      if (v.annotationSummary !== undefined) {
        if (v.annotationSummary.validated > 0) { 
          row += '<div class="ui tiny green annotations button"><i class="checked checkbox icon"></i> ' + v.annotationSummary.validated + '</div><div class="hidden validatedSummary"></div>';
        }
        if (v.annotationSummary.unvalidated > 0) { 
          row += '<div class="ui tiny blue annotations button"><i class="empty checkbox icon"></i> ' + v.annotationSummary.unvalidated + '</div><div class="hidden unvalidatedSummary"></div>';
        }
      }
      row += '</td>';
      $('#resultsTable tbody').append(row);
    });

    $('#searchCount').html(results.hits.total);
    $('.sortable.table').tablesort();

  } else {
    $('#results').html('<i>No items.</i>');
    $('#searchCount').html('0');
  }
  setupTable();
  $('table').on('tablesort:complete', function(event, tablesort) {
    setupTable();
  });
}

function setupTable() {
  $('.selectURI').click(selectedURI);
  $('.annotations.button').click(selectedURI);
  $('.showa').click(function() {
    $(this).next().toggle();
  });
}

var curURI;
// display or close uri controls and frame (for link)
function selectedURI(ev) {
  updateOptions.call($('#watch'));
  updateOptions.call($('#filter'));

  var $el = $(this);
  var uri = decodeURIComponent(encIDs[$el.parents('tr').attr('id')]);

// item options
  $('#itemContext').html(
    '<div class="item"><a target="' + encodeURIComponent(uri) + '" href="' + uri + '"><i class="external url icon"></i>New window</a></div>' + 
    '<div onclick="moreLikeThis(\'' + uri +'\')" class="item"><i class="puzzle piece icon"></i>More like this</div>' +
    '<div class="item"><i class="delete icon"></i>Remove</div>' +
    '<div class="item"><a target="_debug" href="<!-- @var ESEARCH_URI -->/contentItem/' + encodeURIComponent(uri) + '?pretty=true"><i class="bug icon"></i>Debug</a></div>'
    );
  $('.context.dropdown').dropdown();

  if (curURI == uri) {
    var shown = $('.details.sidebar').sidebar('toggle').hasClass('active');
    if ($el.hasClass('selectURI')) {
      $('#preview').toggle(shown);
    }
  } else {
    fayeClient.publish('/annotate', { uri: uri });
    curURI = uri;
    $('#startingPage').val(uri);
    annotateCurrentURI(uri);
    if ($el.hasClass('selectURI')) {
      $('#preview').remove();
      $el.parent().after('<iframe style="width: 100%" id="preview" src="'+uri+'"></iframe>');
    }
    $('.details.sidebar').sidebar('show');
  }
  return false;
}

