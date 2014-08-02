
// lookup for saved searches
var savedSearches;

// set team input as select2 input
$('.team.container').select2();

// schedule search
$('.schedule.button').click(function() {
  $('.schedule.modal').modal('show');
  $('.cron.edit').html('');
});

// show search scheduler according to checkbox
$('#scheduleSearch').on('change', function() {
  $('#scheduleInput').toggle(this.checked);
});

setupCronInput();
$('input.cron').val()

// setup semantic-ui form validation
$('.scraping.form').form(
  {
    scrapeInput: {
      identifier  : 'scrapeInput',
      rules: [
        {
          type   : 'empty',
          prompt : 'Please enter member input'
        }
      ]
    },
    scrapeTags: {
      identifier : 'scrapeTags',
      rules: [
        {
          type   : 'empty',
          prompt : 'Please enter one or more comma-seperated tags'
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
    onSuccess: submitScrape
  }
);

// convert the form values to data
function getSearchInput() {
  var cronValue = $('#scheduleSearch').prop('checked') ? $('input.cron').val() : null, searchName = $('#searchName').val(), targetResults = $('#targetResults').val(), input = $('#scrapeInput').val(), scrapeContinue = $('#scrapeContinue').val(), scrapeTags = $('#scrapeTags').val().split(',').map(function(t) { return t.trim(); }), searchTeam = $('select.scraping.team option:selected').map(function() { return this.value }).get();
  return { name: searchName, cron: cronValue, input: input, relevance: scrapeContinue, team: searchTeam, tags: scrapeTags, member: sbUser, targetResults: targetResults, valid: (input.length > 0 && scrapeContinue.length > 0 && searchTeam.length > 0 && scrapeTags.length > 0 && sbUser.length > 0 && targetResults.length > 0 )};
}

// submit a new scrape
function submitScrape() {
  var searchInput = getSearchInput();
  // FIXME: SUI validation for select2 field
    if (!searchInput.valid) {
    alert('Please select team members');
    return;
  }
  console.log('publishing', searchInput, fayeClient);
  fayeClient.publish('/search/queue', searchInput);
  if ($('#refreshScrape').prop('checked')) {
    $('#annoSearch').val($('#scrapeTags').val());
  //  $('#validationState').val('queued');
    $('#refreshQueries').prop('checked', true);
    setupQueryRefresher(5000);
  }
  doQuery();
}

// populate with initial set of saved scrapes
fayeClient.publish('/search/retrieve', { member: sbUser });


// receive list of saved searches
fayeClient.subscribe('/search/results', function(results) {
  savedSearches = results;
  if (results.hits.total > 0) {
    $("#loadSearch").select2({
      data: results.hits.hits.map(function(i) { return { id: i._source.name, text: i._source.name } })
    });
    $('.load.search').attr('disabled', false);
  } else {
    $('.load.search').attr('disabled', true);
  }
});

// save a search
$('.save.search').click(function() {
  var searchInput = getSearchInput();
  if (searchInput.valid && searchInput.name.length > 0) {
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
    if (s._source.name === v) {
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
      $('#scrapeInput').val(r.input); 
      $('#scrapeContinue').val(r.relevance); 
      $('#scrapeTags').val(r.tags);
      $('select.scraping.team').val(r.team);
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

