// GLOBALS

var resultViews = {}, resultView, querySub, clusterSub, lastResults, qs; 
var sbUser = window.senseBase.user;
var fayeClient = new Faye.Client('http://es.fungalgenomics.ca/faye');
var queryFields = ['termSearch', 'annoSearch', 'fromDate', 'toDate', 'annoMember', 'browseNav', 'browseNum'];

var treeInterface = {
  hover: function(anno) {}, 
  select: function(anno, e, data) {
    // selected an annotation
    if (anno) {
      console.log(anno);
      $('#annoType option:contains(anno.type)').prop('selected', true);
      // for now categories only
      $('#annoValue').val(anno.text);
      $('#annoBy').val(anno.annotatedBy);
      $('#annotatedAt').html(anno.annotatedAt || '&nbsp;');
      $('.filter.icon').click(function() {
        console.log(anno, 'filtering on', this);
        if ($(this).hasClass('by')) {
          $('#annoMember').val('"' + anno.annotatedBy + '"');
          $('#annotationState').val('provided');
        } else {
          $('#annoSearch').val('"' + anno.text + '"');
        }
        submitQuery();
      });

      // set state buttons accordingly
      $('.annotation.button').removeClass('disabled');
      if (anno.state === 'erased') {
        $('.erase.annotation').addClass('disabled');
      } else if (anno.state === 'validated') {
        $('.validate.button').addClass('disabled');
      } else {
        $('.unvalidate.button').addClass('disabled');
      }
      var annoFunctions = { anno: anno, select: function() { console.log(anno); } };
      $('.annotation.button').click(annoFunctions.select);
    }
    // it has children
    if (data.node.children.length < 1) {
      $('.annotation.children').hide();
    } else {
      $('.annotation.children').show();
      $('.annotation.children .count').html(data.node.children.length);
    }
  } 
};

