// # Search
//
// lookup for saved searches
/*jslint browser: true */
/*jslint node: true */
/* global $,alert */
'use strict';

var savedSearches, context;
var _ = require('lodash');

var sline = _.template('<tr onclick=\'javascript:$("#loadSearch").val("<%= searchName %>")\'><td><div class="ui icon button"><i class="remove icon"></i></div></td><td><%= searchName %></td><td><a><%= categories %></a></td><td><%= team %></td><td><div style="height: 2.5em; overflow: auto"><%= input %></div></td><td><%= cron %></td></tr>');

exports.init = function(ctx) {
  context = ctx;
  // set team input as select2 input
//  $('.team.container').select2();
  setupCronInput();

  // show search scheduler according to checkbox
  $('#scheduleSearch').on('change', function() {
    $('#scheduleInput').toggle(this.checked);
  });

  $('input.cron').val();

  $('.load.search').click(function() {
    $('.load.modal').modal('show');
  });

  // setup semantic-ui form validation
  $('.searcher.form').form(
    {
      searchInput: {
        identifier  : 'searchInput',
        rules: [
          {
            type   : 'empty',
            prompt : 'Please enter member input'
          }
        ]
      },
      searchCategories: {
        identifier : 'searchCategories',
        rules: [
          {
            type   : 'empty',
            prompt : 'Please enter one or more comma-seperated categories'
          }
        ]
      },
      searchTeam: {
        identifier : 'searchTeam',
        rules: [
          {
            type   : 'empty',
            prompt : 'Please enter one or more members'
          }
        ]
      }
    },
    {
      onSuccess: submitSearch
    }
  );

// Retrieve existing searches.
  context.pubsub.search.request(function(results) {
    savedSearches = results;
    if (results && results.hits.total > 0) {
      // display saved searches
      $('#savedSearches tbody').html('');
      _.pluck(results.hits.hits, '_source').forEach(function(i) {
        $('#savedSearches tbody').append(sline(i));
      });
      /*
      $("#loadSearch").select2({
        data: results.hits.hits.map(function(i) { return { id: i._source.searchName, text: i._source.searchName }; })
      });
      */
    }
  });

  // save a search
  $('.save.search').click(function() {
    var searchInput = getSearchInput();
    if (searchInput.valid && searchInput.searchName.length > 0) {
      context.pubsub.search.save(searchInput);
    } else {
      alert('Missing parameters');
    }
  });

  // load a search
  $('.confirm.search.load').click(function() {
    var v = $('#loadSearch').val();
    savedSearches.hits.hits.forEach(function(s) {
      if (s._source.searchName === v) {
        var r = s._source;
        if (r.cron) {
          $('input.cron').val(r.cron);
          $('#scheduleSearch').prop('checked', true);
        } else {
          $('#scheduleSearch').prop('checked', false);
        }
        setupCronInput(r.cron);
        $('#scheduleSearch').trigger('change');
        $('#searchName').val(v);
        $('#targetResults').val(r.targetResults);
        $('#searchInput').val(r.input);
        $('#searchContinue').val(r.relevance);
        $('#searchCategories').val(r.categories);
        $('select.searcher.team').val(r.team);
        $('.team.container').select2('val', r.team);
        return;
      }
    });
  });
  // set up the cron scheduler input
  function setupCronInput(val) {
    $('input.cron').jqCron({
      enabled_minute: true,
      multiple_dom: true,
      multiple_month: true,
      multiple_mins: true,
      multiple_dow: true,
      multiple_time_hours: true,
      multiple_time_minutes: true,
      default_period: 'week',
      default_value: val || '15 12 * * 7',
      no_reset_button: true,
      lang: 'en'
    });
  }

  // convert the form values to data
  function getSearchInput() {
    var cronValue = $('#scheduleSearch').prop('checked') ? $('input.cron').val() : null, searchName = $('#searchName').val(), targetResults = $('#targetResults').val(), input = $('#searchInput').val(), searchContinue = $('#searchContinue').val(), searchCategories = $('#searchCategories').val().split(',').map(function(t) { return t.trim(); }), searchTeam = $('select.searcher.team option:selected').map(function() { return this.value; }).get();
    return { searchName: searchName, cron: cronValue, input: input, relevance: searchContinue, team: searchTeam, categories: searchCategories, targetResults: targetResults, valid: (input.length > 0 && searchContinue.length > 0 && searchTeam.length > 0 && searchCategories.length > 0 && targetResults.length > 0 )};
  }

  // submit a new search
  function submitSearch() {
    var searchInput = getSearchInput();
    // FIXME: SUI validation for select2 field
      if (!searchInput.valid) {
      alert('Please select team members');
      return;
    }
    console.log('publishing', searchInput);
    $('.search.message').html('Search results:');
    $('.search.message').removeClass('hidden');
    context.pubsub.status('queued', function(res) {
      console.log(res);
      var message = '';
      if (res.err) {
        message = res.err;
      } else {
        message = 'found <a target="_searchresult" href="' + res.status.uri + '">' + res.status.uri + '</a> from ' + res.status.source;
      }

      $('.search.message').append('<div>' + message + '</div>');
    });

    context.pubsub.search.queue(searchInput);
    context.queryLib.setAnnotationTags($('#searchCategories').val().split(','));
    context.queryLib.submitQuery();
  }

};
