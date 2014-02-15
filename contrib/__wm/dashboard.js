var pxMember;

$(function() {
  $('.ui.accordion').accordion();
  $('#dashboardLink').click(function() { $('.details.sidebar').sidebar('toggle'); return false;});
  $('.details.sidebar').sidebar('hide', { overlay: true});
  $('.sidebar').sidebar();
  $('.ui.search.button').click(function() { $('.search.content').toggle('hidden'); });
  $('.ui.scrape.button').click(function() { $('.scrape.content').toggle('hidden'); });
  $('.ui.manage.button').click(function() { $('.manage.content').toggle('hidden'); });
  $('.ui.checkbox').checkbox({onChange : updateOptions});

  function updateOptions() {
    console.log($(this).attr('id'), $(this).is(':checked'));
    if($(this).is(':checked')) { 
      $('#'+$(this).attr('id') + 'Options').show();
    } else {
      $('#'+$(this).attr('id') + 'Options').hide();
    }
  }

  pxMember = window.pxMember || $.cookie('pxMember');
  $('#searchMember').val(pxMember);
  window.pxContent.style.width = window.parent.innerWidth - 340;
  fayeClient = new Faye.Client('FAYEHOST');
  fayeClient.publish('/search', { member: pxMember });

  include "results.js"
  include "users.js"
  include "scrape.js"

});

function moreLikeThis(uri) {
  fayeClient.publish('/moreLikeThis', { uri: uri});
}
