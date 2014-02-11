var maxProcess = 999999;

var pdfBase = process.argv[2];
var htmlBase = process.argv[3];
var src = process.argv[3];

var fs = require('fs');
var cheerio = require("cheerio");
require('../config.js');
var indexer = require('../lib/indexer.js');

var risMapping = require('./risMapping.json');

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

indexer.index({ _index: 'ps', _type: 'cachedPage'}, bulk, function(err, foo) {
    if (err) {
        throw "Bulk error " + err;
    } else {
        console.log('bulk done', foo);
    }
});

// try to add content from HTML
function processItem(cur) {
  var a = [ { "ranges": "item", "quote": { "label": cur.filename, "value": cur.title }, "created": "2014-01-04T01:56:42.127Z", "creator": "indexRISwithPDF" }, { "ranges": "item", "quote": { "label": "Keywords", "value": cur.keyword }, "created": "2014-01-04T01:56:42.127Z", "creator": "indexRISwithPDF" } ];

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
//  var e = indexer.getEsDoc('http://dashboard.fg.zooid.org/pdf/' + cur.fileName, cur.title, 'demo', null, true, cur.content, "text/pdf", null, a);
  e.fileName = cur.fileName;
  return e;
}
