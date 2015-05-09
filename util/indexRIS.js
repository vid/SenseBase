// import RIS items with attached PDFs
/*jslint node: true, esnext: true */

'use strict';

var utils = require('../lib/utils');

var maxProcess = 9e9;

var src = process.argv[2];
// default root for keywords
var catRoot = process.argv[3];
// set to state
var valStatus = process.argv[4] || utils.states.annotations.unvalidated;

var myUser = 'system';

var fs = require('fs');
var cheerio = require("cheerio");

require('../index.js').setup();

var contentLib = require('../lib/content.js'), annotations = require('../lib/annotations.js');

var risMapping = require(__dirname + '/risMapping.json');

var risLines = fs.readFileSync(src).toString().split(/\n/);

var cur = {}, bulk = [], processed = 0;
console.log('entering');

while (risLines.length && processed < maxProcess) { // or until we find an item
  var l = risLines.shift();
  if (l.trim().length < 1) {
    if (Object.keys(cur).length > 1) { // && cur['Resolved Link']) {
        cur = processItem(cur);
        bulk.push(cur);
        processed++;
      cur = {};
    }
  } else {
    var key = l.substr(0, l.indexOf(' - ')).trim();
    var val = l.substr(l.indexOf(' - ') + 3).trim();
    var dest = risMapping[key];

    if (!dest) {
      if (l > 0) {
        dest = 'searchid';
        val = l.replace('.', '').trim();
      } else if (l.match(/^Link to.*/)) {
        dest = 'Resolved Link';
        val = l.substring('Link to the External Link Resolver: '.length);
      } else {
        throw('missing key "'+ key + '" from '+ l);
      }
    }
    if (typeof dest !== 'string') { // array for multiples
      if (!cur[dest]) {
        cur[dest] = [];
      }
      cur[dest].push(val);
    } else { // single value
      if (cur[dest]) {
        console.error(cur);
        throw('duplicate ' + dest + ' from ' + l);
      }
      cur[dest] = val;
    }
  }
}

bulk.forEach(function(cur) {
  contentLib.indexContentItem(cur, { member: myUser, mode : 'indexRIS'}, checkError);
});

function checkError(err, data) {
  if (err) {
    console.log('save error', err);
  }
}

// try to add content from HTML
function processItem(cur) {

  if (cur.language) {
    cur.language = cur.language.map(function(i) { return i.substring(0, 2).toLowerCase(); });
  }

  cur.content = cur.abstract || '[no abstract]';
  cur.uri = 'http://www.ncbi.nlm.nih.gov/pubmed/' + cur.id;
  cur.year = cur.year.replace(/[^\d]/g, '');
  var annos = [];
  cur.Keyword = cur.Keyword || [];
  cur.Keyword.unshift(src);
  cur.Keyword.forEach(function(k) {
    let c = ['Keywords'];
    k = k.replace('*', '');
    if (k.indexOf('/') > -1) {
      k = k.replace(/\/.*?\[/g, '/').replace(/\]/g, '');
      k = k.split('/');
      c = c.concat(k);
    } else {
      c.push(k);
    }
    annos.push(annotations.createAnnotation({hasTarget: cur.uri, type: 'category', category: c, state: (valStatus), annotatedBy: myUser}));
  });
  cur.annotations = annos;
  console.log('\n\ncur', cur);
  return cur;
}
