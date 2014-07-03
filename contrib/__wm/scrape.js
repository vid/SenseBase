//populate search name
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
  var cronValue = $('input.cron').val(), searchName = $('#searchName').val(), targetResults = $('#targetResults').val(), input = $('#scrapeInput').val(), scrapeContinue = $('#scrapeContinue').val(), scrapeTags = $('#scrapeTags').val().split(',').map(function(t) { return t.trim(); }), searchTeam = $(".scraping.team.container option:selected").map(function() { return this.value }).get();
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
  doSearch();
}

// populate with initial set of saved scrapes
fayeClient.publish('/search/list', { member: sbUser });

// save a search
$('.save.search').click(function() {
  var searchInput = getSearchInput();
  if (searchInput.valid && searchInput.name.length > 0) {
    fayeClient.publish('/search/save', searchInput);
  } else {
    alert('Missing parameters');
  }
});

// load a search
$('.load.search').click(function() {
  $('.load.modal').modal('show');
});

// receive list of saved searches
fayeClient.subscribe('/search/results', function(results) {
  $("#loadSearch").select2({
    createSearchChoice: function (term, data) {
      if ($(data).filter(function () {
        return this.text.localeCompare(term) === 0;
      }).length === 0) {
        return {
          id: term,
          text: term
        };
      }
    },
    data: results.searches.map(function(i) { return { id: i, text: i } })
  });
});
