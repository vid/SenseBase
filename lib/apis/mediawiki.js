// mediawiki add categories
/*jslint node: true */

'use strict';

var qs = require('querystring');
var utils = require('../utils');
var bot = require('nodemw');

exports.search = function(api, context, callback) {
  if (api.indexOf('mediawiki.category.') === 0) {
    if (api === 'mediawiki.category.wikipedia') {
      var bot = require('nodemw'), method = 'http://', host = 'en.wikipedia.org', apiPath = '/w', articlePath = '/wiki', client = new bot({
        server: host,
        path: apiPath
      });
      context.referers = 'http://en.wikipedia.org/w/api.php';

      client.getPagesInCategory(context.query, function(pages) {
        pages.forEach(function(page) {
          callback(null, method + host + articlePath + '/' + page.title.replace(/ /g, '_'), context);
        });
      });
    }
  }
};
