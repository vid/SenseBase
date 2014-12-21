// sample code for creating annotation items
// imports from mapped items or proto contentItems

/*jslint node: true */

'use strict';

var contentLib = require('../lib/content'), annoLib = require('../lib/annotations');
var MailParser  = require('mailparser').MailParser;
var Mbox        = require('node-mbox');
var mbox        = new Mbox();
var arrvals = ['date', 'from', 'to', 'cc', 'bcc', 'references', 'inReplyTo', 'message-id', 'mime-version', 'content-type'];

var count = 0, start = process.hrtime();
// [ 1800216, 25 ]


var root = process.argv[2], mboxname = process.argv[3], annotator = process.argv[4] || 'system';
if (!root || !mboxname) {
  console.log('usage:', process.argv[1], 'root mboxname');
  process.exit(1);
}

require('../index.js').setup();

// wait for message events
mbox.on('message', function(message) {
  var mailparser = new MailParser({ streamAttachments : true });
  mailparser.on('end', function(mail) {
    var uri = GLOBAL.config.HOMEPAGE + 'content/' + process.hrtime(start);
    console.log(++count, mail.subject, uri);
    var desc = annoLib.createContentItem({ title: mail.subject || '<NOTITLE>', content: mail.html || mail.text || '<NOCONTENT>', uri: uri } ), annos = [];
    annos.push(annoLib.createAnnotation({root:root, annotatedBy: annotator, hasTarget: uri, type: 'category', category: mboxname}));
    arrvals.forEach(function(h) {
      var header = mail[h] || mail.headers[h];
      if (!header) {
        return;
      }
      if (h === 'date') {
        var date = new Date(header);
        annos.push(annoLib.createAnnotation({root:root, type: 'value', annotatedBy: annotator, hasTarget: uri, key: 'date', isA: 'Date', value : date }));
        annos.push(annoLib.createAnnotation({root:root, type: 'category', annotatedBy: annotator, hasTarget: uri, isA: 'Number', category : [ 'year', date.getYear() ] }));
      } else if (Array.isArray(header)) {
        header.forEach(function(aheader) {
          if (aheader.address) {
            annos.push(annoLib.createAnnotation({root:root, type: 'category', annotatedBy: annotator, hasTarget: uri, category : ['address', aheader.address.toLowerCase().replace(/.*\./, ''), aheader.address] }));
            if (aheader.name) {
              annos.push(annoLib.createAnnotation({root:root, type: 'category', annotatedBy: annotator, hasTarget: uri, category : ['name', (aheader.name.substring(0, 1) || '').toLowerCase(), aheader.name] }));
            }
          } else {
            annos.push(annoLib.createAnnotation({root:root, annotatedBy: annotator, hasTarget: uri, type: 'value', key: h, value: aheader}));
          }
        });
      } else {
        annos.push(annoLib.createAnnotation({root:root, annotatedBy: annotator, hasTarget: uri, type: 'value', key: h, value: header}));
      }
    });
    desc.annotations = annos;
    contentLib.indexContentItem(desc, {member: annotator}, function(err, res) {
      console.log(res.items);
      if (err) {
        console.log(err, res);
      }
    });
  });
  mailparser.write(message);
  mailparser.end();

});

// pipe stdin to mbox parser
process.stdin.pipe(mbox);

mbox.on('end', function() {
  setTimeout(process.exit, 60000);
});
