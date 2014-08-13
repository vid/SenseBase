// Generates and assigns clientIDs to agents for local use.
/* jshint node: true */
'use strict';

var site;
var fs = require('fs');
var auth = require('../lib/auth');

try {
  site = require('../local-site.json');
} catch (e) {
  site = require('../site.json');
}

var updatedLogins = site.logins.map(function(login) {
  if (login.type === 'Agent' && login.status === 'available') {
    login.clientID = auth.generateClientID(login.username);
  } else {
    delete login.clientID;
  }
  return login;
});

site.logins = updatedLogins;
fs.writeFileSync('./local-site.json', JSON.stringify(site, null, 2));