var mainSize = 0, fluidSizes = ['four', 'five', 'six', 'seven']; // fluid sizes for main ui
$(function() {
  setupDND('uploadItem', '/upload');
  setupDND('uploadWorkfile', '/workfile');
  // General setup and functions
  var currentURI;
  window.clientID = sbUser + new Date().getTime();
  console.log('clientID', window.clientID);

  // main menu interaction
  $('.query.toggle').click(function() { $('.query.content').toggle('hidden'); $('.query.toggle').toggleClass('active');});
  $('.scrape.toggle').click(function() { $('.scrape.content').toggle('hidden'); $('.scrape.toggle').toggleClass('active'); });
  $('.team.toggle').click(function() { $('.team.content').toggle('hidden'); $('.team.toggle').toggleClass('active'); $('.member.content').hide(); $('#lastUsername').val(''); /* FIXME move to members.js */ });

  $('.details.toggle').click(function() { $('.details.sidebar').sidebar('toggle'); });

  $('.dashboard.toggle').click(function() { $('.dashboard.sidebar').sidebar('toggle'); });

  $('.dropdown').dropdown('hide');

  $('.dashboard.sidebar').sidebar({ onShow : function() { $('.dashboard.toggle').addClass('active'); $('.dashboard.sidebar').addClass('floating'); }, onHide : function() { $('.dashboard.toggle').removeClass('active'); $('.dashboard.sidebar').removeClass('floating'); }});
  $('.details.sidebar').sidebar({ onShow : function() { $('.details.toggle').addClass('active'); $('.details.sidebar').addClass('floating'); }, onHide : function() { $('.details.toggle').removeClass('active'); $('.details.sidebar').removeClass('floating'); }});
  $('.sidebar').sidebar('hide');

  $('.add.button').click(function() { $('#annotateEditor').toggle(); return false;});
  $('.member.item').click(function() {
    $('.member.item').removeClass('active');
    $('.member.segment').hide();
  });

  $('.member.options').click(function() {
    $('.member.options').addClass('active');
    $('.member.options.segment').show();
  });

  $('.member.statistics').click(function() {
    $('.member.statistics').addClass('active');
    $('.member.statistics.segment').show();
  });


//  $(document).tooltip();
// input element
  var spinner = $(".spinner").spinner({
    spin: function( event, ui ) {
      if ( ui.value < 0 ) {
        $( this ).spinner( "value", 'once only' );
        return false;
      }
    }
  });

  // formulate query parameters
  function getQueryOptions() {
    var options = { clientID: clientID + '-' + new Date().getTime(), terms : $('#termSearch').val(), annotationSearch : $('#annoSearch').val(),
      validationState: $('#validationState').val(), annotationState: $('#annotationState').val(), browseNum: $('#browseNum').val(),
      from: $('#fromDate').val(), to: $('#toDate').val(),
      // FIXME normalize including annotations 
      member: $('#annoMember').val(), annotations: ($("#browseNav" ).val() === 'annotations') ? '*' : null};
    return options;
  }

// perform a cluster query
  function doCluster() {
    // cancel any outstanding query
    if (clusterSub) {
      clusterSub.cancel();
    }

    var options = getQueryOptions();

    // use the generated clientID for the current query
    clusterSub = fayeClient.subscribe('/clusterResults/' + options.clientID, function(results) {
      console.log('/clusterResults', results);
      browseCluster.doTreemap(results.clusters, '#browse');
      updateResults(results);
    });
    fayeClient.publish('/cluster', options);
  }

// update the query results subscription to this clientID
  function updateQuerySub(clientID) {
    // cancel any outstanding query
    if (querySub) {
      querySub.cancel();
    }

    querySub = fayeClient.subscribe('/queryResults/' + clientID, function(results) {
      console.log('/queryResults', results);

      updateResults(results);

// query browse
      if ($("#browseNav" ).val() === 'annotations') {
        $('.browse.sidebar').sidebar('show');
        browseAnnotations.doTreemap(results, '#browse');
      } else {
        $('.browse.sidebar').sidebar('hide');
      }
    });
  }

// perform a general query
  function doQuery() {

    var options = getQueryOptions();
    // use the generated clientID for the current query
    updateQuerySub(options.clientID);

    fayeClient.publish('/query', options);
    $('.query.button').animate({opacity: 0.2}, 200, 'linear');
  }

// return all items selected
  function getSelected() {
    var selected = [];
    $('.selectItem').each(function() {
      if ($(this).is(':checked')) {
        selected.push(deEncID($(this).attr('name').replace('cb_', '')));
      }
    });
    return selected;
  }

// annotate selected
  $('.annotate.selected').click(function() {
    if ($('.selected.label').text() > 0) {
      $('.annotate.modal').modal('show');
    }
  });

  $('.confirm.annotate.button').click(function() { 
    var annotations = $('#selectedAnnotations').val().split(',').map(function(a) { return { type: 'category', category: a.trim()} });
    if (annotations.length) {
      fayeClient.publish('/saveAnnotations', { clientID: clientID, uris: getSelected(), annotatedBy: sbUser, annotations: annotations});
      return false;
    }
  });

// remove selected
  $('.remove.selected').click(function() {
    var i = lastResults.hits.hits.length, sel = getSelected();
    for (i; i > 0; ) {
      i--;
      if (sel.indexOf(lastResults.hits.hits[i]._source.uri) < 0) {
        delete lastResults.hits.hits[i];
      }
    }
    updateResults(lastResults);
  });

// delete selected
  $('.delete.selected').click(function() {
    if ($('.selected.label').text() > 0) {
      $('.delete.modal').modal('show');
    }
  });

  $('.confirm.delete.button').click(function() { 
    fayeClient.publish('/delete', { clientID: clientID, selected: getSelected()});
    return false;
  });

  $('.signout.item').click(function() {
    fayeClient.publish('/logout');
    document.location.href = '/logout';
  });

// FIXME toggle graph or table view
  $('.visualisation.item').click(function() {
    if ($(this).hasClass('scatter')) { 
      resultView = resultViews.scatter;
    } else if ($(this).hasClass('debug')) {
      resultView = resultViews.debug;
    } else {
      resultView = resultViews.table;
    }
    updateResults(lastResults);
  });

  $('.select.all').click(function() {
    $('.selectItem').prop('checked', true);
    checkSelected();
  });

  $('.select.invert').click(function() {
    $('.selectItem').each(function() {
      $(this).prop('checked', !$(this).prop('checked'));
    });
    checkSelected();
  });

// drag and drop members
  $('.team.container').droppable({
    drop: function(event, ui) {
      console.log('DROP', this, event, ui);
      window.ee = ui;
    } });


  // set up qs for parameters (from http://stackoverflow.com/a/3855394 )
  // initial query
  updateQueryForm();
  submitQuery();

  // needed by filter
  window.doQuery = doQuery;
  window.submitQuery = submitQuery;
  window.updateQuerySub = updateQuerySub;


  // hasQueuedUpdates and noUpdates are used to delay updates when content is being edited or viewed
  var queryRefresher, hasQueuedUpdates, noUpdates, queuedNotifier;
  var resultViews = {};

  // sets the current annotation loc
  function setCurrentURI(u) {
    currentURI = u.replace(/#.*/, '');
    console.log('currentURI', currentURI);
  }

  console.log('/annotations/' + window.clientID);
  // receive annotations
  fayeClient.subscribe('/annotations/' + window.clientID, function(data) {
    console.log('/annotations', data);
    // update query items
    if (data.annotationSummary && lastResults.hits) {
      var i = 0, l = lastResults.hits.hits.length;
      for (i; i < l; i++) {
        if (lastResults.hits.hits[i]._id === data.uri) {
          lastResults.hits.hits[i]._source.annotationSummary = data.annotationSummary;
          break;
        }
      }
      updateResults(lastResults);
    }

    if (data.uri === currentURI) {
      displayAnnoTree(data.annotations, data.uri, treeInterface);
    }
  });

  // delete an item
  fayeClient.subscribe('/deletedItem', function(item) {
    console.log('/deletedItem', item, lastResults);
    if (lastResults.hits) {
      var i = 0, l = lastResults.hits.hits.length;
      for (i; i < l; i++) {
        if (lastResults.hits.hits[i]._id === item._id) {
          lastResults.hits.hits.splice(i, 1);
          updateResults(lastResults);
          return;
        }
      }
      console.log('deletedItem not found', item);
    }
  });

  // FIXME normalize fields between base and _source
  function normalizeResult(result) {
    if (result.uri) {
      console.log('normalizing', result);
      if (!result._source) {
        result._source = {};
      }
      ['title', 'timestamp', 'uri'].forEach(function(f) {
        result._source[f] = result[f];
      });
    }
    return result;
  }

  // add a new or updated item
  fayeClient.subscribe('/updateItem', function(result) {
    console.log('/updateItem', result, lastResults);
    result = normalizeResult(result);
    if (!lastResults.hits) {
      lastResults = { hits: { total : 0, hits: [] } };
    } else {
      var i = 0, l = lastResults.hits.hits.length;
      for (i; i < l; i++) {
        if (lastResults.hits.hits[i]._source.uri === result._source.uri) {
          lastResults.hits.hits.splice(i, 1);
          break;
        }
      }
    }
    lastResults.hits.hits.unshift(result);
    updateResults(lastResults);
  });

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

  function clearQueryRefresher() {
    if (queryRefresher) {
      clearInterval(queryRefresher);
    }
  }

  function setupQueryRefresher(interval) {
    clearQueryRefresher();
    queryRefresher = setInterval(doQuery, interval);
  }

  var ULEN = 70;
  function shortenURI(u) {
    return (!u || u.length < ULEN) ? u : (u.substring(0, ULEN - 3) + '…' + u.substring(u.length - 3));
  }

  function updateResults(results) {
    // content is being viewed or edited, delay updates
    lastResults = results;
    if (noUpdates) {
      console.log('in noUpdates');
      hasQueuedUpdates = true;
      clearTimeout(queuedNotifier);
      queuedNotifier = setInterval(function() { $('.toggle.item').toggleClass('red') }, 2000);
      return;
    }
    // clear queued notifier
    $('.toggle.item').removeClass('red');
    clearInterval(queuedNotifier);
    $('.query.button').animate({opacity: 1}, 500, 'linear');
    // use arbitrary rendering to fill results
    var container = '#results';
    if (results.hits) {
      $(container).html('');
      $('#queryCount').html(results.hits.hits.length === results.hits.total ? results.hits.total : (results.hits.hits.length + '/' + results.hits.total));
      resultView.render(container, results);
    } else {
      $(container).html('<i>No items.</i>');
      $('#queryCount').html('0');
    }
  }

  // populate and display the URI's sidebar
  function displayItemSidebar(uri) {
    $('#itemContext').html(
      '<div class="item"><a target="' + encodeURIComponent(uri) + '" href="' + uri + '"><i class="external url icon"></i>New window</a></div>' +
      '<div onclick="moreLikeThis(\'' + uri +'\')" class="item"><i class="puzzle piece icon"></i>More like this</div>' +
      '<div onclick="refreshAnnos(\'' + uri +'\')" class="item"><i class="refresh icon"></i>Refresh</div>' +
      '<div class="item"><i class="delete icon"></i>Delete</div>' +
      '<div class="item"><a target="_debug" href="http://undefined:9200/ps/contentItem/' + encodeURIComponent(uri) + '?pretty=true"><i class="bug icon"></i>Debug</a></div>'
      );
    $('.context.dropdown').dropdown();
    setCurrentURI(uri);
    fayeClient.publish('/annotate', { clientID: window.clientID, uri: uri });
    $('#startingPage').val(uri);
    $('.details.sidebar').sidebar('show');
  }

  function hideItemSidebar() {
    $('.details.sidebar').sidebar('hide');
  }

  // render results in an html table
  resultViews.table = {
    render: function(dest, results) {
      var curURI, shown = false;

      // display or close uri controls and frame (for link)
      selectedURI = function(ev) {
    // FIXME firing twice
        $('.selectRow').removeClass('active');
        var $el = $(this), id = $el.parents('tr').attr('id'), uri = decodeURIComponent(deEncID(id));
        if (curURI !== uri) {
          $('#preview').remove();
          shown = false;
        }

        if (shown) {
          $('#preview').remove();
          if ($el.hasClass('selectURI')) {
            window.location.hash = '';
            window.location.hash = id;
          }
          if (hasQueuedUpdates) {
            console.log('displaying queued updates');
            updateResults(lastResults);
            hasQueuedUpdates = null;
          }
          hideItemSidebar();
          curURI = null;
          shown = false;
          noUpdates = false;
        } else {
          displayItemSidebar(uri);
          curURI = uri;
          if ($el.hasClass('selectURI')) {
            $('#preview').remove();
            // use cached address FIXME canonicalize URIs
            //$el.parent().after('<iframe style="width: 100%" id="preview" src="http://es.fungalgenomics.ca/cached/'+ encodeURIComponent(uri) +'"></iframe>');
            if ($el.hasClass('content')) { // text content
              uri = 'http://es.fungalgenomics.ca/content/' + encodeURIComponent(uri);
            }
            console.log($el, uri);
            $el.parent().after('<iframe style="width: 100%" id="preview" src="' + uri +'"></iframe>');
            window.location.hash = id;
            noUpdates = true;
          } else {
            noUpdates = false;
            window.location.hash = '';
          }
          shown = true;
          $el.parents('tr').addClass('active');
        }
        return false;
      }

      checkSelected = function() {
        var hasSelected = 0;
        $('.selectItem').each(function() {
          if ($(this).is(':checked')) {
            hasSelected++;
          }
        });

        $('.requires.selected').toggleClass('disabled', !(hasSelected > 0));
        $('.selected.count').html(hasSelected);
      } 

      setupTable = function() {
        $('.selectURI').click(selectedURI);
        $('.annotations.button').click(selectedURI);
        $('.showa').click(function() {
          $(this).next().toggle();
        });
        $('.selectItem').click(checkSelected);
        $('table').on('tablesort:complete', function(event, tablesort) {
          setupTable();
        });
      }

      $(dest).append('<table id="resultsTable" class="ui sortable table"><thead><tr><th class="descending">' +
        'Rank</th><th>Document</th><th>Visitors</th><th>Annotations</th></tr></thead><tbody></tbody></table>');
      var count = 0;
      results.hits.hits.forEach(function(r) {
        var v = r.fields || r._source, highlight = '';
        if (r.highlight) {
          highlight = r.highlight.text;
        }
        var rankVal = r._score ? r._score : ++count;
        var row = '<tr class="selectRow" id="' + encID(v.uri) + '"><td data-sort-value="' + rankVal + '"><input class="selectItem" type="checkbox" name="cb_' + encID(v.uri) + '" />' + rankVal + '</td><td data-sort-value="' + v.title + '">' +
          '<div><a href="javascript:void(0)"></a><a class="selectURI" href="'+ v.uri + '">' + (v.title ? v.title : '(no title)') + '</a><br />' + 
          '<a class="selectURI content"><i class="text file icon"></i></a> <a class="selectURI uri" href="'+ v.uri + '"> ' + shortenURI(v.uri) + '</a></div><div class="highlighted">' + highlight +
    '</div></td><td class="rowVisitors" data-sort-value="' + (v.visitors ? v.visitors.length : 0) + '">';
        // roll up visitors
        if (v.visitors) {
          var vv = '', va = {};
          v.visitors.forEach(function(visitor) {
            var a = va[visitor.member] || { visits: []};
            a.visits.push(visitor['@timestamp']);
            va[visitor.member] = a;
          });
          for (var a in va) {
            vv += '<div class="showa"><span class="mini ui basic button"><a class="mini ui black basic circular label">' + va[a].visits.length + '</a> ' + a + '</span></div><div class="hidden">' + JSON.stringify(va[a].visits) + '</div>';
          }
          row += '' + vv;
        }
        row += '</td><td class="rowAnnotations">';
        if (v.annotationSummary !== undefined) {
          if (v.annotationSummary.validated > 0) { 
            row += '<div class="ui tiny green annotations button"><i class="checked checkbox icon"></i> ' + v.annotationSummary.validated + '</div><div class="hidden validatedSummary"></div>';
          }
          if (v.annotationSummary.unvalidated > 0) { 
            row += '<div class="ui tiny blue annotations button"><i class="empty checkbox icon"></i> ' + v.annotationSummary.unvalidated + '</div><div class="hidden unvalidatedSummary"></div>';
          }
        }
        row += '</td>';
        $('#resultsTable tbody').append(row);
      });

      $('.sortable.table').tablesort();
      setupTable();
    }
  }

  resultViews.scatter = {
    render: function(dest, results) {
      resultsData = function(fields, results) { //# groups,# points per group
        var data = [],
          shapes = ['circle', 'cross', 'triangle-up', 'triangle-down', 'diamond', 'square'],
          random = d3.random.normal();

        fields.forEach(function(field) {
          var cur = { key : field, values : [] };

          for (j = 0; j < results.hits.hits.length; j++) {
            var hit = results.hits.hits[j]._source;
            if (hit.annotationSummary) {
              var annos = hit.annotationSummary.validated + hit.annotationSummary.unvalidated + 1;
              var annosVal = hit.annotationSummary.validated + 1;
            } else {
              annos = 1;
              annosVal = 1;
            }
            annos = random(); //FIXME

            cur.values.push({
              x: new Date(hit[field]),
              y: annos,
              data: hit,
              size: annosVal,   //Configure the size of each scatter point
              shape: "circle"  //Configure the shape of each scatter point.
            });
          }
          data.push(cur);
        });

        return data;
      }
      $(dest).append('<svg>');
      nv.addGraph(function() {
        var chart = nv.models.scatterChart()
          .showDistX(true)    //showDist, when true, will display those little distribution lines on the axis.
          .showDistY(true)
          .transitionDuration(350)
          .color(d3.scale.category10().range());

        //Configure how the tooltip looks.
        chart.tooltipContent(function(key, x, y, e, graph) {
          var sel= encID(e.point.data.uri);
          return '<h3>' + e.point.data.title + '</h3>';
        });

        //Axis settings
    //    chart.xAxis.tickFormat(d3.format('.02f'));
        chart.xAxis.tickFormat(function(d) { return d3.time.format('%b %d')(new Date(d)); })
        chart.yAxis.tickFormat(d3.format('.02f'));

        //We want to show shapes other than circles.
        chart.scatter.onlyCircles(false);

        var myData = resultsData(['timestamp'], results);
        d3.select(dest + ' svg')
          .datum(myData)
          .call(chart);

        nv.utils.windowResize(chart.update);

        return chart;
      });
    }
  }

  resultViews.debug = {
    render: function(dest, results) {
      $(dest).html('<pre>'+JSON.stringify(results, null, 2) + '<br />Length: ' + JSON.stringify(results, null, 2).length + '</pre>');
    },
    annotations: '*'
  }


  resultView = resultViews.table;

  var justEdited, rTeams, editingMember;

  fayeClient.subscribe('/teamList/' + clientID, function(teams) {
    $('#aneditor').hide();
    console.log('teams', teams);
    // populate any team containers
    $('.team.container').find('option').remove();
    var teamTypes = {};
    teams.forEach(function(m) {
      // create selects
      if (m.status === 'available' && m.type === 'Searcher') {
        // group by type
        teamTypes[m.type] = (teamTypes[m.type] || '') + '<option value="' + m.username + '">' + m.username + '</option>';
      }
      var row = '<a style="margin: 4px" id="' + m.username + '" class="ui small ' + (m.status === 'available' ? 'enabled' : 'disabled') + ' member image label">' +
        (m.class ? '<i class="' + m.class + ' icon"></i>' : 
          '<img style="height: 24px" class="image '  + '" src="http://es.fungalgenomics.ca/__wm/icons/' + (m.icon || 'mesh.png') + '" alt="' + m.username + '" />') + 
        ' ' + m.username + '</a>';
      $('.teamlist.field').prepend(row);
    });
    for (type in teamTypes) {
      $('.team.container').append('<optgroup label="' + type + '">' + teamTypes[type] + '</optgroup>');
    }
    $('.enabled.member').draggable({stack: 'a', helper: 'clone'});

    $('#newName').val(''); 
    $('#newEmail').val('');
    $('.teamCancel').click(function() { $('#aneditor').hide(); });
    $('.member.image').click(function(i) {
      var id = $(this).attr('id');
      if ($('#lastUsername').val() === id) {
        $('#lastUsername').val('');
        $('.member.form').hide();
      } else {
        $('.member.form').show();
        $('.member.button').removeClass('active');
        $(this).addClass('active');
        showEdit(id);
      }
    });
    rTeams = teams;
    if (justEdited) {
      showEdit(justEdited);
      justEdited = null;
    }
  });
  fayeClient.publish('/team/list', { clientID: clientID});

  $('#newCreate').click(function() {
    fayeClient.publish('/team/add', { clientID: clientID, name: $('#newName').val(), type: $('#newType').val() });
    justEdited = $('#newName').val();
    return false;
  });

  function showEdit(username) {
    if (!rTeams) {
      return;
    }
    // hide all types
    $('.anedit').hide(); 
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
    $('#needsValidation').prop('checked', editingMember.needsValidation === true);
    if (editingMember.type === 'User') {
      setupValidation();
      $('#canValidate').prop('checked', (editingMember.canValidate === true) && editingMember.needsValidation !== true);
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
    } else if (editingMember.type === 'Searcher') {
      $('#teamRemove').show();
      $('#searchTemplate').val(editingMember.template);
      $('#searchAPI').val(editingMember.api);
      $('#editSearcher').show();
    } else {
      $('#teamRemove').hide();
      $('#editAgent').show();
    }
    $('#aneditor').show();
  }

  $('#teamRemove').click(function() {
    fayeClient.publish('/team/remove', { clientID: clientID, username: editingMember.username});
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
    // FIXME add clientID
    fayeClient.publish('/team/save', editingMember);
    return false;
  });



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


// submit a query 
function submitQuery() { 
// save form contents in querystring 
  var ss = []; 
  queryFields.forEach(function(i) { 
    if ($('#'+i).val()) { 
      ss.push(i + '=' + $('#'+i).val()); 
    }  
  }); 
 
  window.history.pushState('query form', 'Query', 'index.html?' + ss.join('&')); 
 
  if ($("#browseNav" ).val() === 'cluster') { 
    $('#browse').html('<img src="/__wm/loading.gif" alt="loading" /><br />Loading cluster treemap'); 
    $('.browse.sidebar').sidebar('show'); 
    doCluster(); 
  } else { 
    doQuery(); 
  } 
  return false; 
} 


});

// update the query form based on query fields
function updateQueryForm() {
  // populate the querystring object
  if (!qs) {
    qs = (function(a) {
      if (a == "") return {};
      var b = {};
      for (var i = 0; i < a.length; ++i) {
        var p=a[i].split('=');
        if (p.length != 2) continue;
        b[p[0]] = decodeURIComponent(p[1].replace(/\+/g, " "));
      }
      return b;
    })(window.location.search.substr(1).split('&'));
  }

  queryFields.forEach(function(f) {
    if (qs[f]) {
      $('#'+f).val(qs[f]);
    }
  });
}

function moreLikeThis(uri) {
  fayeClient.publish('/moreLikeThis', { clientID: clientID, uri: uri});
  updateQuerySub(clientID);
}

function refreshAnnos(uri) {
  fayeClient.publish('/updateContent', { clientID : clientID, uri: uri } );
}

var encIDs = [];
// encode a string (URI) for an ID
function encID(c) {
  return 'enc' + (encIDs.indexOf(c) > -1 ? encIDs.indexOf(c) : encIDs.push(c) - 1);
}

function deEncID(c) {
  return encIDs[c.replace('enc', '')];
}

var treeFilterTimeout;
// display all annotations, then return a structure containing instances mapped to IDs
function displayAnnoTree(annotations, uri) {
  // utility to manage IDs for items
  var treeItems = {
    // ids and their items
    map : {},
    // id issued in sequence
    _id : 0,
    reset : function() {
      this.map = {};
      this._id = 0;
    },
    // get an id
    id : function(o) {
      this._id++;
      o.__id = this._id;
      this.map[this._id] = o;
      return this._id;
    },
    // return the item for this id
    get : function(i) {
      return this.map[i];
    }
  };

  // create positions of tree items
  var treeMap = {}, treeRoot = { text: 'Annotations', children: []}, annoTotal = 0, curParent;
  annotations.forEach(function(cur) {
    annoTotal++;
    // get parent position (position without current)
    if (!cur.position) {
      console.log('missing position', cur);
      return;
    }
    var ppos = cur.position.slice(0, cur.position.length - 1);
    // find or create parents
    var roots = [], curAdd = treeRoot;
    
    ppos.forEach(function(cpos) {
      roots.push(cpos);
      curParent = treeMap[roots];
      if (!curParent) {
        curParent = { text: cpos, children: [] };
        console.log('creating', curParent, roots);
        treeMap[roots] = curParent;
        curAdd.children.push(curParent);
      }
        curAdd = curParent;
    });

    if (treeMap[cur.position]) {
      cur.children = treeMap[cur.position].children;
      cur.id = treeMap[cur.position].id || treeItems.id(cur);
    } else {
      cur.children = [];
      cur.id = treeItems.id(cur);
    }
    cur.text = cur.position[cur.position.length - 1];

    // add ranges
    if (cur.type === 'quote') {
      var instances = [];
      cur.ranges.forEach(function(r) {
        instances.push({ type: 'range', text: r.exact, id: treeItems.id(r) });
      });
      cur.children = instances;
    // display key : value
    } else if (cur.type === 'value' || cur.type === 'valueQuote') {
      cur.text = cur.key + ':' + cur.value;
    // should be ok as-is
    } else if (cur.type === 'category') {
    }

    curParent.children.push(cur);
    treeMap[cur.position] = cur;
  });

  console.log('TREE', treeRoot, annoTotal);

  $('#annotationCount').html(annoTotal);

  $.jstree.defaults.core.themes.responsive = false;
  $.jstree.defaults.search.fuzzy = false;

  $('#treeContainer').html('<div id="annoTree"></div>');
  $('#annoTree').jstree('open_all');
  $('#annoTree').on('hover_node.jstree', function(e, data) {
    var anno = treeItems.get(data.node.id);
    treeInterface.hover(anno, e, data);
  }).on('select_node.jstree', function(e, data) {
    var anno = treeItems.get(data.node.id);
    treeInterface.select(anno, e, data);
  }).jstree({
    core : { data: treeRoot },
    plugins : [ "search", "types", "wholerow" ],
    types : {
      default : {
        icon : "tags icon"
      },
      range : {
        icon : "ellipsis horizontal icon"
      },
      category : {
        icon : "tag icon"
      },
      valueQuote : {
        icon : "text width icon"
      },
      value : {
        icon : "info letter icon"
      },
      quote : {
        icon : "quote left icon"
      }
   }
  });
  $('#annoTree').jstree('open_all');
  $('#treeFilter').keyup(function () {
    if(treeFilterTimeout) { clearTimeout(treeFilterTimeout); }
    treeFilterTimeout = setTimeout(function () {
      var v = $('#treeFilter').val();
      $('#annoTree').jstree(true).search(v);
    }, 250);
  });

  console.log('treeAnnos', treeMap);
  return treeItems;
}

