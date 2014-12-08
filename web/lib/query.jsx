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

var React = require('react'), _ = require('lodash');

// function to calc querystring
var qs;
var queryFields = ['terms', 'annotations', 'member', 'navigator', 'size', 'filter', 'fields'];
var basePage = location.pathname + '?';
var context;

var $annoSearch = $('.query.annotations');

var SelectMember = React.createClass({
  render: function() {
    return (
      <div className="field">
        <label htmlFor="annoMember">Member</label>
        <input title="Members who have visited the item" className="query input member" id="annoMember" />
      </div>
    );
  }
});

var s = { height: '4em', 'min-height' : '4em'};
var SelectFields = React.createClass({
  render: function() {
    return (
      <div className="field">
        <label htmlFor="selectFields">Fields</label>
        <textarea title="Include these fields in output (comma-separated)" style={s} className="query select fields" id="selectFields">{this.props.data}</textarea>
      </div>
    );
  }
});

var SelectWorkflow = React.createClass({
  render: function() {
    return (
      <div className="field">
        <label htmlFor="annotationState">Annotation state</label>
        <select title="State of item" id="annotationState" className="query annotation state"><option value="visited">Visited</option><option value="requested">Annotation requested</option><option value="provided">Annotation provided</option></select>
      </div>
    );
  }
});

var SelectNumResults = React.createClass({
  render: function() {
    return (
      <div className="field">
        <label htmlFor="browseNum">Results</label>
        <select title="Maximum returned results" className="query size" id="browseNum"><option value="100">100</option><option selected value="500">500</option><option value="1000">1000</option><option value="2000">2000</option><option value="5000">5000</option></select>
      </div>
    );
  }
});

var SelectState = React.createClass({
  render: function() {
    return (
      <div className="field">
        <label htmlFor="validationState">Validation state</label>
        <select title="Validation state" class="query validation state" id="validationState">
          <option value="all">Everything</option>
          <option value="val">Has validated</option>
          <option value="unval">Has unvalidated</option>
          <option value="notann">Not annotated</option>
          <option value="valOrUnval">Visited, no annotations</option>
          <option value="queued">Not visited (queued)</option>
        </select>
      </div>
    );
  }
});

var SelectFilter = React.createClass({
  render: function() {
    return (
      <div className="filterList">
        <label for="queryFilters">
          Filters
        </label>
        <textarea title="Query filters" style={s} id="queryFilters" className="query filter">{this.props.data}</textarea>
      </div>
    );
  }
});

var InputName = React.createClass({
  handleClick: function(e){
    e.preventDefault();
    queryResultsTable();
    return;
  },

  render: function() {
    return (
      <div className="inline field">
        <label for="queryName">Save name</label>
        <input title="Name for saved query" id="queryName" className="query name" />
        <button onClick={this.handleClick}>Results</button>
      </div>
    );
  }
});

exports.QueryForm = React.createClass({
  render: function() {
    return (
      <div className="query">
        <form className="ui function query form" onSubmit={this.preventSubmit}>
          <div className="fields">
            <div className="four wide function field">
              <SelectMember />
              <SelectWorkflow />
            </div>
            <div className="four function field">
              <SelectNumResults />
              <SelectState />
            </div>
            <div className="four wide function field">
              <SelectFields data={this.props.data} />
            </div>
            <div className="four wide function field">
              <InputName />
            </div>
          </div>
        </form>
      </div>
    );
  }
});

var ResultsTable = React.createClass({
  render: function() {
    var results = this.props.results;
    return (
      <table className="queryResults">
        {results.map(function(result) {
          return <tr key={result.uri}><td><a href="{result.uri}">{result.title}</a></td></tr>;
        })}
      </table>
    );
  }
});

function queryResultsTable(queryName, dest) {
  var resultsTable = function(res) {
    var results = res.results, options = res.options;
    if (results && results.hits) {
      console.log('resultsTable', results.hits.hits.map(function(r) { return r._source; }));
      React.renderComponent(ResultsTable({results: results.hits.hits.map(function(r) { return r._source; })}), $('.holder')[0]);
    }
  };
  var options = getQueryOptions();
  options.annotations = options.annotations || '*';
  context.pubsub.query.request(resultsTable, options);
}

