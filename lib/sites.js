// site specific selectors and functions
var xml2js = require('xml2js');

var annotations = require('./annotations.js');

exports.annoLoc = annoLoc;

// processors used for addRequest annotations
exports.processors = {
  pubMedXML: { 
    type: 'XML',
    getURI: function(loc) {
      return loc + '/?report=xml';
    },
    getAnnotations: function(name, uri, prexml, callback) {
// FIXME can only get xml as html with xml as PRE so do it in two passes
      var parser = new xml2js.Parser();

      parser.parseString(prexml.pre, function (err, obj) {
        var annoRows = [];
        // FIXME check for MeshHeadingList rather than relying on error
        try {
          var meshes = obj.PubmedArticle.MedlineCitation[0].MeshHeadingList[0].MeshHeading;
  // iterate through all headings
          for (var m in meshes) {
            var mesh = meshes[m];
  // each term can have one descriptor and zero or more qualifiers, each of which may be a major topic
            var descriptor = mesh.DescriptorName[0];
  //          console.log('D', descriptor._, descriptor.$.MajorTopicYN);
            var descriptorCategory = descriptor._, attributes = { type: 'descriptor', majorTopic: descriptor.$.MajorTopicYN};
            annoRows.push(annotations.createAnnotation({type: 'category', annotatedBy: name, hasTarget: uri, category: descriptorCategory, attributes: attributes}));

            var qualifiers = mesh.QualifierName;
            for (var q in qualifiers) {
              var qualifier = qualifiers[q];
  //            console.log('Q', qualifier._, qualifier.$.MajorTopicYN);
              var category = [descriptorCategory, qualifier._], attributes = { type: 'qualifier', majorTopic: qualifier.$.MajorTopicYN};
              annoRows.push(annotations.createAnnotation({type: 'category', annotatedBy: name, hasTarget: uri, category: category, attributes: attributes}));
            }
          }

          callback(annoRows);
        } catch (e) {
          GLOBAL.info(name, 'no mesh terms', e);
        }
      });
    }
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
  'ncbi\.nlm\.nih\.gov/pubmed/\\?term=' : { resultLinks: ['.rslt'] }, // FIXME javascript for pager
  '.*\.ncbi\.nlm\.nih\.gov/pubmed/' : { name: 'NCBI PubMed', selector: '.abstr', addRequest: [{name: 'MeSH', processor: 'pubMedXML'}] },
  '.*\.ncbi\.nlm\.nih\.gov/pmc/articles/' : { selector: '.jig-ncbiinpagenav' },
  '.*\.wikipedia\.org/' : { selector: '#bodyContent' },
  '.*\.sciencedirect\.com/science/article/' : { selector: '#centerInner' },
  '.*\.link\.springer\.com/article/' : { selector: '.abstract-content' },
  '.*bing\.com/search\\?q=' : { navLinks : ['.sb_pagF' ], resultLinks: ['.b_algo' ] },
  'clinicaltrials\.gov/ct2/results' : { navLinks : ['#list_page_controls_bottom'], resultLinks: ['.data_table'] },
  'search\.clinicalevidence\.bmj\.com/s/search.html' : { resultLinks: ['#search-results'] }, // FIXME has no pager but an option for all results
  'evidence\.nhs\.uk/search' : { navLinks : ['#Pagination'], resultLinks : ['#SearchResults'] },
  'scholar\.google\.ca/scholar\\?q=' : { navLinks: ['#gs_n'], resultLinks: ['.gs_rt'] },
  'tripdatabase\.com/search' : { navLinks: ['.pagination'], resultLinks: ['.result-main h3'] },
  'gsearch\.php\\?' : { resultLinks: ['.gs-title'] }, // FIXME javascript for pager
  'answers\.yahoo\.com/search/search_result\\?' : { navLinks: ['#ya-sr-pg'], resultLinks: ['li'] }, // FIXME javascript for pager
  'patient\.co\.uk/search.asp\\?searchterm=' : { navLinks: ['.pager'], resultLinks: ['.search-result-item'] }

};
