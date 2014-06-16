// GLOBALS

var resultViews = {}, resultView, annoSub; 
var sbUser = window.senseBase.user;
var fayeClient = new Faye.Client('<!-- @var FAYEHOST -->');

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
        } else {
          $('#annoSearch').val('"' + anno.text + '"');
        }
        doSearch();
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
  // General setup and functions
  var currentURI;
  window.clientID = sbUser + new Date().getTime();
  console.log('clientID', window.clientID);

  // main menu interaction

  $('.search.toggle').click(function() { $('.search.content').toggle('hidden'); $('.search.toggle').toggleClass('active');});
  $('.scrape.toggle').click(function() { $('.scrape.content').toggle('hidden'); $('.scrape.toggle').toggleClass('active'); });
  $('.team.toggle').click(function() { $('.team.content').toggle('hidden'); $('.team.toggle').toggleClass('active'); $('.member.content').hide(); $('#lastUsername').val(''); /* FIXME move to members.js */ });
  $('.details.toggle').click(function() { $('.details.content').toggle('hidden'); $('.details.toggle').toggleClass('active'); });

   $('.selected.dropdown').dropdown('hide');

  $('.sidebar').sidebar('hide');
  $('.details.sidebar').sidebar({ overlay: true});
  $('.details.sidebar').sidebar({ onShow : function() { $('.details.toggle').addClass('active');  }, onHide : function() { $('.details.toggle').removeClass('active'); }});

  $('.add.button').click(function() { $('#annotateEditor').toggle(); return false;});
  $('.member.item').click(function() {
    $('.member.item').removeClass('active');
    $('.member.segment').hide();
  });

  $('.treemap.button').click(function() {
    $('#browse').html('<img src="/__wm/loading.gif" alt="loading" /><br />Loading cluster treemap');
    $('.browse.sidebar').sidebar('toggle');
    var options = getSearchOptions();
    fayeClient.publish('/cluster', getSearchOptions());
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

  // formulate search parameters
  function getSearchOptions() {
    var options = { clientID: clientID, terms : $('#termSearch').val(), annotations : $('#annoSearch').val(),
      validationState: $('#validationState').val(), annotationState: $('#annotationState').val(),
      from: $('#fromDate').val(), to: $('#toDate').val(),
      member: $('#annoMember').val() };
    return options;
  }

  function doSearch() {
    if (!isSearching) {
      isSearching = true;
      $('.search.submit').attr('disabled','disabled');
      fayeClient.publish('/search', getSearchOptions());
      $('.search.button').animate({opacity: 0.2}, 200, 'linear');
    } else {
      console.log('already searching');
    }
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
      fayeClient.publish('/saveAnnotations', { clientID: window.clientID, uris: getSelected(), annotatedBy: sbUser, annotations: annotations});
      return false;
    }
  });

// delete selected
  $('.delete.selected').click(function() {
    if ($('.selected.label').text() > 0) {
      $('.delete.modal').modal('show');
    }
  });

  $('.confirm.delete.button').click(function() { 
    fayeClient.publish('/delete', { selected: getSelected()});
    return false;
  });

  $('.details.toggle').click(function() {
    $('.details.sidebar').sidebar('toggle');
  });

  $('.signout.item').click(function() {
    fayeClient.publish('/logout');
    document.location.href = '/logout';
  });

// FIXME toggle graph or table view
  $('.graph.item').click(function() {
    if (resultView === resultViews.scatter) {
      resultView = resultViews.table;
    } else {
      resultView = resultViews.scatter;
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
  // needed by filter
  doSearch();
  $('.team.container').select2();
  window.doSearch = doSearch;

  include "results.js"
  include "members.js"
  include "scrape.js"

});

function moreLikeThis(uri) {
  fayeClient.publish('/moreLikeThis', { client: clientID, uri: uri});
}

function refreshAnnos(uri) {
  fayeClient.publish('/updateContent', { uri: uri } );
}

var encIDs = [];
// encode a string (URI) for an ID
function encID(c) {
  return 'enc' + (encIDs.indexOf(c) > -1 ? encIDs.indexOf(c) : encIDs.push(c) - 1);
}

function deEncID(c) {
  return encIDs[c.replace('enc', '')];
}

include "displayAnnoTree.js"
