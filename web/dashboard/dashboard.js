// ### Dashboard
//
// General module for SenseBase browser client.
/* jslint browser: true */
/* jslint node: true */
/* global $,setupDND */

'use strict';
// module variables
var homepage = window.senseBase.homepage;

var React = require('react');

var resultViews = { scatter: require('../lib/results.scatter'), table: require('../lib/results.table'),
  debug: require('../lib/results.debug')};

var resultsLib = require('../lib/results'), membersLib = require('../lib/members'), searchLib = require('../lib/search'),
  queryLib = require('../lib/query.jsx'), watchlist = require('../lib/watchlist'),
  pubsub = require('../../lib/pubsub-client').init(window.senseBase);

// initialize page functions
exports.init = function() {
  console.log('init dashboard');

  var context = {pubsub: pubsub, resultsLib: resultsLib, queryLib: queryLib};
  resultsLib.init(context, resultViews.table);
  searchLib.init(context);
  membersLib.init(context);
  queryLib.init(context);

  setupDND('uploadItem', homepage + 'upload');
  // General setup and functions

  var filters = '';

  React.renderComponent(queryLib.QueryForm({data: filters}), $('.query.content')[0]);

  // main menu interaction
  $('.query.toggle').click(function() { $('.query.content').toggle('hidden'); $('.query.toggle').toggleClass('active');});
  $('.search.toggle').click(function() { $('.search.content').toggle('hidden'); $('.search.toggle').toggleClass('active'); });
  $('.team.toggle').click(function() { $('.team.content').toggle('hidden'); $('.team.toggle').toggleClass('active'); $('.member.content').hide(); $('#lastUsername').val(''); /* FIXME move to members.js */ });

  $('.details.toggle').click(function() { $('.details.sidebar').sidebar('toggle'); });

  $('.dashboard.toggle').click(function() { $('.dashboard.sidebar').sidebar('toggle'); watchlist.init(context); });

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
    spin: function(event, ui) {
      if (ui.value < 0) {
        $(this).spinner("value", 'once only');
        return false;
      }
    }
  });

  // Subscribe to selected.
  //
  // See also subscribe to annotation.
  $('.subscribe.item').click(function() {
    if ($('.selected.label').text() > 0) {
      $('.subscribe.modal').modal('show');
      $('#subscribeItems').val(resultsLib.getSelected().map(function(s) { return 'uri:'+s; }).join('\n'));
    }
  });

  $('.confirm.subscribe.button').click(function() {
    var items = $('#subscribeItems').val().split('\n');
    if (items.length) {
      pubsub.subscriptions.save(items);
      return false;
    }
  });

  // morelikethis
  $('.morelikethis.selected').click(function() {
    if ($('.selected.label').text() > 0) {
      resultsLib.moreLikeThis(resultsLib.getSelected());
    }
  });
  // annotate selected
  $('.annotate.selected').click(function() {
    if ($('.selected.label').text() > 0) {
      $('.annotate.modal').modal('show');
    }
  });

  $('.confirm.annotate.button').click(function() {
    var annotations = $('#selectedAnnotations').val().split(',').map(function(a) { return { type: 'category', category: a.trim()}; });
    if (annotations.length) {
      pubsub.item.annotations.save(resultsLib.getSelected(), annotations);
      return false;
    }
  });

  // remove selected
  $('.remove.selected').click(resultsLib.removeSelected);

  // delete selected
  $('.delete.selected').click(function() {
    if ($('.selected.label').text() > 0) {
      $('.delete.modal').modal('show');
    }
  });

  $('.confirm.delete.button').click(function() {
    pubsub.item.delete(resultsLib.getSelected());
    return false;
  });

  $('.signout.item').click(function() {
    pubsub.logout();
    document.location.href = './logout';
  });

  $('.navigator.item').click(function() {
    $('.query.navigator').val($(this).attr('id'));
    queryLib.submitQuery();
    return;
  });

  // FIXME toggle graph or table view
  $('.visualisation.item').click(function() {
    var view;
    if ($(this).hasClass('scatter')) {
      view = resultViews.scatter;
    } else if ($(this).hasClass('debug')) {
      view = resultViews.debug;
    } else {
      view = resultViews.table;
    }
    resultsLib.setResultView(view);
    resultsLib.updateResults();
  });
  $('.select.all').click(function() {
    $('.selectItem').prop('checked', true);
    resultsLib.view.checkSelected();
  });

  $('.select.invert').click(function() {
    $('.selectItem').each(function() {
      $(this).prop('checked', !$(this).prop('checked'));
    });
    resultsLib.view.checkSelected();
  });

  // drag and drop members
  $('.team.container').droppable({
    drop: function(event, ui) {
      console.log('DROP', this, event, ui);
      window.ee = ui;
    }
  });

  window.onpopstate = function(event) {
    if(event && event.state) {
      location.reload();
    }
  };
  // initial query if not popping state
  queryLib.updateQueryForm();
  queryLib.submitQuery();
  sizeResults();
  window.addEventListener('resize', sizeResults);
  $('.results').css('overflow', 'auto');
};

function sizeResults() {
  $('#results').height(window.innerHeight - $('#results').offset().top);
}
