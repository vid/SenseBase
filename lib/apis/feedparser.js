// search RSS/atom feeds
/*jslint node: true */


//  FIXME callback processing errors

'use strict';

var FeedParser = require('feedparser'), request = require('request');

exports.search = function(api, context, callback) {
  var req = request(context.query), feedparser = new FeedParser([]), submitted = 0;
  context.referer = context.query;

  req.on('error', function (error) {
    callback(error);
  });

  req.on('response', function (res) {
    var stream = this;

    if (res.statusCode != 200) callback(new Error('Bad status code'));

    stream.pipe(feedparser);
  });

  feedparser.on('error', function(error) {
    callback(error);
  });

  feedparser.on('readable', function() {
    var stream = this, meta = this.meta, item;

    /*jshint -W084 */
    while (item = stream.read()) {
      callback(null, item.link, context);
      submitted++;
    }
  });
};
