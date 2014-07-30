// ### Search
//
// lookup for saved searches
/*jslint node: true */

'use strict';

var savedSearches;

exports.init = function(fayeClient, sbUser, resultsLib) {
  // set team input as select2 input
  $('.team.container').select2();

  // schedule search
  $('.schedule.button').click(function() {
    setupCronInput();
    $('.schedule.modal').modal('show');
    $('.cron.edit').html('');
  });

  // show search scheduler according to checkbox
  $('#scheduleSearch').on('change', function() {
    $('#scheduleInput').toggle(this.checked);
  });

  $('input.cron').val()

  // setup semantic-ui form validation
  $('.searching.form').form(
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

  // populate with initial set of saved searchs
  fayeClient.publish('/search/retrieve', { member: sbUser });

  // receive list of saved searches
  fayeClient.subscribe('/search/results', function(results) {
    savedSearches = results;
    if (results && results.hits.total > 0) {
      $("#loadSearch").select2({
        data: results.hits.hits.map(function(i) { return { id: i._source.searchName, text: i._source.searchName } })
      });
      $('.load.search').attr('disabled', false);
    } else {
      $('.load.search').attr('disabled', true);
    }
  });

  // save a search
  $('.save.search').click(function() {
    var searchInput = getSearchInput();
    if (searchInput.valid && searchInput.searchName.length > 0) {
      fayeClient.publish('/search/save', searchInput);
    } else {
      alert('Missing parameters');
    }
  });

  // display saved searches
  $('.load.search').click(function() {
    $('.load.modal').modal('show');
  });

  // load a search
  $('button.search.load').click(function() {
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
        $('select.searching.team').val(r.team);
        $('.team.container').select2('val', r.team);
        return;
      }
    });
  });
  // set up the cron scheduler input
  function setupCronInput(val) {
    $('input.cron').jqCron({
      enabled_minute: false,
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
    var cronValue = $('#scheduleSearch').prop('checked') ? $('input.cron').val() : null, searchName = $('#searchName').val(), targetResults = $('#targetResults').val(), input = $('#searchInput').val(), searchContinue = $('#searchContinue').val(), searchCategories = $('#searchCategories').val().split(',').map(function(t) { return t.trim(); }), searchTeam = $('select.searching.team option:selected').map(function() { return this.value }).get();
    return { searchName: searchName, cron: cronValue, input: input, relevance: searchContinue, team: searchTeam, categories: searchCategories, member: sbUser, targetResults: targetResults, valid: (input.length > 0 && searchContinue.length > 0 && searchTeam.length > 0 && searchCategories.length > 0 && sbUser.length > 0 && targetResults.length > 0 )};
  }

  // submit a new search
  function submitSearch() {
    var searchInput = getSearchInput();
    // FIXME: SUI validation for select2 field
      if (!searchInput.valid) {
      alert('Please select team members');
      return;
    }
    console.log('publishing', searchInput, fayeClient);
    fayeClient.publish('/search/queue', searchInput);
    if ($('#refreshSearch').prop('checked')) {
      $('#annoSearch').val($('#searchCategories').val());
    //  $('#validationState').val('queued');
      $('#refreshQueries').prop('checked', true);
      resultsLib.setupQueryRefresher(5000);
    }
    doQuery();
  }

};
