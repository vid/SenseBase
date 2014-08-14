// test subscription methods
/*jslint node: true */
/* global describe, it */

'use strict';

var _ = require('lodash'), expect = require('expect.js');
var subscriptionLib = require('../../lib/subscriptions'), annotationLib = require('../../lib/annotations');

describe('Subscriptions', function(){
    var foundAnno = ['category', 'Demo', 'News'].join(annotationLib.unitSep);
    var cItem = {
      uri: 'http://cbc.ca',
      annotations: [
        {
          type: "category",
          hasTarget: "http://cbc.ca",
          annotatedAt: "2014-06-25T23:58:10.833Z",
          annotatedBy: "Demo",
          state: "validated",
          category: [
            "News"
          ],
          position: [
            "Demo",
            "News"
          ],
          flattened: foundAnno
        },
        {
          type: "category",
          hasTarget: "http://cbc.ca",
          annotatedAt: "2014-06-25T23:58:10.833Z",
          annotatedBy: "Demo",
          state: "validated",
          category: [
            "News",
            "Local"
          ],
          position: [
          "Demo",
          "News",
          "Local"
          ],
          flattened: ['category', 'Demo', 'News', 'Local'].join(annotationLib.unitSep)
        }
      ]
    };
  it('should match uri subscription', function() {
    var found = subscriptionLib.matches(cItem, [{ match: 'uri:http://cbc.ca'}]);
    expect(found.length).to.be(1);
  });
  it('should match annotation subscription', function() {
    var found = subscriptionLib.matches(cItem, [{ match: 'annotation:' + foundAnno}]);
    expect(found.length).to.be(1);
  });
  it('should match uri and annotation subscriptions', function() {
    var found = subscriptionLib.matches(cItem, [{ match: 'uri:http://cbc.ca'}, { match: 'annotation:' + foundAnno }]);
    expect(found.length).to.be(2);
  });
});
