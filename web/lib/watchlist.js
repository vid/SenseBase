// ### Watchlist
//
// rename to dashboard
/*jslint browser: true */
/*jslint node: true */
/* global $,alert,doQuery */
'use strict';

var context;

var _ = require('lodash');
var sline = _.template('<tr><td><div class="ui icon button"><i class="remove icon"></i></div></td><td><%= match %></td><td>0</td><td>Never</td></tr>');

exports.init = function(ctx) {
  context = ctx;

  context.pubsub.retrieveSubscriptions({}, function(results) {
    $('#watchlist tbody').html('');
    if (results.hits) {
      _.pluck(results.hits.hits, '_source').forEach(function(s) {
        $('#watchlist tbody').append(sline(s));
      });
    }
  });
};
