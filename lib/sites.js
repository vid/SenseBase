// site specific selectors and functions
/*jslint node: true */

'use strict';

var xml2js = require('xml2js');

var annotations = require('./annotations.js'), utils = require('./utils');

// processors used for addRequest annotations
exports.processors = {
  pubMedXML: {
    type: 'XML',
    getURI: function(loc) {
      // change direct queries to article ref
      loc = loc.replace('?term=', '').replace(/[#\/]*$/g, '');
      return loc + '/?report=xml';
    },
    getAnnotations: function(name, uri, prexml, callback) {
// FIXME use efetch, generalize retrieval or use eg https://github.com/ldbib/MEDLINEXMLToJSON
      var parser = new xml2js.Parser();

      try {
        parser.parseString(prexml.pre, function (err, obj) {
          var annoRows = [];
          var mlCitation = obj.PubmedArticle.MedlineCitation[0];

          ['DateCreated', 'DateCompleted', 'Daterevised'].forEach(function(field) {
            var src = mlCitation[field];
            try {
              var date = getMeshDate(mlCitation[field]);
              annoRows.push(annotations.createAnnotation({type: 'value', isA: 'Date', annotatedBy: name, hasTarget: uri, key: field, value: date, attributes: attributes}));
            } catch (e) {
              GLOBAL.debug('fail', e);
            }
          });

          if (mlCitation.Article) {
//            console.log('A', JSON.stringify(mlCitation.Article, null, 2));
            var article = mlCitation.Article[0];
            ['ELocationID'].forEach(function(field) {
              try {
                var doi = article[field][0]._;
                annoRows.push(annotations.createAnnotation({type: 'value', annotatedBy: name, hasTarget: uri, key: 'DOI', roots: ['Article'], value: doi, attributes: attributes}));
              } catch(e) {
                GLOBAL.debug('fail', e);
              }
            });
            ['Language'].forEach(function(field) {
              try {
                var val = article[field][0];
                annoRows.push(annotations.createAnnotation({type: 'category', annotatedBy: name, hasTarget: uri, category: val, roots: ['Article', 'Language'], attributes: attributes}));
              } catch(e) {
                GLOBAL.debug('fail', e);
              }
            });
            ['ArticleDate'].forEach(function(field) {
              var src = mlCitation[field];
              try {
                var date = getMeshDate(mlCitation[field]);
                annoRows.push(annotations.createAnnotation({type: 'value', isA: 'Date', annotatedBy: name, hasTarget: uri, key: field, roots: ['Article'], value: date, attributes: attributes}));
              } catch (e) {
                GLOBAL.debug('fail', e);
              }
            });
          }

          if (mlCitation.MeshHeadingList) {
            var mhList = mlCitation.MeshHeadingList[0];
            var meshHeading = mhList.MeshHeading;
    // iterate through all headings
            for (var m in meshHeading) {
              var heading = meshHeading[m];
    // each term can have one descriptor and zero or more qualifiers, each of which may be a major topic
              var descriptor = heading.DescriptorName[0];
              var descriptorCategory = descriptor._, attributes = { type: 'descriptor', majorTopic: descriptor.$.MajorTopicYN};
              annoRows.push(annotations.createAnnotation({type: 'category', annotatedBy: name, hasTarget: uri, category: descriptorCategory, roots: ['MeshHeadingList'], attributes: attributes}));

              var qualifiers = heading.QualifierName;
              for (var q in qualifiers) {
                var qualifier = qualifiers[q];
                var category = [descriptorCategory, qualifier._], catAttributes = { type: 'qualifier', majorTopic: qualifier.$.MajorTopicYN};
                annoRows.push(annotations.createAnnotation({type: 'category', annotatedBy: name, hasTarget: uri, category: category, roots: ['MeshHeadingList'], attributes: catAttributes}));
              }
            }
          }

          callback(null, annoRows);
        });
      } catch (e) {
        callback(e);
      }
    }
  }
};

function getMeshDate(src) {
  var el = src[0];

  return new Date(el.Year[0], el.Month[0] - 1, el.Day[0]);
}

// find a matching definition and return it
exports.findMatch = function(loc) {
  var annoLoc = GLOBAL.config.annotationLocations, found = [];
  for (var uriMatch in annoLoc) {
    if (loc.match(uriMatch)) {
      found.push(annoLoc[uriMatch]);
    }
  }
  return found;
};
