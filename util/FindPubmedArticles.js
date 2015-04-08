
// finds pubmed IDs from a tab seperated file with ID\tTitle and writes them to a directory called pmid

/* jslint node: true */

"use strict";
var fs = require('fs');
var siteQueries = require('./siteQueries.js');

var found = 0, notFound = 0;
var lines = fs.readFileSync(process.argv[2]).toString().split('\n');

var looking = setInterval(function() {
  if (lines.length < 2) {
    clearInterval(looking);
    console.log('found', found, 'not found', notFound);
  }
  var l = lines.shift();
  var s = l.split('\t');
  var id = s[0], title = s[1];
  lookup(id, title);
}, 1000);

function lookup(id, title) {
  siteQueries.findPubMedArticle(title, function(err, pmid, url) {
    if (pmid) {
      found++;
      console.log('found', err, id, pmid, url);
      fs.writeFileSync('./pmids/' + id, pmid);
    } else{
      notFound++;
    }
  });
}
