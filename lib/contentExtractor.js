// find finer content areas if available

var cheerio = require('cheerio');

var sites = require('./sites.js');

exports.extractContent = extractContent;

function extractContent(uri, html, callback) {
  var $ = cheerio.load(html);
  for (var uriMatch in sites.annoLoc) {
    if (uri.match(uriMatch)) {
      var found = annoLoc[uriMatch];
      var content = $(found.selector).html();
      callback(uri, html, found.selector, content);
      return;
    }
  }

  var def = $('body').html() || html;
  
  callback(uri, html, 'body', def);
}

