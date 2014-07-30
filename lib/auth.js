// authentication for proxy
/*jslint node: true */

'use strict';

var noUser = {username: 'nouser'}, fs = require('fs'), path = require('path');
var utils = require('./utils.js');

module.exports = function(browser_request, browser_response) {
  var response = { 'continue' : true, isSystemRequest : false, content: null};
  var request_url = url.parse(browser_request.url);

  if (request_url.pathname.match('^/__wm/')) {
    var asset = request_url.pathname.replace(/\.\./, '');
    GLOBAL.debug('asset', asset);
    //FIXME async
    try {
    response.content = fs.readFileSync(path.join('./static', asset));
    } catch (e) {
      response.content = e.toString();
    }
    response.continue = false;
  } else if (request_url.port == GLOBAL.config.AUTH_PORT || (request_url.hostname || '').match(GLOBAL.config.NOCACHE_REGEX)) {
    browser_request.headers['X-Forwarded-For'] = browser_request.connection.remoteAddress;
    response.isSystemRequest = true;
  } else if (browser_request.connection.remoteAddress === '127.0.0.1') {
    browser_request.psMember = utils.localUser;
  } else if (GLOBAL.config.doAuth || GLOBAL.authed[browser_request.connection.remoteAddress]) { //FIXME
    if (!GLOBAL.authed[browser_request.connection.remoteAddress]) {
      response.content = 'You must <a href="' + GLOBAL.config.HOMEPAGE + ':' + GLOBAL.config.AUTH_PORT + '/login">login</a>';
      response.continue = false;
    } else {
      browser_request.psMember = GLOBAL.authed[browser_request.connection.remoteAddress];
    }
  } else {
    console.log('NOAUTH');
    browser_request.psMember = noUser;
    GLOBAL.authed[browser_request.connection.remoteAddress] = noUser;
  }
  return response;
};
