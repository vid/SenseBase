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
          $('#annoSearch').val('category:"' + anno.text + '"');
        }
        doSearch();
      });
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
  window.myID = sbUser + new Date().getTime();
  console.log('myID', window.myID);

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
    var options = { client: myID, terms : $('#termSearch').val(), annotations : $('#annoSearch').val(),
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

// annotate selected
  $('.annotate.selected').click(function() {
    if ($('.selected.label').text() > 0) {
      $('.annotate.modal').modal('show');
    }
  });

  $('.confirm.annotate.button').click(function() { 
    var selected = [];
    $('.selectItem').each(function() {
      if ($(this).is(':checked')) {
        selected.push(deEncID($(this).attr('name').replace('cb_', '')));
      }
    });
    var annotations = $('#selectedAnnotations').val().split(',');
    if (annotations.length) {
      fayeClient.publish('/saveAnnotations', { uris: selected, annotatedBy: sbUser, annotations: annotations});
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
    var selected = [];
    $('.selectItem').each(function() {
      if ($(this).is(':checked')) {
        selected.push(deEncID($(this).attr('name').replace('cb_', '')));
      }
    });
    fayeClient.publish('/delete', { selected: selected});
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
  fayeClient.publish('/moreLikeThis', { client: myID, uri: uri});
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

// sets the current annotation loc
function setCurrentURI(u) {
  currentURI = u.replace(/#.*/, '');
  console.log('currentURI', currentURI);
  if (annoSub) {
    annoSub.cancel();
  }
  // receive annotations
  annoSub = fayeClient.subscribe('/annotations', function(data) {
    var annotations = data.annotations, uri = data.uri;
    // it's not current but needs to be updated
    if (uri !== currentURI) {
      //FIXME should only update if its in current results
      console.log('/annotations not current uri', uri, currentURI);
      return;
    }
    console.log('/annotations updating current', data);
  // it's our current item, display
    displayAnnoTree(annotations, uri, treeInterface);
  });

}

include "displayAnnoTree.js"
