var pxMember;

$(function() {
  $('.main.menu .item').tab('change tab', 'second'); // FIXME to select second menu
  $('.ui.accordion').accordion();
  $('#dashboardLink').click(function() { $('.details.sidebar').sidebar('toggle'); return false;});
  $('.details.sidebar').sidebar('hide', { overlay: true});
  $('.facets.sidebar').sidebar('hide');
  $('.ui.facets.button').click(function() { $('.facets.sidebar').sidebar('toggle'); });
  $('.ui.scrape.button').click(function() { $('.scrape.content').toggle('hidden'); });
  $('.sortable.table').tablesort();
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

