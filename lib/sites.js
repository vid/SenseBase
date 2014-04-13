
exports.annoLoc = annoLoc;

exports.processors = {
  pubMedXML: function(response, callback) {
  }
}

// find a matching definition and return it
exports.findMatch = function(loc) {
  for (var uriMatch in annoLoc) {
    if (loc.match(uriMatch)) {
      return annoLoc[uriMatch];
    }
  }
  return null;
}

var annoLoc = {
  '.*\.ncbi\.nlm\.nih\.gov/pubmed/' : { name: 'NCBI PubMed', selector: '.abstr', addRequest: [{processor: 'pubMedXML', request: '$URL/?report=xml'}] },
  '.*\.wikipedia\.org/' : { selector: '#bodyContent' },
  '.*\.sciencedirect\.com/science/article/' : { selector: '#centerInner' },
  '.*\.link\.springer\.com/article/' : { selector: '.abstract-content' }
};
