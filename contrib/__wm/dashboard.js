var sbUser;

var mainSize = 0, fluidSizes = ['five', 'six', 'seven']; // fluid sizes for main ui
$(function() {
  if (window.senseBase.logo) {
    $('<button style="height: 56px" title="Logo" class="ui mini logo attached button"> <img src="' + window.senseBase.logo + '" style="width: 100%" /></button>').prependTo('.main.fluid.buttons');
    $('.ui.logo.button').click(function() { window.location = window.senseBase.homepage;  });
    mainSize++;
  }
  if (window.senseBase.collab) {
    $('<button title="Conversations" class="ui large collab attached button"><i class="large chat icon"></i></button>').appendTo('.main.fluid.buttons');
    $('.ui.collab.button').click(function() { TogetherJS(this); return false; });
    mainSize++;
  }

  $('.main.fluid.buttons').addClass(fluidSizes[mainSize]);

  $('.ui.accordion').accordion();
  $('.details.sidebar').sidebar('hide', { overlay: true});
  $('.sidebar').sidebar();
  $('.ui.search.button').click(function() { $('.search.content').toggle('hidden'); $('.ui.search.button').toggleClass('active');});
  $('.ui.scrape.button').click(function() { $('.scrape.content').toggle('hidden'); $('ui.scrape.button').toggleClass('active'); });
  $('.ui.team.button').click(function() { $('.team.content').toggle('hidden');$('ui.scrape.button').toggleClass('active');  });
  $('.ui.lab.button').click(function() { $('.lab.content').toggle('hidden');$('ui.lab.button').toggleClass('active');  });
  $('.ui.settings.button').click(function() { $('.settings.content').toggle('hidden');$('ui.scrape.button').toggleClass('active');  });
  $('.ui.details.button').click(function() { $('.details.sidebar').sidebar('hide', { overlay: true}); return false;});

  $('.ui.checkbox').checkbox({onChange : updateOptions});
  $(document).tooltip();
  $('.delete.item').click(function() {
    $('.ui.modal').modal('show');
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

  function updateOptions() {
    console.log($(this).attr('id'), $(this).is(':checked'));
    if($(this).is(':checked')) { 
      $('#'+$(this).attr('id') + 'Options').show();
    } else {
      $('#'+$(this).attr('id') + 'Options').hide();
    }
  }

  sbUser = window.senseBase.user || $.cookie('sbUser');
//  $('#searchUser').val(sbUser);
  fayeClient = new Faye.Client('<!-- @var FAYEHOST -->');
  fayeClient.publish('/search', { user: sbUser });

  include "results.js"
  include "users.js"
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

// search

$('#searchForm').submit(function(event) {
  event.preventDefault();
  var search = { terms : $('#termSearch').val(), annotations : $('#annoSearch').val(), 
    from: $('#fromDate').val(), to: $('#toDate').val(),
    user: $('#searchUser').val() };
  fayeClient.publish('/search', search); 
});

var searchRes = fayeClient.subscribe('/searchResults', function(searchResults) {
  console.table('searchResults', searchResults);
});

// collab
var collab = fayeClient.subscribe('/collab', function(message) {
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


