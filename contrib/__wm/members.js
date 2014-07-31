// ## Members
//
/*jslint browser: true */
/*jslint node: true */
/* global $,alert */

'use strict';

var justEdited, rTeams, editingMember;

exports.init = function(fayeClient, clientID) {
  fayeClient.subscribe('/teamList/' + clientID, function(teams) {
    $('#aneditor').hide();
    console.log('teams', teams);
    // populate any team containers
    $('.team.container').find('option').remove();
    var teamTypes = {};
    teams.forEach(function(m) {
      // create selects
      if (m.status === 'available' && m.type === 'Searcher') {
        // group by type
        teamTypes[m.type] = (teamTypes[m.type] || '') + '<option value="' + m.username + '">' + m.username + '</option>';
      }
      var row = '<a style="margin: 4px" id="' + m.username + '" class="ui small ' + (m.status === 'available' ? 'enabled' : 'disabled') + ' member image label">' +
        (m.class ? '<i class="' + m.class + ' icon"></i>' :
          '<img style="height: 24px" class="image '  + '" src="icons/' + (m.icon || 'unknown.png') + '" alt="' + m.username + '" />') +
        ' ' + m.username + '</a>';
      $('.teamlist.field').prepend(row);
    });
    for (var type in teamTypes) {
      $('.team.container').append('<optgroup label="' + type + '">' + teamTypes[type] + '</optgroup>');
    }
    $('.enabled.member').draggable({stack: 'a', helper: 'clone'});

    $('#newName').val('');
    $('#newEmail').val('');
    $('.teamCancel').click(function() { $('#aneditor').hide(); });
    $('.member.image').click(function(i) {
      var id = $(this).attr('id');
      if ($('#lastUsername').val() === id) {
        $('#lastUsername').val('');
        $('.member.form').hide();
      } else {
        $('.member.form').show();
        $('.member.button').removeClass('active');
        $(this).addClass('active');
        showEdit(id);
      }
    });
    rTeams = teams;
    if (justEdited) {
      showEdit(justEdited);
      justEdited = null;
    }
  });
  fayeClient.publish('/team/list', { clientID: clientID});

  $('#newCreate').click(function() {
    fayeClient.publish('/team/add', { clientID: clientID, name: $('#newName').val(), type: $('#newType').val() });
    justEdited = $('#newName').val();
    return false;
  });

  function showEdit(username) {
    if (!rTeams) {
      return;
    }
    // hide all types
    $('.anedit').hide();
    rTeams.forEach(function(m) {
      console.log(m.username, username);
      if (m.username === username) {
        editingMember = m;
      }
    });
    console.log('member', editingMember);
    $('#username').val(editingMember.username);
    $('#lastUsername').val(editingMember.username);
    $('#memberDescription').val(editingMember.description);
    $('#needsValidation').prop('checked', editingMember.needsValidation === true);
    if (editingMember.type === 'User') {
      setupValidation();
      $('#canValidate').prop('checked', (editingMember.canValidate === true) && editingMember.needsValidation !== true);
      $('#teamRemove').show();
      $('#editUser').show();
      $('#newEmail').val(editingMember.email);
      $('#memberPassword').val(editingMember.password);
      $('#passwordRepeat').val(editingMember.password);
    } else if (editingMember.type === 'Scraper') {
      $('#teamRemove').show();
      $('#editScraper').show();
    } else if (editingMember.type === 'Annotation set') {
      $('#teamRemove').show();
      $('#positiveTerms').val(editingMember.positiveTerms);
      $('#negativeTerms').val(editingMember.negativeTerms);
      $('#editAnnoSet').show();
    } else if (editingMember.type === 'Searcher') {
      $('#teamRemove').show();
      $('#searchTemplate').val(editingMember.template);
      $('#searchAPI').val(editingMember.api);
      $('#editSearcher').show();
    } else {
      $('#teamRemove').hide();
      $('#editAgent').show();
    }
    $('#aneditor').show();
  }

  $('#teamRemove').click(function() {
    fayeClient.publish('/team/remove', { clientID: clientID, username: editingMember.username});
    return false;
  });

  $('#needsValidation').click(function() {
    setupValidation();
  });

  function setupValidation() {
    if ($('#needsValidation').is(':checked')) {
      $('#canValidate').prop('checked', false);
      $('#canValidate').prop('disabled', true);
    } else {
      $('#canValidate').prop('disabled', false);
    }
  }

  $('#teamUpdate').click(function() {
    editingMember.description = $('#memberDescription').val();
    editingMember.needsValidation = $('#needsValidation').is(':checked');
    if (editingMember.type == 'User' || editingMember.type == 'Scraper') {
      if (editingMember.type == 'User') {
        editingMember.email = $('#newEmail').val();
        editingMember.canValidate = $('#canValidate').is(':checked');
      }
      var pw1 = $('#memberPassword').val(), pw2 = $('#passwordRepeat').val();
      if (pw1) {
        if (pw1 != pw2) {
          alert("Passwords don't match");
          return false;
        } else {
          editingMember.password = $('#memberPassword').val();
        }
      }
    } else if (editingMember.type === 'Annotation set') {
      editingMember.positiveTerms = $('#positiveTerms').val();
      editingMember.negativeTerms = $('#negativeTerms').val();
    } else {

    }
    // FIXME add clientID
    fayeClient.publish('/team/save', editingMember);
    return false;
  });
};
