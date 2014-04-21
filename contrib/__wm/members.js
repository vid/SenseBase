var justEdited, rTeams, editingMember;

fayeClient.subscribe('/teamList', function(teams) {
  $('#aneditor').hide();
  console.log('teams', teams);
  teams.forEach(function(m) {
    var row = '<a style="margin: 4px" id="' + m.username + '" class="ui small ' + (m.status === 'available' ? 'enabled' : 'disabled') + ' member image label">' +
      (m.class ? '<i class="' + m.class + ' icon"></i>' : 
        '<img style="height: 24px" class="image '  + '" src="/__wm/icons/' + (m.icon || 'mesh.png') + '" alt="' + m.username + '" />') + 
      ' ' + m.username + '</a>';
    $('.teamlist.segment').prepend(row);
  });
  $('#newName').val(''); 
  $('#newEmail').val('');
  $('.teamCancel').click(function() { $('#aneditor').hide(); });
  $('.member.image').click(function(i) {
    var id = $(this).attr('id');
    if ($('#lastUsername').val() === id) {
      $('#lastUsername').val('');
      $('.member.content').hide();
    } else {
      $('.member.content').show();
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
  // hide all types
  $('.anedit').hide(); 
  rTeams.forEach(function(m) {
    console.log(m.username, username);
    if (m.username === username) {
      editingMember = m;
    }
  });
  // meta searches
  if (editingMember.type === 'Searcher') {
    $('.searcher.form').show();
    $('.action.message').hide();
    $('#searcherTags').val(editingMember.username + '-' + new Date().getTime());
    $('.searcher.button').click(function() {
      var links = [];
      editingMember.locations.split('\n').forEach(function(l) {
        l = l.replace('$SBQUERY', $('#searcherQuery').val());
        links.push(l);
      });
      console.log('sending links', links);
// FIXME: convert to module for reuse in test
      fayeClient.publish('/queueLinks', { links: links, relevance: 2, scraper: editingMember.username, tags: $('#searcherTags').val().split(',')});
      $('#annoSearch').val($('#searcherTags').val());
      $('#validationState').val('queued');
      $('#refreshQueries').prop('checked', true);
      setupQueryRefresher(5000);
      doSearch();
    });
  } else {
    $('.searcher.form').hide();
    $('.action.message').show();
  }
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
    $('#locations').val(editingMember.locations);
    $('#editSearcher').show();
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

