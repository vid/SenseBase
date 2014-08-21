// ### query
//
// query interface interactions
/* jslint browser: true */
/* jslint node: true */
/* global $ND */

exports.getQueryOptions = getQueryOptions;
exports.submitQuery = submitQuery;
exports.updateQueryForm = updateQueryForm;
exports.addAnnotationTag = addAnnotationTag;
exports.setAnnotationTags = setAnnotationTags;

// function to calc querystring
var qs;
var queryFields = ['termSearch', 'annoSearch', 'fromDate', 'toDate', 'annoMember', 'browseNav', 'browseNum'];
var basePage = location.pathname + '?';
var context;
var queryRefresher;

var $annoSearch = $('#annoSearch');

function addAnnotationTag(anno) {
  $annoSearch.attr('placeholder', '');
  var tags = $annoSearch.val().split(',').filter(function(v) { return v.length > 0; });
  tags.push(anno);
  $annoSearch.select2('data', tags.map(function(t) { return { text: t}; }));
  $annoSearch.val(tags.join(','));
}

function setAnnotationTags(tags) {
  if (tags === undefined) {
    tags = $annoSearch.val().split(',');
  }
  $annoSearch.select2({
    formatNoMatches: function(term) { return ""; },
    matcher: function(term, text, opt) {
       return true;
     },
    tags: tags,
    tokenSeparators: [',']
  });
  $annoSearch.on('change', function(e) {
    $annoSearch.val(e.val.join(','));
    submitQuery();
  });
}

exports.init = function(ctx) {
  context = ctx;
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
};

// formulate query parameters
function getQueryOptions() {
  var nav = $("#browseNav" ).val();
  var options = { terms : $('#termSearch').val(), annotationSearch : $annoSearch.val(),
    validationState: $('#validationState').val(), annotationState: $('#annotationState').val(), browseNum: $('#browseNum').val(),
    from: $('#fromDate').val(), to: $('#toDate').val(),
    // FIXME normalize including annotations
    member: $('#annoMember').val(), annotations: (nav === 'annotations' || nav === 'tree') ? '*' : null,
    nav: nav};
  return options;
}

// submit a query, saving it to window state
function submitQuery() {
// save form contents in querystring
  var ss = [];
  queryFields.forEach(function(i) {
    if ($('#'+i).val()) {
      ss.push(i + '=' + $('#'+i).val());
    }
  });

  window.history.pushState({query: ss}, 'dashboard', basePage + ss.join('&'));
  var options = getQueryOptions();
  if (options.nav) {
    $('#browse').html('<img src="loading.gif" alt="loading" /><br />Loading ' + options.nav);
    $('.browse.sidebar').sidebar('show');
  } else {
    $('.browse.sidebar').sidebar('hide');
  }
  context.resultsLib.doQuery(options);
  return false;
}

// update the query form based on URI query fields
function updateQueryForm() {
  var p = (window.location.search.substr(1)).split('&');
  // set up qs for parameters (from http://stackoverflow.com/a/3855394 )
  if (!qs) {
    qs = (function(a) {
      if (a === '') return {};
      var b = {};
      for (var i = 0; i < a.length; ++i) {
        var p=a[i].split('=');
        if (p.length != 2) continue;
        b[p[0]] = decodeURIComponent(p[1].replace(/\+/g, " "));
      }
      return b;
    }(p));
  }

  queryFields.forEach(function(f) {
    if (qs[f]) {
      $('#'+f).val(qs[f]);
    }
  });
  setAnnotationTags();
}

function clearQueryRefresher() {
  if (queryRefresher) {
    clearInterval(queryRefresher);
  }
}

function setupQueryRefresher(interval) {
  clearQueryRefresher();
  queryRefresher = setInterval(context.resultsLib.doQuery, interval);
}
