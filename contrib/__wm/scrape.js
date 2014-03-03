fayeClient.publish('/savedScrapes', { member: sbUser });

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

$('#scrapeForm').submit(function(event) {
  event.preventDefault();
  var scrape = { name : $('#scrapeName').val(), tags : $('#applyTags').val(),
    startingPage: $('#startgingPage').val(), continueFinding: $('#continueFinding').val(),
    scanEvery: $('#scanEvery').val(), isSyndication: $('#isSyndication').val(), contentLocation: $('#contentLocation').val() }
  fayeClient.publish('/saveScrape', scrape);
  $('#searchMember').val('');
  var start = $('#startingPage').val();
  fayeClient.publish('/links', { site: start, scrape: true, links: [start]});
  $('#refreshQueries').prop('checked', true);

  queryRefresher = setInterval(doSearch, 5000);
});

