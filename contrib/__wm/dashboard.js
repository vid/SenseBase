// ### Dashboard
//
// General module for SenseBase browser client.
/*jslint node: true */

'use strict';

// module variables

var resultViews = { scatter: require('./results.scatter'), table: require('./results.table'), debug: require('./results.debug')},
  resultView = resultViews.table,
  querySub, clusterSub, qs;
var faye = require('faye');

var fayeClient = new faye.Client(location.protocol + '://' + location.hostname + ':' + location.port + '/faye/');

var queryFields = ['termSearch', 'annoSearch', 'fromDate', 'toDate', 'annoMember', 'browseNav', 'browseNum'];

// Unique ID for pubsub
var clientID;

var resultsLib = require('./results'), membersLib = require('./members'), searchLib = require('./search'), utils = require('./clientUtils');

var browseCluster = require('./browseCluster');
var browseAnnotations = require('./browseAnnotations');

// initialize page functions
exports.init = function(sbUser) {
  resultsLib.init(fayeClient, submitQuery, resultView);
  searchLib.init(fayeClient, sbUser, resultsLib);
  membersLib.init(fayeClient, clientID);

  setupDND('uploadItem', '/upload');
  setupDND('uploadWorkfile', '/workfile');
  // General setup and functions
  clientID = sbUser + new Date().getTime();
  console.log('clientID', window.clientID);

  // main menu interaction
  $('.query.toggle').click(function() { $('.query.content').toggle('hidden'); $('.query.toggle').toggleClass('active');});
  $('.search.toggle').click(function() { $('.search.content').toggle('hidden'); $('.search.toggle').toggleClass('active'); });
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
    var i = resultsLib.lastResults.hits.hits.length, sel = getSelected();
    for (i; i > 0; ) {
      i--;
      if (sel.indexOf(resultsLib.lastResults.hits.hits[i]._source.uri) < 0) {
        delete resultsLib.lastResults.hits.hits[i];
      }
    }
    resultsLib.updateResults(resultsLib.lastResults);
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
    resultsLib.updateResults(resultsLib.lastResults, resultView);
  });

  $('.select.all').click(function() {
    $('.selectItem').prop('checked', true);
    resultView.checkSelected();
  });

  $('.select.invert').click(function() {
    $('.selectItem').each(function() {
      $(this).prop('checked', !$(this).prop('checked'));
    });
    resultView.checkSelected();
  });

  // drag and drop members
  $('.team.container').droppable({
    drop: function(event, ui) {
      console.log('DROP', this, event, ui);
      window.ee = ui;
    }
  });


  // set up qs for parameters (from http://stackoverflow.com/a/3855394 )
  // initial query
  updateQueryForm();
  submitQuery();

  // needed by filter
  window.doQuery = doQuery;
  window.submitQuery = submitQuery;
  window.updateQuerySub = updateQuerySub;

};
// end of init

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
    browseCluster.doTreemap(results.clusters, '#browse', resultView);
    resultsLib.updateResults(results);
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

    resultsLib.updateResults(results);

// query browse
    if ($("#browseNav" ).val() === 'annotations') {
      $('.browse.sidebar').sidebar('show');
      browseAnnotations.doTreemap(results, '#browse', resultView);
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
      selected.push(utils.deEncID($(this).attr('name').replace('cb_', '')));
    }
  });
  return selected;
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

// update the query form based on query fields
function updateQueryForm() {
  // populate the querystring object
  if (!qs) {
    qs = (function(a) {
      if (a === "") return {};
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
