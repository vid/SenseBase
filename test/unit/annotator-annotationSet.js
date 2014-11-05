// Tests sentiment service (requires running service).
/* global describe, it */
/* jshint node: true */

'use strict';

var expect = require("expect.js"), _ = require('lodash');
var annotationSet = require('../../services/annotators/annotationSet.js'), utils = require('../../lib/utils.js');
annotationSet.setAnnotationSets([{ position: ['Cat', 'Level 1', 'Level 2'], terms: ['good'] },
  { position: ['Nocat', 'Nolevel'], terms: ['zzzzzzzzzzzz'] }]);

var doc = '<html>\n<script lah lah></script>\n<body class="something">Good <b>bad</b> amazing\n</body>\n</html>';

describe('annotationSet', function(done){
  it('should identify the category', function(done) {
    annotationSet.doProcess({ uri: 'test', content: doc, text: utils.getTextFromHtml(doc), selector: 'body'}, function(err, result) {
      expect(err).to.be(null);
      expect(result.annoRows.length === 1).to.be(true);
      var annos = _.groupBy(result.annoRows, function(r) { return r.type;});
      expect(annos.category.length).to.be(1);
      expect(annos.category[0].category).to.eql(['Level 2']);
      expect(annos.category[0].roots).to.eql(['Cat', 'Level 1']);
      done();
    });
  });
});
