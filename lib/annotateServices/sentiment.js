var querystring = require('querystring');
var http = require('http');
var request = require('request');

var name = 'Sentiment';
exports.name = name;
exports.process = function(text, callback) {
  var users = require('../../users.json').logins;

  users.forEach(function(user) {
    if (user.username == name) {
      needsValidation = user.needsValidation;
    }
  });
  candidates(text, function(json) {
    try {
      json = JSON.parse(json);
    } catch (e) {
      callback(e);
      return;
    }
    var positive = json[0].r.positive.words;
    var negative = json[0].r.negative.words;
    annoRows = [];
    var score = 0;
    positive.forEach(function(w) {
      annoRows = annoRows.concat(getOffsets(w, text, 'positive'));
    });
    negative.forEach(function(w) {
      annoRows = annoRows.concat(getOffsets(w, text, 'negative'));
    });
    console.log('returning', annoRows.length);
    annoRows.push({ranges : 'item', quote: 'AFINN sentiment', score : score });
    callback(null, annoRows);
  });
}

function getOffsets(word, text, type) {
  var ret = [];
  var re = new RegExp(word, 'g');
  while ((match = re.exec(text)) != null) {
     ret.push({"ranges":[{"start":"/section[1]","startOffset":match.index,"end":"/section[1]","endOffset":match.index + word.length}],"quote":word,'text':'Sentiment annotation "' + word + '"', types: [type], validated: !needsValidation});
//    console.log("match found at " + match.index);
  }
  return ret;
}

function candidates(text, callback) {
  var postData = querystring.stringify({data : text});

  var postOptions = {
      host: GLOBAL.config.SENTIMENT.host,
      port: GLOBAL.config.SENTIMENT.port,
      path: '/',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': postData.length
      }
  };
  var data = '';
  var postRequest = http.request(postOptions, function(res) {
      res.setEncoding('utf8');
      res.on('data', function (chunk) {
          data += chunk;
      });
      res.on('end', function() {
        callback(data);
      });
  });

  postRequest.write(postData);
}

