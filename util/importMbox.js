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
//    console.log(++count, mail.subject, uri);
    var desc = annoLib.createContentItem({ title: mail.subject || '<NOTITLE>', content: mail.html || mail.text || '<NOCONTENT>', uri: uri } ), annos = [];
    annos.push(annoLib.createAnnotation({root:root, state: 'validated', annotatedBy: annotator, hasTarget: uri, type: 'category', category: mboxname}));
    arrvals.forEach(function(h) {
      var header = mail[h] || mail.headers[h];
      if (!header) {
        return;
      }
      if (h === 'date') {
        var date = new Date(header);
        desc.created = date;
        annos.push(annoLib.createAnnotation({root:root, state: 'validated', type: 'value', annotatedBy: annotator, hasTarget: uri, key: 'date', isA: 'Date', value : date }));
        annos.push(annoLib.createAnnotation({root:root, state: 'validated', type: 'category', annotatedBy: annotator, hasTarget: uri, isA: 'Number', category : [ 'year', date.getYear() ] }));
      } else {
        (Array.isArray(header) ? header : [header]).forEach(function(aheader) {
          // email address
          if (aheader.address !== undefined) {
            annos.push(annoLib.createAnnotation({root:root, state: 'validated', type: 'category', annotatedBy: annotator, hasTarget: uri, category : [h, 'address', addressString(aheader.address).replace(/.*\./, ''), addressString(aheader.address)] }));
            if (aheader.name) {
              annos.push(annoLib.createAnnotation({root:root, state: 'validated', type: 'category', annotatedBy: annotator, hasTarget: uri, category : [h, 'name', (aheader.name.substring(0, 1) || '').toLowerCase(), aheader.name] }));
            }
          // group address
          } else if (aheader.group) {
            annos.push(annoLib.createAnnotation({root:root, state: 'validated', type: 'category', annotatedBy: annotator, hasTarget: uri, category : [h, 'group', addressString(aheader.group.address)] }));
            if (aheader.group.name) {
              annos.push(annoLib.createAnnotation({root:root, state: 'validated', type: 'category', annotatedBy: annotator, hasTarget: uri, category : [h, 'group', 'name', (aheader.group.name.substring(0, 1) || '').toLowerCase(), aheader.group.name] }));
            }
          } else {
            annos.push(annoLib.createAnnotation({root:root, state: 'validated', annotatedBy: annotator, hasTarget: uri, type: 'category', category: [h, header]}));
          }
        });
      }
    });
    desc.annotations = annos;
    (function(cItem){
      contentLib.indexContentItem(desc, {member: annotator}, function(err, res) {
        if (err || res.items[0].index.error) {
          console.log(err || res.items[0].index.error, 'cItem', JSON.stringify(cItem, null, 2), JSON.stringify(res, null, 2));
        }
      });
    }(desc));
  });
  mailparser.write(message);
  mailparser.end();

});

// transform characters in an address to an acceptable range or a default
function addressString(s) {
  return (s || '').toLowerCase().replace(/[^a-z\u00E0-\u00FC]/g, '') || '<NOADDRESS>';
}

// pipe stdin to mbox parser
process.stdin.pipe(mbox);

mbox.on('end', function() {
  console.log('waiting 300 seconds for pubsub annotations');
  setTimeout(process.exit, 300000);
});
