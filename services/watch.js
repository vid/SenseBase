// service that fulfills watching updated content
/* jslint node: true */
'use strict';

require(process.cwd() + '/index.js').setup();


var nodemailer = require('nodemailer'), _ = require('lodash');

var transporter = nodemailer.createTransport(GLOBAL.config.mailer.transport), mailOptions = {
  from: GLOBAL.config.mailer.from,
  subject: GLOBAL.config.mailer.subject
};

var clientID = GLOBAL.svc.auth.clientIDByUsername('system');
var utils = require('../lib/utils'), pubsub = require('../lib/pubsub-client').init({ homepage: GLOBAL.config.HOMEPAGE, clientID: clientID }), watchLib = require('../lib/watch');

pubsub.item.subUpdated(processWatches);

// process any watches in the last time period
function processWatches(items) {
  // queue up matches
  // { "member" : { "uri" : [ "match", "match" ] } }
  var toSend = {};
  GLOBAL.svc.indexer.retrieveWatches({}, function(err, res) {
    if (res.hits) {
      var watches = _.pluck(res.hits.hits, '_source');
      // for each hit
      items.forEach(function(item) {
        var matches = watchLib.matches(item, watches);
        if (matches.length) {
          matches.forEach(function(match) {
            toSend[match.member] = toSend[match.member] || {};
            toSend[match.member][item.uri] = toSend[match.member][item.uri] || [];
            toSend[match.member][item.uri].push(match.match);
          });
        }
      });
      send(toSend);
    }
  });
}

function send(toSend) {
  for (var member in toSend) {
    GLOBAL.svc.auth.findByUsername(member, function(err, to) {
      if (err) {
        GLOBAL.error(err);
      } else if (!to.email) {
        GLOBAL.error('no member', member, to);
      } else {
        var text = '', html = '';
        for (var uri in toSend[member]) {
          text += '\n' + GLOBAL.config.base + '?"' + uri + '"\n' + uri + ':\n' + toSend[member][uri].join('\n');
          html += '<br /><a href="' + GLOBAL.config.HOMEPAGE + '?terms=%22' + uri.replace(/ /g, '%20') + '%22">' + uri + '</a>\n<ul>' +
            toSend[member][uri].map(function(a) { return (a ? '<li>'+a.replace(/␟/g, '::') + '</li>': ''); }).join('') +
            '</ul>';
        }
        console.log('**', JSON.stringify(toSend[member]), html);
        var message = _.extend(mailOptions, {
          to: to.email,
          text: text + '\n--\n' + GLOBAL.config.HOMEPAGE,
          html: html + '--<br />' + GLOBAL.config.HOMEPAGE
        });

        transporter.sendMail(mailOptions, function(error, info) {
          if (error) {
            console.error('mailer failed', error);
          } else {
            console.log('Message sent: ' + info.response);
          }
        });
        GLOBAL.debug('send to', to);
      }
    });
  }
}
