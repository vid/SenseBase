var pxMember;

$(function() {
  $('.main.menu .item').tab('change tab', 'second'); // FIXME to select second menu
  $('.ui.accordion').accordion();
  $('#dashboardLink').click(function() { $('.details.sidebar').sidebar('toggle'); return false;});
  $('.details.sidebar').sidebar('hide', { overlay: true});
  $('.facets.sidebar').sidebar('hide');
  $('.ui.facets.button').click(function() { $('.facets.sidebar').sidebar('toggle'); });
  $('.ui.scrape.button').click(function() { $('.scrape.content').toggle('hidden'); });
  $('.sortable.table').tablesort();
  $('.ui.checkbox').checkbox({onChange : updateOptions});

  function updateOptions() {
    console.log($(this).attr('id'), $(this).is(':checked'));
    if($(this).is(':checked')) { 
      $('#'+$(this).attr('id') + 'Options').show();
    } else {
      $('#'+$(this).attr('id') + 'Options').hide();
    }
  }

  pxMember = window.pxMember || $.cookie('pxMember');
  $('#searchMember').val(pxMember);
  window.pxContent.style.width = window.parent.innerWidth - 340;
  fayeClient = new Faye.Client('http://faye.wc.zooid.org:9999/montr');
  fayeClient.publish('/search', { member: pxMember });


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
          '<div style="float: left; padding: 4px" class="ui left pointing item_options dropdown icon button"><i class="expand icon"></i> <div class="menu"><div class="item"><a target="_link" href="' + v.uri + '"><i class="external url icon"></i>New window</a></div><div onclick="moreLikeThis(\'' + (v._id ||r._id) +'\')" class="item"><i class="users icon"></i>More like this</div> <div class="item"><i class="delete icon"></i>Delete</div> <div class="item"><a target="_debug" href="http://es.wc.zooid.org:9200/ps/annotationItem/' + encodeURIComponent(v._id || r._id) + '?pretty=true"><i class="bug icon"></i>Debug</a></div></div></div>' +

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


  var justEdited, rTeams, editingMember;

  fayeClient.subscribe('/teamList', function(teams) {
    $('#aneditor').hide();
    console.log('teams', teams);
    $('#teamList').html('<form><table cellspacing="10" id="teamMembers"></table></form>');
    teams.forEach(function(m) {
     $('#teamMembers').append('<tr class="teamSelect" id="member_' + m.username + '"><td>' + (m.icon ? '<img src="/__wm/icons/' + m.icon + '">' : '') + '</td><td>' + m.username + '</td><td>' + m.type + '</td><td>' + (m.description ? m.description : '') + '</td></tr>');
    });
   $('#newName').val(''); 
   $('#newEmail').val('');
   $('.teamSelect').click(function(i) {
    showEdit($(i.target).parent().attr('id').split('_')[1]);
   });
   rTeams = teams;
   if (justEdited) {
     showEdit(justEdited);
     justEdited = null;
   }
  });
  fayeClient.publish('/team/list', {});

  $('#newCreate').click(function() {
    fayeClient.publish('/team/add', { name: $('#newName').val(), type: $('#newType').val() });
    justEdited = $('#newName').val();
    return false;
  });

  function showEdit(username) {
    if (!rTeams) {
      return;
    }

    $('.anedit').hide(); // hide all types
    rTeams.forEach(function(m) {
      console.log(m.username, username);
      if (m.username === username) {
        editingMember = m;
      }
    });
    console.log('member', editingMember);
    $('#username').val(editingMember.username);
    $('#lastUsername').val(editingMember.username);
    $('#memberDescription').val(editingMember.description);
    $('#needsValidation').prop('checked', editingMember.needsValidation == true);
    if (editingMember.type == 'User') {
      setupValidation();
      $('#canValidate').prop('checked', (editingMember.canValidate == true) && editingMember.needsValidation != true);
      $('#teamRemove').show();
      $('#editUser').show();
      $('#newEmail').val(editingMember.email);
      $('#memberPassword').val(editingMember.password);
      $('#passwordRepeat').val(editingMember.password);
    } else if (editingMember.type === 'Scraper') {
      $('#teamRemove').show();
      $('#editScraper').show();
    } else if (editingMember.type === 'Annotation set') {
      $('#teamRemove').show();
      $('#positiveTerms').val(editingMember.positiveTerms);
      $('#negativeTerms').val(editingMember.negativeTerms);
      $('#editAnnoSet').show();
    } else {
      $('#teamRemove').hide();
      $('#editAgent').show();
    }
    $('#aneditor').show();
  }

  $('#teamRemove').click(function() {
    fayeClient.publish('/team/remove', { username: editingMember.username});
    return false;
  });

  $('#needsValidation').click(function() {
    setupValidation();
  });

  function setupValidation() {
    if ($('#needsValidation').is(':checked')) {
      $('#canValidate').prop('checked', false);
      $('#canValidate').prop('disabled', true);
    } else {
      $('#canValidate').prop('disabled', false);
    }
  }

  $('#teamUpdate').click(function() {
    editingMember.description = $('#memberDescription').val();
    editingMember.needsValidation = $('#needsValidation').is(':checked');
    if (editingMember.type == 'User' || editingMember.type == 'Scraper') {
      if (editingMember.type == 'User') {
        editingMember.email = $('#newEmail').val();
        editingMember.canValidate = $('#canValidate').is(':checked');
      }
      var pw1 = $('#memberPassword').val(), pw2 = $('#passwordRepeat').val();
      if (pw1) {
        if (pw1 != pw2) {
          alert("Passwords don't match");
          return false;
        } else {
          editingMember.password = $('#memberPassword').val();
        }
      }
    } else if (editingMember.type === 'Annotation set') {
      editingMember.positiveTerms = $('#positiveTerms').val();
      editingMember.negativeTerms = $('#negativeTerms').val();
    } else {
      
    }
    fayeClient.publish('/team/save', editingMember);
    return false;
  });


  fayeClient.publish('/savedScrapes', { member: pxMember });

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



});

function moreLikeThis(uri) {
  fayeClient.publish('/moreLikeThis', { uri: uri});
}
