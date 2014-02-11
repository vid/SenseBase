
var csv = require('csv'), ris = require('./risToJson'), json2csv = require('json2csv'), fs = require('fs'), foundFields, matchTo, allHeaders,
  inputCSV = process.argv[2],
  outputFile = process.argv[3],
  risInput = process.argv[4];

if (true) { // process and save
  matchTo = ris.risToJson(risInput);
  foundFields = ris.getFoundFields();
  fs.writeFileSync('output/matchTo.json', JSON.stringify(matchTo, null, 2));
  fs.writeFileSync('output/foundFields.json', JSON.stringify(foundFields, null, 2));
} else { // or get saved
  matchTo = require('./output/matchTo.json');
  foundFields = require('./output/foundFields.json');
}
console.log('foundFields', foundFields.length);
var matchIndex = {}; // index of import fields
matchTo.forEach(function(p) {
  matchIndex[norm(p.Title)] = p;
});

console.log('allHeaders', allHeaders);
csv().from(inputCSV).to.array(function(csvRows, count) {
  var hrows = csvRows.shift(), headerIndex = {};
  allHeaders = hrows; // merge csvRows with RIS, assuming csv are definitive
  for (var field in foundFields) {
    if (allHeaders.indexOf(field) < 0) {
      allHeaders.push(field);
    }
  }
  for (var i = 0; i < hrows.length; i++) {
    headerIndex[hrows[i]] = i;
  }

  var found = [], notFound = []; // store found values
  csvRows.forEach(function(csvRow) { // find them
    var title = csvRow[headerIndex.Title];
    if (matchIndex[norm(title)]) { // found one
//      console.log('found', title, norm(title));
      var source2 = matchIndex[norm(title)];
      var f = {};
      allHeaders.forEach(function(field) {
        var v =  csvRow[headerIndex[field]] || source2[field];
        if (v) f[field] = v;
      });
      found.push(f);
    } else {
      var f = {};
      hrows.forEach(function(field) {
        var v =  csvRow[headerIndex[field]];
        if (v) f[field] = v;
      });
      notFound.push(f);
    }

  });
  fs.writeFileSync('./output/mergedData.json', JSON.stringify(found, null, 2));
  json2csv({data: found, fields: allHeaders, del: '\t'}, function(err, csv) { // write them to outputFile
    if (err) console.log(err);
    fs.writeFile(outputFile, csv, function(err) {
      if (err) throw err;
      console.log('wrote', outputFile, found.length);
    });
  });
  fs.writeFileSync('output/allHeaders.json', JSON.stringify(allHeaders, null, 2));

  json2csv({data: notFound, fields: hrows, del: '\t'}, function(err, csv) { // write them to outputFile
    if (err) console.log(err);
    fs.writeFile('output/notFound.csv', csv, function(err) {
      if (err) throw err;
      console.log('wrote', 'output/notFound.csv', notFound.length);
    });
  });
});

function norm(p) {
  return !p || p.toLowerCase().replace(/[^A-Za-z]/g, '');
}

