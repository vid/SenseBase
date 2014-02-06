var fs = require('fs');
var exec=require('child_process').exec;

/** FIXME: input directory
**/

/*
require('../../config.js');
process('Some great George Bush thing.', function(err, results) {
  console.log(err, JSON.stringify(results, null, 2));
});
*/

exports.name = 'WikiMeta';
exports.process = process;

function process(text, callback) {
  fs.writeFileSync('/tmp/f.txt', text.toString().replace(/<.*?>/gm, ''));
  var cmd = 'perl ./annotateServices/perl/wikimeta.pl ' + GLOBAL.config.serviceKeys.wikiMeta+ ' /tmp/f.txt > /tmp/o.txt';
  var e = exec(cmd, function (error, stdout, stderr) {
    var json;
    var input = fs.readFileSync('/tmp/o.txt');
    try {
      json = JSON.parse(input);
    } catch (e) {
      console.log('wikimeta ERROR', input);
      callback(e);
      return;
    }
    var ne = json.document[2]['Named Entities'];
    annoRows = [];
    var score = 0;
    console.log(ne);
    ne.forEach(function(w) {
console.log('W',w);
      annoRows = annoRows.concat(getOffsets(w.EN, text, 'Named Entities'));
    });
    console.log('returning', annoRows.length);
    callback(null, annoRows);
  });
}

function getOffsets(word, text, type) {
  var ret = [];
  var re = new RegExp(word, 'g');
  while ((match = re.exec(text)) != null) {
     ret.push({"ranges":[{"start":"/section[1]","startOffset":match.index,"end":"/section[1]","endOffset":match.index + word.length}],"quote":word,'text':'WikiMeta annotation "' + word + '"', tags: [type]});
  }
  return ret;
}
