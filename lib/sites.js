
exports.annoLoc = {
  '.*\.ncbi\.nlm\.nih\.gov/pubmed/' : { selector: '.abstr', addRequest: [processor: 'pubMedXML', request: '$URL/?report=xml'] },
  '.*\.wikipedia\.org/' : { selector: '#bodyContent' },
  '.*\.sciencedirect\.com/science/article/' : { selector: '#centerInner' },
  '.*\.link\.springer\.com/article/' : { selector: '.abstract-content' }
};

exports.processors = {
  pubMedXML: function(response, callback) {
  }
}

