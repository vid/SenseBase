// ### Watchlist
//
// rename to dashboard
/*jslint browser: true */
/*jslint node: true */
/* global $,alert */
'use strict';

var context;

var _ = require('lodash');
var sline = _.template('<tr><td><div class="ui icon button"><i class="remove watch icon"></i></div></td><td class="match text"><%= match %></td></tr>');

exports.init = function(ctx) {
  context = ctx;

  context.pubsub.watch.request({}, function(results) {
    $('#watchlist tbody').html('');
    if (results.hits) {
      _.pluck(results.hits.hits, '_source').forEach(function(s) {
        $('#watchlist tbody').append(sline(s));
      });

      $('.remove.watch.icon').on('click', function() {
        var match = $(this).parent().parent().parent().find('.match.text').text()
        context.pubsub.watch.delete(match);
      });
    }
  });
};
