// find finer content areas if available

var cheerio = require('cheerio');

var sites = require('./sites.js');

exports.extractContent = extractContent;

// extract content based on site definitions
function extractContent(uri, html, callback) {
  var $ = cheerio.load(html);
  // search all possible matches, returning first find
  var founds = sites.findMatch(uri);

  founds.forEach(function(found) {
    if ($(found.selector)) {
      var content = $(found.selector).html();
      callback(uri, html, found.selector, content);
      return;
    }
  });
  
  var def = $('body').html() || html;
  callback(uri, html, 'body', def);
}

