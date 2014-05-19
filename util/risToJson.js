var fs = require('fs'), maxProcess = 9e9, risMapping = require('./risMapping');

// RIS / medline mappings
// https://en.wikipedia.org/wiki/RIS_(file_format)
// http://support.mendeley.com/customer/portal/articles/1006006-what-is-the-mapping-between-ris-files-and-mendeley-
// http://www.nlm.nih.gov/bsd/mms/medlineelements.html

var foundFields = {}, notFoundRecords = [];

// usage: src file, options supports maxProcess 

exports.risToJson = function(src, options) {
  options = options || {};
  var risLines = fs.readFileSync(src).toString().split(/\n/);

  var cur = {}, risFound = [], processed = 0, lastField, notFoundKeys = {}, i;

  for (i = 0 ; i < risLines.length; i++) {
    var l = risLines[i];
    if (l.trim().length < 1) { // end of record
      if (Object.keys(cur).length > 1) {
        risFound.push(cur);
        processed++;
        if (options.maxProcess && processed > options.maxProcess) {
          return risFound;
        }
        cur = {};
        lastField = null;
      }
    } else if (l.substring(4, 5) == '-') { // new field in record
      var key = l.substr(0, 4).trim();
      var val = l.substr(6);
//      console.log(key, val);
      var dest = risMapping[key];
      foundFields[dest] = foundFields[dest] ? foundFields[dest] + 1 : 1;

      if (!dest ) {
        if (!notFoundKeys[key]) {
          console.log('key not found', key);
        }
        dest = key;
        notFoundKeys[key] = notFoundKeys[key] ? ++notFoundKeys[key] : 1;
      }
      lastField = key;
      if (typeof dest !== 'string') { // array for multiples
        if (!cur[dest]) {
          cur[dest] = [];
        }
        cur[dest].push(val);
      } else { // single value
        if (cur[dest]) {
          throw('duplicate ' + dest + ' from ' + l);
        }
        cur[dest] = val.trim();
      }
    } else { // append to last field
      if (!lastField) {
        throw "no lastField " + l;
      }
//      console.log('combining to', lastField);
      var dest = risMapping[lastField];
      var o = cur[dest];
      if (typeof dest !== 'string') {
        try{
        o = cur[dest].pop();
        } catch (e) {
          console.log(cur, l, dest, cur[dest], lastField);
          throw(e);
        }
        cur[dest].push(o + ' ' + l.trim()); 
      } else {
        cur[dest] = cur[dest] + ' ' + l.trim();
      }
    }
  }
  console.log('not found keys:', notFoundKeys);
  return risFound;
};

exports.getFoundFields = function() {
  return foundFields;
};

