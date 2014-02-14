
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
  if (u.length < ULEN) {
    return u;
  }
  return u.substring(0, ULEN - 3) + '…' + u.substring(u.length - 3);
}

function doSearch() {
  var search = { terms : $('#termSearch').val(), annotations : $('#annoSearch').val(),
    from: $('#fromDate').val(), to: $('#toDate').val(),
    member: $('#searchMember').val() }
  fayeClient.publish('/search', search);
  $('.search.button').animate({opacity: 0.2}, 200, 'linear');
}

fayeClient.subscribe('/searchResults', function(results) {
  console.log('searchResults', results);
  updateResults(results);
});

fayeClient.subscribe('/updateItem', function(result) {
  console.log('UPDATE', result);
  var i = 0, l = lastResults.hits.hits.length;
  for (i; i < l; i++) {
    if (lastResults.hits.hits[i].fields.uri == result.fields.uri) {
      delete lastResults.hits.hits[i];
      lastResults.hits.hits.unshift(result);
      updateResults(lastResults);
      return;
    }
  }
  console.log('did not find, adding', result);
  lastResults.hits.hits.unshift(result);
  lastResults.hits.total++;
  updateResults(lastResults);
});

// for updating

var lastResults;

function updateResults(results) {
  lastResults = results;
  $('.search.button').animate({opacity: 1}, 500, 'linear');
  $('#holder').html('<div id="results"><table id="resultsTable" class="ui sortable table segment"><thead><tr><th>Rank</th><th>Document</th><th>Accesses</th><th>Annotations</th></tr></thead><tbody></tbody></table></div>');
  if (results.hits) {
    var count = 0;
    results.hits.hits.forEach(function(r) {
      var v = r.fields || r._source;
      var row = '<tr><td>' + (r._score ? r._score : ++count) + '</td><td>' +
        '<div style="float: left; padding: 4px" class="ui left pointing item_options dropdown icon button"><i class="expand icon"></i> <div class="menu"><div class="item"><a target="_link" href="' + v.uri + '"><i class="external url icon"></i>New window</a></div><div onclick="moreLikeThis(\'' + (v._id ||r._id) +'\')" class="item"><i class="users icon"></i>More like this</div> <div class="item"><i class="delete icon"></i>Delete</div> <div class="item"><a target="_debug" href="ESEARCH_URI/annotationItem/' + encodeURIComponent(v._id || r._id) + '?pretty=true"><i class="bug icon"></i>Debug</a></div></div></div>' +

        '<div><a target="_link" href="' + v.uri + '"></a><a class="selectURI" href="'+ v.uri + '">' + (v.title ? v.title : '(no title)') + '</a><br />' + 
        '<a class="selectURI" href="'+ v.uri + '">' + shortenURI(v.uri) + '</a></div>'+
	'</td>';

      var vv = '', va = {};
      // roll up visitors
      v.visitors.forEach(function(visitor) {
        var a = va[visitor.member] || { visits: []};
        a.visits.push(visitor['@timestamp']);
        va[visitor.member] = a;
      });
      // roll up annotations
      for (var a in va) {
        vv += '<h4 class="showa">' + a + ' (' + va[a].visits.length + ') </h3><div class="hidden">' + JSON.stringify(va[a].visits) + '</div>';
      }
      row += '<td>' + vv + '</td>';

      var annos, validated = '', unvalidated = '', seen = {}, vc = 0, uc = 0;
      try {
        annos = JSON.parse(v.annotations);
      } catch (e) {
        annos = [];
        if (v.annotations) {
          console.log('failed parsing annos', e, v.annotations);
        }
      }
      annos.forEach(function(anno) {
        for (var i in anno) {
          var d = (anno.value || anno.quote);
          if (!seen[d]) {
            if (anno.validated) {
              validated += '<a title="' + anno.types + '">' + d + '</a> (' + anno.creator + ')<br />';
              vc++;
            } else {
              unvalidated += '<a title="' + anno.types + '">' + d + '</a> (' + anno.creator + ')<br />';
              uc++;
            }

            seen[d] = 1;
          }
        }
      });
      row += '<td><h4 class="showa">Validated (' + vc + ')</h4><div>' + validated + '</div><h4 class="showa">Unvalidated (' + uc + ')</h4><div class="hidden">' + unvalidated +'</div></td>';
      $('#resultsTable tbody').append(row);
    });
    $('.item_options.dropdown').dropdown();


    $('.selectURI').click(selectedURI);
    $('.showa').click(function() {
        $(this).next().toggle();
    });
    $('#searchCount').html(results.hits.total);

  } else {
    $('#results').html('<i>No items.</i>');
  }
}

var curURI;
function selectedURI(ev) {
  updateOptions.call($('#watch'));
  updateOptions.call($('#filter'));

  $('.details.sidebar').sidebar('show');
  var el = $(ev.target);
  var uri = el.attr('href');
  if (curURI == uri) {
    $('#preview').toggle();
  } else {
    curURI = uri;
    $('#startingPage').val(uri);
    annotateCurrentURI(uri);
    $('#preview').remove();
    el.parent().after('<iframe style="width: 100%" id="preview" src="'+uri+'"></iframe>');
    $('.details.sidebar').sidebar('show');
  }
  return false;
}

