// # csvToAnnotationSet
//
// Converts columned hierarchical data in this format:
//
// Category,Level 1, Level 2, Level 3, Terms
// Where if terms are present a level aggregated set is created.

/* jshint node: true */
'use strict';

if (process.argv.length < 3) {
  console.log('usage', process.argv[1], '<filename>');
  process.exit(1);
}

var Converter = require('csvtojson').core.Converter;
var _ = require('lodash'), fs = require('fs');

var csvFileName= process.argv[2];
var fileStream=fs.createReadStream(csvFileName);
//new converter instance
var param={};
var csvConverter=new Converter(param);

//end_parsed will be emitted once parsing finished
csvConverter.on('end_parsed', processJson);

//read from file
fileStream.pipe(csvConverter);

// running values
var cat, l1, l2, l3, terms;
function processJson(json) {
  var sets = [];
  json.forEach(function(j) {

    if (j.Category) {
      cat = j.Category;
      l1 = l2 = l3 = null;
    }
    if (j['Level 1']) {
      l1 = j['Level 1'];
      l2 = l3 = null;
    }
    if (j['Level 2']) {
      l2 = j['Level 2'];
      l3 = null;
    }

    if (j['Level 3']) {
      l3 = j['Level 3'];
    }

    if (j['Search Terms']) {
      var pos;
      if (l3 && l2 && l1 && cat) {
        pos = [cat, l1, l2, l3];
      } else if (l2 && l1 && cat) {
        pos = [cat, l1, l2];
      } else if (l1 && cat) {
        pos = [cat, l1];
      } else if (cat) {
        pos = [cat];
      }
      if (!pos) {
        console.log('invalid structure at', j);
        process.exit(1);
      }
      var terms = _.map(j['Search Terms'].split(','), function(s) { return s.trim(); }).filter(Boolean);
      sets.push({ position: pos, terms: terms });
    }
  });
  console.log(JSON.stringify(sets, null, 2));
}
