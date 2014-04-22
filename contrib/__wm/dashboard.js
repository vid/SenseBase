var sbUser;

var mainSize = 0, fluidSizes = ['four', 'five', 'six', 'seven']; // fluid sizes for main ui
$(function() {
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

  $('.ui.accordion').accordion();
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
  $('.delete.item').click(function() {
    $('.ui.modal').modal('show');
  });

  $('.signout.item').click(function() {
    fayeClient.publish('/signout');
    document.location.href = '/login';
  });
// FIXME
var shownGraph = false;
  $('.graph.item').click(function() {
    if (shownGraph) {
      $('.table.content').html('');
      resultsTable('.table.content', lastResults);
      shownGraph = false;
    } else {
      $('.table.content').html('');
      resultsScatter('.table.content', lastResults);
      shownGraph = true;
    }
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

  sbUser = window.senseBase.user || $.cookie('sbUser');
//  $('#searchUser').val(sbUser);
  fayeClient = new Faye.Client('<!-- @var FAYEHOST -->');
  fayeClient.publish('/search', { user: sbUser });

  include "results.js"
  include "members.js"
  include "scrape.js"

});

function moreLikeThis(uri) {
  fayeClient.publish('/moreLikeThis', { uri: uri});
}

function addChat(msg) {
  var n = new Date();
  $('#collabStream').append('<span style="width: 10em; color: green">' + n.getHours() + ":"  + n.getMinutes() + ":" + n.getSeconds() + '</span> ' + sbUser  + ' <i>' + msg + '</i><br />');
  $('.visiting').click(function(t) {
    annotateCurrentURI($(this).text());
  });
}

// collab
fayeClient.subscribe('/collab', function(message) {
  addChat(message.text);
});
$('#collabInput').keypress(function(e) {
  if(e.which == 13) {
    fayeClient.publish('/collab', { text : $('#collabInput').val()});
    $('#collabInput').val('');
    return false;
  }
});

// scrape
if (isScraper) {
  console.log('I am a scraper');

  fayeClient.subscribe('/scrape', function(link) {
    console.log('/scrape', link);
    outputDocument.location = link;
  });
  var links = [];
  var myDomain = currentURI.split('/')[2];
  for (var i = 0; i < outputDocument.links.length; i++) {
    var href = outputDocument.links[i].href;
    var link = href.split('/')[2];
    console.log(href, link, myDomain);
    var inDomain = (link.indexOf(myDomain) > -1);
    if (link && (href.toLowerCase().indexOf('pdf') < 0) ) {
      links.push(href);
    }
    setTimeout(function() { 
//      console.log('sending', links); fayeClient.publish('/links', { site: currentURI, links: links};)
      setInterval(function() { console.log('sending', links); fayeClient.publish('/links', { site: currentURI, links: []})}, 5000);
    }, 1000);
  }
}


