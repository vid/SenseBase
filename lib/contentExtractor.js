// find finer content areas if available

var cheerio = require('cheerio');

exports.extractContent = extractContent;

// TODO: make configurable
var annoLoc = {
  '.*ncbi.nlm.nih.gov/pubmed/' : { selector: '.abstr' },
  '.*wikipedia.org/' : { selector: '#bodyContent' },
  '.*sciencedirect.com/science/article/' : { selector: '#centerInner' },
}

function extractContent(uri, html, callback) {
  var $ = cheerio.load(html);
  for (var uriMatch in annoLoc) {
    if (uri.match(uriMatch)) {
      var found = annoLoc[uriMatch];
      var content = $(found.selector).html();
      callback(uri, html, found.selector, content);
      return;
    }
  }
  callback(uri, html, 'body', $('body').html());
}

