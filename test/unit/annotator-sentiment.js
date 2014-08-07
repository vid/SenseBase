// Tests sentiment service (requires running service).
'use strict';

var expect = require("expect.js"), _ = require('lodash');
var sentiment = require('../../services/annotators/sentiment.js'), utils = require('../../lib/utils.js');;

var doc = '<html><script lah lah></script><body class="something">Good <b>bad</b> amazing</body></html>';

describe('sentiment', function(done){
  it('should identify the candidates', function(done) {
    sentiment.doProcess({ uri: 'test', html: doc, text: utils.getTextFromHtml(doc), selector: 'body'}, function(err, result) {
      expect(err).to.be.undefined;
      expect(result.annoRows.length > 0).to.be.true;
      var annos = _.groupBy(result.annoRows, function(r) { return r.type;});
      expect(annos.value.size === 1).to.be.true;
      expect(annos.quote.size === 3).to.be.true;
      expect(annos.quote[0].ranges.length === 1).to.be.true;
      done();
    });
  });
});

