// import RIS items with attached PDFs
/*jslint node: true */

'use strict';

var utils = require('../lib/utils');

var maxProcess = 9e9;

// where PDFs are stored
var pdfBase = process.argv[2];
// where pdfs converted to html are stored
var htmlBase = process.argv[3];
var src = process.argv[4];
// default root for keywords
var catRoot = process.argv[5];
// set to state
var valStatus = process.argv[6] || utils.states.annotations.unvalidated;

var myUser = 'indexRISwithPDF';

var fs = require('fs');
var cheerio = require("cheerio");
GLOBAL.config = require('../config.js').config;
var indexer = require('../lib/indexer.js');
var annotations = require('../lib/annotations.js');

var risMapping = require(__dirname + '/risMapping.json');

var risLines = fs.readFileSync(src).toString().split(/\n/);

var pdfs = fs.readdirSync(pdfBase);
var pdfMap = {};
pdfs.forEach(function(p) { pdfMap[p.replace(/_.*/, '')] = p; });

var cur = {}, bulk = [], processed = 0;
console.log('entering');

while (risLines.length && processed < maxProcess) { // or until we find an item
  var l = risLines.shift();
  if (l.trim().length < 1) {
    if (Object.keys(cur).length > 1) {
      cur.fileName = pdfMap[cur.id];
      if (!cur.fileName) throw "no filename for " + cur.id;
      try {
        cur = processItem(cur);
        bulk.push(cur);
        processed++;
      } catch (e) {
        console.log(cur.fileName, e);
      }
      cur = {};
    }
  } else {
    var key = l.substr(0, l.indexOf(' - ')).trim();
    var val = l.substr(l.indexOf(' - ') + 3).trim();
    var dest = risMapping[key];

    if (!dest) {
      throw('missing key "'+ key + '" from '+ l);
    }
    if (typeof dest !== 'string') { // array for multiples
      if (!cur[dest]) {
        cur[dest] = [];
      }
      cur[dest].push(val);
    } else { // single value
      if (cur[dest]) {
        throw('duplicate ' + dest + ' from ' + l);
      }
      cur[dest] = val;
    }
  }
}

bulk.forEach(function(b) {
  var cItem = b.cItem;
  var annos = b.annotations;
  indexer._saveContentItem(cItem, checkError);
  indexer.saveAnnotations(cItem.uri, annos, checkError);
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
  console.log(cur.fileName);
  var content = fs.readFileSync(htmlBase + cur.fileName + '.html');
  try {
    var $ = cheerio.load(content);
    cur.doi = $('meta[name=doi]').attr("content") || '';
  } catch (e) {
    cur.process_error = e;
    console.log('DOC FAILED', e);
  }

  cur.content = content.toString().replace(/<.*?>/g,'');
  cur.uri = 'file://' + pdfBase + cur.fileName;
  var loc = GLOBAL.config.HOMEPAGE + 'files/' + cur.fileName;
  var cItem = annotations.createContentItem({ uri: loc, title: cur.title, visitors: [{member: myUser, '@timestamp' : new Date().toISOString()} ], content: cur.content});
  var annos = [];
  cur.keyword.toString().split(',').forEach(function(k) {
    annos.push(annotations.createAnnotation({hasTarget: loc, type: 'category', category: (catRoot ? [catRoot, k] : [k]), state: (valStatus), annotatedBy: myUser}));
  });
  return { cItem: cItem, annotations: annos};
}
