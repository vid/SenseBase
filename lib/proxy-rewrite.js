// Authentication and content mangling for proxy. This is somewhat bogus and needs to use an existing module.
/*jslint node: true */

'use strict';

var fs = require('fs'), path = require('path'), url = require('url'), _ = require('lodash'), tldjs = require('tldjs');
var utils = require('./utils.js'), contentLib = require('./content.js'), auth = require('./auth');

// Proxy has retrieved content. Cache it?
exports.onRetrieve = function(uri, referer, is_html, pageBuffer, contentType, saveHeaders, browser_request) {
  var status = browser_request.proxy_received.statusCode;
  if (status != 200) {
    GLOBAL.debug('non-200 status', status, uri);
    return;
  }
  // FIXME don't save binaries
  GLOBAL.svc.pageCache.cache(uri, referer, is_html, pageBuffer, contentType, saveHeaders, browser_request);
  var psMember = browser_request.psMember.username;
  var desc = { uri: uri, referer: referer, isHTML: browser_request.is_html, content: pageBuffer, contentType: contentType, headers: saveHeaders.headers};
  contentLib.indexContentItem(desc, { mode: 'proxy', member: psMember}, function(err, res) {
    if (err && err.error !== 'not indexable') {
      utils.passingError(err);
    }
  });
};

// Inject controls (iframe) into page.
exports.inject = function(content, browser_request, browser_response) {
  if (browser_request.url.indexOf('/__wm/') <0 && content.toString().match(/<\/body/i)) {
    GLOBAL.debug('injecting iframe');
    /*
    browser_request.proxy_received.headers['Content-Security-Policy'] = 'frame-ancestors ' + GLOBAL.config.HOMEPAGE + '; frame-src ' + GLOBAL.config.HOMEPAGE + ';  script-src self ' + GLOBAL.config.HOMEPAGE;
    browser_request.proxy_received.headers['X-Frame-Options'] = 'SAMEORIGIN';
    browser_request.proxy_received.headers['Access-Control-Allow-Origin'] = "'self' " + GLOBAL.config.HOMEPAGE;
    */
    console.log( browser_request.proxy_received.headers);

    // add a div in case there is none, and a div to enable placing the iframe inline
    content = content.toString().replace(/(<body.*?>)/im, '$1<div style="margin: 0; padding: 0" id="SBEnclosure">')
      .replace(/<\/body/im, '</div><div id="sbIframe" ' +
       'style="z-index: 899; position: fixed; right: 1em; top: 0; width: 20em; height: 90%; color: black; background: #ffe; filter:alpha(opacity=90); opacity:0.9; border: 0">' +
       '<iframe style="width: 100%; height: 100%" src="/__wm/iframe.html"></iframe>' +
       '</div><script>document.domain = "' + tldjs.getDomain(url.parse(browser_request.url).hostname) + '";</script>' +
       '</body');

  }
  return content;
};

// Check for login and special pages.
exports.onRequest = function(browser_request, browser_response) {
  var remoteAddress = browser_request.connection.remoteAddress;
  var foundMember = GLOBAL.authed[remoteAddress];
  var response = { 'continue' : true, isSystemRequest : false, content: null};
  var request_url = url.parse(browser_request.url);

  if (request_url.pathname.indexOf('/__wm/') === 0) {
    var asset = request_url.pathname.replace(/\.\./, '').replace(/^\/__wm\//, '');
    // mime-type
    response.type = asset.replace(/.*\./, '');
    GLOBAL.debug('asset', asset);
    //FIXME async
    if (asset === 'member.js') {
      response.content = auth.memberJS(foundMember);
    } else if (asset === 'iframe.html') {
      response.content = _.template(fs.readFileSync('./web/site/iframe.html'), { homepage: GLOBAL.config.HOMEPAGE });
    } else {
      try {
        response.content = fs.readFileSync(path.join('./web/static', asset));
      } catch (e) {
        response.content = e.toString();
      }
    }
    response.continue = false;
  } else if (request_url.port == GLOBAL.config.AUTH_PORT || (request_url.hostname || '').match(GLOBAL.config.NOCACHE_REGEX)) {
    browser_request.headers['X-Forwarded-For'] = remoteAddress;
    response.isSystemRequest = true;
  } else if (remoteAddress === '127.0.0.1') {
    browser_request.psMember = utils.localUser;
  } else if (GLOBAL.config.doAuth || foundMember) { //FIXME
    if (!foundMember) {
      console.log('no foundmember', remoteAddress);
      response.content = 'You must <a href="' + GLOBAL.config.HOMEPAGE + 'login">login</a>';
      response.continue = false;
    } else {
      browser_request.psMember = foundMember;
    }
  } else {
    console.log('NOAUTH');
    browser_request.psMember = utils.noUser;
    GLOBAL.authed[remoteAddress] = utils.noUser;
  }
  return response;
};
