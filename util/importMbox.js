// sample code for creating annotation items
// imports from mapped items or proto contentItems

/*jslint node: true */

'use strict';

var contentLib = require('../lib/content'), annoLib = require('../lib/annotations');
var MailParser  = require('mailparser').MailParser;
var Mbox        = require('node-mbox');
var mbox        = new Mbox();

var count = 0, start = process.hrtime();
// [ 1800216, 25 ]


var root = process.argv[2], mboxname = process.argv[3], annotator = process.argv[4] || 'system';
if (!root || !mboxname) {
  console.log('usage:', process.argv[1], 'root mboxname');
  process.exit(1);
}

require('../index.js').setup();

// wait for message events
var desc;
mbox.on('message', function(message) {
  var mailparser = new MailParser({ streamAttachments : true });
  mailparser.on('end', function(mail) {
    console.log(++count, mail.subject);
    var headers = mail.headers;
    var uri = GLOBAL.config.HOMEPAGE + process.hrtime(start);
    desc = annoLib.createContentItem({ title: mail.subject || '<NOTITLE>', content: mail.html || mail.text || '<NOCONTENT>', uri: uri, annotations: [] } );
    for (var h in headers) {
      if (h === 'date') {
        desc.annotations.push(annoLib.createAnnotation({type: 'value', annotatedBy: annotator, hasTarget: uri, key: 'date', isA: 'Date', value : new Date(headers[h]) }));
        desc.created = new Date(headers[h]);
      } else {
        desc.annotations.push(annoLib.createAnnotation({annotatedBy: annotator, hasTarget: uri, type: 'value', key: h, value: headers[h], root: 'cpunks'}));
      }
    }
    contentLib.indexContentItem(desc, {member: annotator}, function(err, res) {
      console.log(err, res);
    });
  });
  mailparser.write(message);
  mailparser.end();

});

// pipe stdin to mbox parser
process.stdin.pipe(mbox);

mbox.on('end', function() {
  setTimeout(process.exit, 5000);
});
