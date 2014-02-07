var noUser = {username: 'nouser'};

module.exports = function(browser_request, browser_response) {
  var response = { 'continue' : true, isSystemRequest : false, content: null};
  var request_url = url.parse(browser_request.url);

  if (request_url.port == GLOBAL.config.AUTH_PORT || (request_url.hostname || '').match(GLOBAL.config.NOCACHE_REGEX)) {
    browser_request.headers['X-Forwarded-For'] = browser_request.connection.remoteAddress;
    response.isSystemRequest = true;
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

