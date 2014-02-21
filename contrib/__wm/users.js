var justEdited, rTeams, editingMember;

fayeClient.subscribe('/teamList', function(teams) {
  $('#aneditor').hide();
  console.log('teams', teams);
  teams.forEach(function(m) {
    var row = '<button class="ui small ' + (m.status === 'available' ? 'enabled' : 'disabled') + ' attached button">' +
      '<img class="image '  + '" src="/__wm/icons/' + (m.icon || 'mesh.png') + '" alt="' + m.username + '" /></button>';
//'<br />' + m.username + '<br />' + m.type + (m.description ? m.description : '') + '</td>');
    $('.teamlist.buttons').prepend(row);
  });
 $('#newName').val(''); 
 $('#newEmail').val('');
 $('.teamCancel').click(function() { $('#aneditor').hide(); });
 $('.teamSelect').click(function(i) {
  showEdit($(i.target).parent().attr('id').split('_')[1]);
 });
 rTeams = teams;
 if (justEdited) {
   showEdit(justEdited);
   justEdited = null;
 }
});
fayeClient.publish('/team/list', {});

$('#newCreate').click(function() {
  fayeClient.publish('/team/add', { name: $('#newName').val(), type: $('#newType').val() });
  justEdited = $('#newName').val();
  return false;
});

function showEdit(username) {
  if (!rTeams) {
    return;
  }

  $('.anedit').hide(); // hide all types
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
  $('#needsValidation').prop('checked', editingMember.needsValidation == true);
  if (editingMember.type == 'User') {
    setupValidation();
    $('#canValidate').prop('checked', (editingMember.canValidate == true) && editingMember.needsValidation != true);
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
  } else {
    $('#teamRemove').hide();
    $('#editAgent').show();
  }
  $('#aneditor').show();
}

$('#teamRemove').click(function() {
  fayeClient.publish('/team/remove', { username: editingMember.username});
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
  fayeClient.publish('/team/save', editingMember);
  return false;
});

