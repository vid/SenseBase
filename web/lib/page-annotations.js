// ### page-annotations

// Ad-hoc discovery and publishing of page annotations.
/*jslint browser: true */
/*jslint node: true */

'use strict';

var username = window.senseBase.username;

var url = require('url');
var pubsub = require('../../lib/pubsub-client').init(window.senseBase), annotations = require('../../lib/annotations');

// Find and publish page categories, for example from page javascript context. This is more of a demonstration.
exports.findAndPublish = function(page, location) {
  var hostname = url.parse(location).hostname;
  if (page.mw && page.wgCategories) {
    var annos = [];
    page.wgCategories.forEach(function(c) {
      annos.push(annotations.createAnnotation({ type: 'category', category: c, annotatedBy : 'Mediawiki', hasTarget: location, roots: ['Categories', hostname]}));
    });
    pubsub.saveAnnotations([location], annos);
  }

};

function o() {
  var senseBase = {}, $ = {};
    $.ajax({
      url: senseBase.homepage + 'member.js',
      dataType: 'script',
      success: function() {
        $.ajax({
        url: senseBase.homepage + 'lib/libs.min.js',
        dataType: 'script',
        success: function() {
          $.ajax({
            url: senseBase.homepage + 'insight-injected.js',
            dataType: 'script',
            success: function() {
              senseBase.svc.diff();
            }
          });
        }
      });
    }
  });
}
