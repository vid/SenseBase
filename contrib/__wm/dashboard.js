var resultViews = {}, resultView, annoSub; 
var sbUser = window.senseBase.user;
var fayeClient = new Faye.Client('<!-- @var FAYEHOST -->');
var treeInterface = { hover: function(anno) {}, select: function(anno) {} };

var mainSize = 0, fluidSizes = ['four', 'five', 'six', 'seven']; // fluid sizes for main ui
$(function() {
  // General setup and functions
  var currentURI;
  window.myID = sbUser + new Date().getTime();
  console.log('myID', window.myID);

  if (window.senseBase.logo) {
    $('<button style="height: 56px" title="Logo" class="ui mini logo attached button"> <img src="' + window.senseBase.logo + '" style="width: 100%" /></button>').prependTo('.main.fluid.buttons');
    $('.ui.logo.button').click(function() { window.location = window.senseBase.homepage;  });
    mainSize++;
  }
  if (window.senseBase.collab) {
    $('<button title="Conversations" class="ui collab attached button"><i class="large chat icon"></i></button>').appendTo('.main.fluid.buttons');
    $('.ui.collab.button').click(function() { TogetherJS(this); return false; });
    mainSize++;
  }

  $('.main.fluid.buttons').addClass(fluidSizes[mainSize]);

  $('.ui.search.toggle.button').click(function() { $('.search.content').toggle('hidden'); $('.ui.search.toggle.button').toggleClass('active');});
  $('.ui.scrape.toggle.button').click(function() { $('.scrape.content').toggle('hidden'); $('.ui.scrape.toggle.button').toggleClass('active'); });
  $('.ui.team.toggle.button').click(function() { $('.team.content').toggle('hidden'); $('.ui.team.toggle.button').toggleClass('active'); $('.member.content').hide(); $('#lastUsername').val(''); /* FIXME move to members.js */ });
  $('.ui.lab.toggle.button').click(function() { $('.lab.content').toggle('hidden'); $('.ui.lab.toggle.button').toggleClass('active');  });
  $('.ui.settings.toggle.button').click(function() { $('.settings.content').toggle('hidden'); $('.ui.settings.toggle.button').toggleClass('active');  });
  $('.ui.details.toggle.button').click(function() { $('.details.sidebar').sidebar('hide', { overlay: true}); return false;});
  $('.ui.add.button').click(function() { $('#annotateEditor').toggle(); return false;});

  $('.details.sidebar').sidebar('hide', { overlay: true});
  $('.viz.sidebar').sidebar('hide', { });
  $('.sidebar').sidebar();

  $('.member.item').click(function() {
    $('.member.item').removeClass('active');
    $('.member.segment').hide();
  });

  $('.viz.button').click(function() {
    $('#viz').html('<img src="/__wm/loading.gif" alt="loading" /><br />Loading cluster treemap');
    $('.viz.sidebar').sidebar('toggle');
    var options = getSearchOptions();
    fayeClient.publish('/cluster', getSearchOptions());
  });

  $('.member.actions').click(function() {
    $('.member.actions').addClass('active');
    $('.member.actions.segment').show();
  });

  $('.member.options').click(function() {
    $('.member.options').addClass('active');
    $('.member.options.segment').show();
  });

  $('.member.statistics').click(function() {
    $('.member.statistics').addClass('active');
    $('.member.statistics.segment').show();
  });

  $('.ui.confirm.delete.button').click(function() { 
    var selected = [];
    $('.selectItem').each(function() {
      if ($(this).is(':checked')) {
        selected.push(deEncID($(this).attr('name').replace('cb_', '')));
      }
    });
    fayeClient.publish('/delete', { selected: selected});
    return false;
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
    fayeClient.publish('/search', getSearchOptions());
    $('.search.button').animate({opacity: 0.2}, 200, 'linear');
  }


  $('.delete.item').click(function() {
    $('.ui.modal').modal('show');
  });

  $('.details.item').click(function() {
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

  $('.selectall.item').click(function() {
    $('.selectItem').prop('checked', true);
    checkSelected();
  });

  $('.invert.item').click(function() {
    $('.selectItem').each(function() {
      $(this).prop('checked', !$(this).prop('checked'));
    });
    checkSelected();
  });

  doSearch();

  include "results.js"
  include "members.js"
  include "scrape.js"

});

function moreLikeThis(uri) {
  fayeClient.publish('/moreLikeThis', { client: myID, uri: uri});
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