exports.init = function(ctx) {
  context = ctx;
  // set up form
  $('.query.input').keyup(function(e) {
    if (e.keyCode == 13) submitQuery();
  });
  $('.query.submit').click(submitQuery);

  // morelikethis
  $('.morelikethis.selected').click(function() {
    if ($('.selected.label').text() > 0) {
      context.resultsLib.moreLikeThis(context.resultsLib.getSelected(), getQueryOptions());
    }
  });

  $('.query.terminal').click(function() {
    $('.query.input.terms').val(context.resultsLib.getLastQuery().results.query.query.bool.must[0].query_string.query);
    $('.query.input.terms').css('width', $('.query.input.terms').width() * 1.5);
    $('.query.input.terms').css('height', $('.query.input.terms').height() * 1.5);
    clearAnnotationTags();
  });

/*
  $('#fromDate').datepicker();
  $('#toDate').datepicker();
  */
};

function addAnnotationTag(anno) {
  $annoSearch.attr('placeholder', '');
  var tags = $annoSearch.val().split(',').filter(function(v) { return v && v.trim().length > 0; });
  console.log('addAnnotationTag current', tags, 'adding', anno);
  tags.push(anno);
  tags = _.uniq(tags);
  $annoSearch.val(tags.join(','));
  $annoSearch.select2('data', tags.map(function(t) { return { id: t, text: t}; }));
}

// clear input box and select for tags
function clearAnnotationTags() {
  $annoSearch.val();
  $annoSearch.select2('data', null);
}

function setAnnotationTags(tags) {
  clearAnnotationTags();
  if (tags === undefined) {
    tags = $annoSearch.val().split(',');
  }
  $annoSearch.select2({
    formatNoMatches: function(term) { return ''; },
    matcher: function(term, text, opt) {
       return true;
     },
    tags: [],
    tokenSeparators: [',']
  });
  tags.forEach(function(tag) {
    if (tag) {
      addAnnotationTag(tag);
    }
  });

  /*
  $annoSearch.on('change', function(e) {
    $annoSearch.val(e.val.join(','));
    submitQuery();
  });
  */
}

// formulate query parameters
function getQueryOptions() {
  var navigator = $('.query.navigator').val();
  var options = {
    query: {
      terms : $('.query.terms').val(),
      annotations : $annoSearch.val().split(','),
      validationState: $('.query.validation.state').val(),
      selectFields: $('.query.select.fields').val().split(','),
      annotationState: $('.query.annotation.state').val(),
      size: $('.query.size').val(),
      // FIXME normalize including annotations
      member: $('.query.member').val(),
      filters: [$('.query.filter').val()]
    },
    annotations: (navigator === 'annotations' || navigator === 'tree') ? '*' : null,
    navigator: navigator};
  return options;
}

// submit a query, saving it to window state
function submitQuery() {
// save form contents in querystring
// FIXME use routing
  var ss = [], ts = [];
  for (var i in qs) {
    ts.push(i + '=' + qs[i]);
  }
  queryFields.forEach(function(i) {
    if ($('.query.'+i).val()) {
      ss.push(i + '=' + $('.query.'+i).val());
    }
  });
  var annos = $('.query.annotations').select2('val');
  if (annos.length) {
    ss.push('annotations=' + annos.join(','));
  }
  if (ss.join('%') != ts.join('%')) {
//    window.location = '?' + ss.join('&');
    window.history.pushState({query: ss}, 'dashboard', basePage + ss.join('&'));
  }

//  window.history.pushState({query: ss}, 'dashboard', basePage + ss.join('&'));
  var options = getQueryOptions();
  if (options.navigator) {
    context.pubsub.query.navigator(context.resultsLib.gotNavigation);
    $('#browse').removeClass();
    $('#browse').html('<img src="loading.gif" alt="loading" /><br />Loading ' + options.navigator);
  } else {
    $('.browse.sidebar').sidebar('hide');
  }
  doQuery(options);
  return false;
}

// perform a general query
function doQuery(options) {
  context.pubsub.query.request(context.resultsLib.gotResults, options);
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
      $('.query.'+f).val(qs[f]);
    }
  });
  setAnnotationTags();
}
