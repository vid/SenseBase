// converts JSON structure to ARFF

var doString = false; // values as strings

var merged = require('./mergedData.json');

var shareFields = [
];

var keepFields = []

var meshTerms = 'MeSH Terms';

// get set of mesh terms

var meshSet = {};
merged.forEach(function(m) {
  if (m[meshTerms]) {
    m[meshTerms].forEach(function(t) {
      meshSet[t] = t;
    });
  }
});

// assign individual mesh values
merged.forEach(function(m) {
  var terms = m[meshTerms] || [], v;
  for (var i in meshSet) {
    v = terms.indexOf(i) > -1 ? i : null;
    m['mesh_' + i] = v;
//    console.log('*', t, t.indexOf(m), m, v);
  }
});

// generate meta fields

var arffSet = {};


keepFields.forEach(function(k) {
  arffSet[k] = k;
});

for (var m in meshSet) {
  arffSet['mesh_' + m] = 'mesh_' + m;
}

shareFields.forEach(function(s) {
  arffSet[s] = 'share_' + s;
});


// generate meta

var arff = '@RELATION share\n';
for (var f in arffSet) {
  arff += '@ATTRIBUTE "' + arffSet[f] + '" ' + (doString ? 'STRING' : 'REAL') + '\n';
}

arff += '\n@DATA\n';

// generate data

merged.forEach(function(m) {
  var cols = [], v;
  for (var f in arffSet) {
    if (doString) {
      v = m[f] ? m[f].replace(/,/g, '|') : 0;
    } else {
      v = m[f] ? 1 : 0;
    }
    cols.push(v);
  }
  arff += cols.join(',') + '\n';
});

console.log(arff);


