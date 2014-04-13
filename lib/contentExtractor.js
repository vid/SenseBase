// find finer content areas if available

var cheerio = require('cheerio');

var sites = require('./sites.js');

exports.extractContent = extractContent;

// extract content based on site definitions
function extractContent(uri, html, callback) {
  var $ = cheerio.load(html);
  var found = sites.findMatch(uri);

  if (found) {
    var content = $(found.selector).html();
    callback(uri, html, found.selector, content);
  } else {
    var def = $('body').html() || html;
    callback(uri, html, 'body', def);
  }
}

