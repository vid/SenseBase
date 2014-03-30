// find finer content areas if available

var cheerio = require('cheerio');

exports.extractContent = extractContent;

// TODO: make configurable
var annoLoc = {
  '.*ncbi.nlm.nih.gov/pubmed/' : { selector: '.abstr' },
  '.*wikipedia.org/' : { selector: '#bodyContent' },
  '.*sciencedirect.com/science/article/' : { selector: '#centerInner' },
  '.*link.springer.com/article/' : { selector: '.abstract-content' }
};

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

  var def = $('body').html() || html;
  
  callback(uri, html, 'body', def);
}

