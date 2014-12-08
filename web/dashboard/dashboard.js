// ### Dashboard
//
// General module for SenseBase browser client.
/* jslint browser: true */
/* jslint node: true */
/* global $,setupDND */

'use strict';
// module variables
var homepage = window.senseBase.homepage;

var React = require('react'), _ = require('lodash');

var resultViews = { scatter: require('../lib/results.scatter'), table: require('../lib/results.table'),
  debug: require('../lib/results.debug')};

var resultsLib = require('../lib/results'), membersLib = require('../lib/members'), searchLib = require('../lib/search'),
  queryLib = require('../lib/query.jsx'), watchlist = require('../lib/watchlist'),
  pubsub = require('../../lib/pubsub-client').init(window.senseBase), utils = require('../lib/clientUtils');

// initialize page functions
exports.init = function() {
  console.log('init dashboard');

  var context = {pubsub: pubsub, resultsLib: resultsLib, queryLib: queryLib};
  resultsLib.init(context, resultViews.table);
  searchLib.init(context);
  membersLib.init(context);
  queryLib.init(context);

  // forced logout (session stale?)
  pubsub.loggedOut(function() {
    window.location = 'login';
  });

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

  $(document).tooltip();
  setTimeout(function() {
    $('.input.terms').tooltip({ content: $('.query.help').html()});
    $(document).tooltip('option', 'disabled', true);
  }, 1000);
  $('.help.toggle').click(function() {
    var isDisabled = $(document).tooltip('option', 'disabled');
    $(document).tooltip('option', 'disabled', !isDisabled);
    $('.help.toggle').toggleClass('active');
  });

  // input element
  var spinner = $(".spinner").spinner({
    spin: function(event, ui) {
      if (ui.value < 0) {
        $(this).spinner("value", 'once only');
        return false;
      }
    }
  });

// reconcile missing items by field
  $('.reconcile.item').click(function() {
    $('.reconcile.modal').modal('show');
    $('.notfound').hide();
  });

// add missing items to results
  $('.confirm.reconcile').click(function() {
    var field = $('#reconcileField').val(), fieldType = utils.getFlattenedType(field), vals = _.uniq($('#reconcileValues').val().split('\n'));
    var i = vals.length;
    while (i--) {
      var value = vals[i];
      value = value.trim();
      context.resultsLib.getLastQuery().results.hits.hits.forEach(function(r) {
        r._source.fields.forEach(function(rField) {
          // it exists
          if (rField.flattened.indexOf(field) === 0) {
            if ((fieldType === 'category' && rField.category === r) || (fieldType === 'value' && rField.value == value)) {
              $('input[name=cb_' + utils.encID(decodeURIComponent(r._source.uri)) + ']').prop('checked', 'true');
              vals.splice(i, 1);
            }
          }
        });
      });
    }
    $('.notfound').html((vals.length ? '<h1>Items not found: ' + vals.length + '</h1>' + vals.join('<br />') : '<h1>All items were found</h1>') + '<p>Found items are selected.</p>');
    setTimeout(function() {
      $('.reconcile.modal').modal('show');
      $('.notfound').show();
    }, 1500);
  });

  // Watch selected.
  //
  // See also watch annotation.
  $('.watch.item').click(function() {
    if ($('.selected.label').text() > 0) {
      $('.watch.modal').modal('show');
      $('#watchItems').val(resultsLib.getSelected().map(function(s) { return 'uri:'+s; }).join('\n'));
    }
  });

  $('.confirm.watch.button').click(function() {
    var items = $('#watchItems').val().split('\n');
    if (items.length) {
      pubsub.watch.save(items);
      return false;
    }
  });

  // Change item title
  $('.edit.title').click(function() {
    $('.edit.title.modal').modal('show');
  });

  $('.edit.title.button').click(function() {
    var newTitle = $('#itemTitle').val();
    var title = $('#itemTitle').val();
    var uri = context.resultsLib.currentURI;
    context.pubsub.item.save({ uri: uri, title: title});
    return false;
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
    var annotations = $('#selectedAnnotations').val() ? $('#selectedAnnotations').val().trim().split(',').map(function(a) { return { type: 'category', category: a.trim()}; }) : [];
    var annotators = $('.team.annotators').val();
    if (annotations.length || annotators.length) {
      pubsub.item.annotations.adjure(resultsLib.getSelected(), annotations, annotators);
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
