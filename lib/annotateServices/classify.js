// classifies documents using BayesClassifier
var name = 'Classify';
exports.name = name;

var natural = require('natural'),
  classifier = new natural.BayesClassifier();

var seeds = {}; 
/*
trainClassifier();
process('association between regulated upon activation, normal t cells expressed and secreted (rantes) -28c/g polymorphism and susceptibility to hiv-1 infection: a meta-analysis', function(err, rows) { console.log(rows); });
*/

exports.process = process;

function process(text, callback) {
  var annoRows = [];
  var users = require('../../users.json').logins;

  users.forEach(function(user) {
    if (user.username == name) {
      needsValidation = user.needsValidation;
    }
  });
  var res = classifier.getClassifications(text);
  console.log('TEXT', text);
  res.forEach(function(r) {
    console.log('\n--', r.label, r.value, seeds[r.label]);
  });
  annoRows.push({ranges : 'item', quote: res[0].label });
  callback(null, annoRows);
}

function trainClassifier() {
  var seedText = require('./_search.json');
  seedText.hits.hits.forEach(function(e) { 
    if (e._source.keyword) {
      e._source.keyword.forEach(function(k) {
        seeds[k]= (seeds[k] || '') + '\n' + e._source.title.toLowerCase();
      });
    }
  });

  Object.keys(seeds).forEach(function(k) {
    classifier.addDocument(seeds[k], k);
  });
  classifier.train();
}

