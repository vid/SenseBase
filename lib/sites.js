// site specific selectors and functions
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
// FIXME can only get xml as html with xml as PRE so do it in two passes
      var parser = new xml2js.Parser();

      try {
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
              var descriptorCategory = descriptor._, attributes = { type: 'descriptor', majorTopic: descriptor.$.MajorTopicYN};
              annoRows.push(annotations.createAnnotation({type: 'category', annotatedBy: name, hasTarget: uri, category: descriptorCategory, attributes: attributes}));

              var qualifiers = mesh.QualifierName;
              for (var q in qualifiers) {
                var qualifier = qualifiers[q];
                var category = [descriptorCategory, qualifier._], attributes = { type: 'qualifier', majorTopic: qualifier.$.MajorTopicYN};
                annoRows.push(annotations.createAnnotation({type: 'category', annotatedBy: name, hasTarget: uri, category: category, attributes: attributes}));
              }
            }

            callback(annoRows);
          } catch (e) {
            GLOBAL.info(name, 'no mesh terms', e);
          }
        });
      } catch (e) {
        GLOBAL.error('failing for ', uri, prexml.pre);
        utils.passingError(e);
      }
    }
  }
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
}

