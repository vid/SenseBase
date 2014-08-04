// Authentication for proxy. This is somewhat bogus and needs to use an existing module.
/*jslint node: true */

'use strict';

var fs = require('fs'), path = require('path'), url = require('url');
var utils = require('./utils.js'), _ = require('lodash');

module.exports = function(browser_request, browser_response) {
  var foundMember = GLOBAL.authed[browser_request.connection.remoteAddress];
  var response = { 'continue' : true, isSystemRequest : false, content: null};
  var request_url = url.parse(browser_request.url);

// including an asset
  if (request_url.pathname.indexOf('/__wm/') === 0) {
    var asset = request_url.pathname.replace(/\.\./, '').replace(/.*\//, '');
    GLOBAL.debug('asset', asset);
    //FIXME async
    if (asset === 'member.js') {
      response.content = _.template(fs.readFileSync('./web/views/member.js'), { user: foundMember, clientID: foundMember ? foundMember.username + ':' + new Date().getTime() : null, homepage: GLOBAL.config.HOMEPAGE });
    } else {
      try {
        response.content = fs.readFileSync(path.join('./web/static', asset));
      } catch (e) {
        response.content = e.toString();
      }
    }
    response.continue = false;
  } else if (request_url.port == GLOBAL.config.AUTH_PORT || (request_url.hostname || '').match(GLOBAL.config.NOCACHE_REGEX)) {
    browser_request.headers['X-Forwarded-For'] = browser_request.connection.remoteAddress;
    response.isSystemRequest = true;
  } else if (browser_request.connection.remoteAddress === '127.0.0.1') {
    browser_request.psMember = utils.localUser;
  } else if (GLOBAL.config.doAuth || foundMember) { //FIXME
    if (!foundMember) {
      response.content = 'You must <a href="' + GLOBAL.config.HOMEPAGE + 'login">login</a>';
      response.continue = false;
    } else {
      browser_request.psMember = foundMember;
    }
  } else {
    console.log('NOAUTH');
    browser_request.psMember = utils.noUser;
    GLOBAL.authed[browser_request.connection.remoteAddress] = utils.noUser;
  }
  return response;
};
