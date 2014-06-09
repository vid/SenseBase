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
    scrapeTeam: {
      identifier : 'scrapeTeam',
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

// submit a new scrape
function submitScrape() {
  var input = $('#scrapeInput').val(), scrapeContinue = $('#scrapeContinue').val(), scrapeTags = $('#scrapeTags').val().split(','), scrapeTeam = $(".scraping.team.container option:selected").map(function() { return this.value }).get();
  // FIXME: SUI validation for select2 field
  if (!scrapeTeam.length) {
    alert('Please select team members');
    return;
  }
  var data = { input: input, relevance: scrapeContinue, team: scrapeTeam, tags: scrapeTags, member: sbUser};
  console.log('publishing', data, fayeClient);
  fayeClient.publish('/queueSearch', data);
  $('#annoSearch').val($('#searcherTags').val());
  $('#validationState').val('queued');
  $('#refreshQueries').prop('checked', true);
  setupQueryRefresher(5000);
}

// populate with initial set of saved scrapes
fayeClient.publish('/savedScrapes', { member: sbUser });

// receive list of saved scrapes
fayeClient.subscribe('/scrapesResults', function(results) {
  console.log('scrapesResults', results);
  if (results.hits) {
    var rows = [];
    results.hits.hits.forEach(function(r) {
      var v = r.fields;
      var row = [];
      ['name', 'status', 'lastRun', 'author', 'tags', 'found'].forEach(function(f) {
        row.push(v[f] || ''); 
//          row += '<td class="' + f + '" id="'+r._id + '_' + f + '">' + v[f] + '</td>';
      });
      row.push(v['annotations'] ? v['annotations'] : '-')
      rows.push(row);
    });
    $('#existingScrapes').html( '<table cellpadding="0" cellspacing="0" border="0" class="display" id="scrapesTable"></table>' );
    $('#scrapesTable').dataTable( {
      iDisplayLength: 100,
      bAutoWidth: false,
      aaData: rows,
      aaSorting: [[ 1, "desc" ]],
      aoColumns: [
        { "sName": "Name",
          "sWidth": "50%"
        },
        { "sTitle": "Status",
          "sWidth": "10%" },
        { "sTitle": "Last run",
          "sWidth": "10%" },
        { "sTitle": "Author",
          "sWidth": "10%" },
        { "sTitle": "Tags",
          "sWidth": "10%" },
        { "sTitle": "Found",
          "sWidth": "10%" },
      ]
    });

  } else {
    $('#existingScrapes').html('<i>No items.</i>');
  }
});


