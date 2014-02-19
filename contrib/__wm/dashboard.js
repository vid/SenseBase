var pxMember;

$(function() {
  $('.ui.accordion').accordion();
  $('.details.sidebar').sidebar('hide', { overlay: true});
  $('.sidebar').sidebar();
  $('.ui.search.button').click(function() { $('.search.content').toggle('hidden'); $('.ui.search.button').toggleClass('active');});
  $('.ui.scrape.button').click(function() { $('.scrape.content').toggle('hidden'); $('ui.scrape.button').toggleClass('active'); });
  $('.ui.team.button').click(function() { $('.team.content').toggle('hidden');$('ui.scrape.button').toggleClass('active');  });
  $('.ui.lab.button').click(function() { $('.lab.content').toggle('hidden');$('ui.lab.button').toggleClass('active');  });
  $('.ui.settings.button').click(function() { $('.settings.content').toggle('hidden');$('ui.scrape.button').toggleClass('active');  });
  $('.ui.checkbox').checkbox({onChange : updateOptions});
  $(document).tooltip();

  function updateOptions() {
    console.log($(this).attr('id'), $(this).is(':checked'));
    if($(this).is(':checked')) { 
      $('#'+$(this).attr('id') + 'Options').show();
    } else {
      $('#'+$(this).attr('id') + 'Options').hide();
    }
  }

  pxMember = window.pxMember || $.cookie('pxMember');
//  $('#searchMember').val(pxMember);
  fayeClient = new Faye.Client('<!-- @var FAYEHOST -->');
  fayeClient.publish('/search', { member: pxMember });

  include "results.js"
  include "users.js"
  include "scrape.js"

});

function moreLikeThis(uri) {
  fayeClient.publish('/moreLikeThis', { uri: uri});
}

function addChat(msg) {
  var n = new Date();
  $('#collabStream').append('<span style="width: 10em; color: green">' + n.getHours() + ":"  + n.getMinutes() + ":" + n.getSeconds() + '</span> ' + pxMember  + ' <i>' + msg + '</i><br />');
  $('.visiting').click(function(t) {
    annotateCurrentURI($(this).text());
  });
}

// search

$('#searchForm').submit(function(event) {
  event.preventDefault();
  var search = { terms : $('#termSearch').val(), annotations : $('#annoSearch').val(), 
    from: $('#fromDate').val(), to: $('#toDate').val(),
    member: $('#searchMember').val() };
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
var teams = [ {people : [
    { name : 'Andy', icon: 'demo.png', activities : [{annotate : 'default'}, { search : true}]}
    , { name : 'Betty', icon: 'manager.png', activities : [{annotate : 'default'}, { search : true}]}
  ]}, 
  { services : [
    { name:'Spotlight', icon:'dbpedia.jpg', active:true, activities : [{annotate : 'default'}]}
    , { name : 'Sentiment', icon : 'sentiment.jpg', activities : [{annotate:'default'}]}
    , { name : 'WikiMeta', icon : 'wikimeta.png', activities : [{annotate:'true'}]}
    , { name : 'Carrot2', icon : 'carrot2.png', activities : [{annotate:'true'}]}
    , { name : 'Board members', icon : 'board.jpg', activities : [{annotate : true}]}
    , { name : 'MicroRDF', icon: 'rdf.png', activities : [{annotate: true}]} 
    , { name : 'MycoMine', icon : 'mycomine_logo.png', activities : [{annotate:true}]} 
    , { name : 'GATE', icon : 'gate.jpg', activities : [{annotate:true}]} 
    , { name : 'DC', icon: 'dublin_core.png', activities : [{annotate:'true'}, { search : 'default'}]} 
    , { name : 'ElasticSearch', icon : 'esearch.png', activities : [{search : 'default'}, {storage: 'default'}]} 
  ]}
]



