var querystring = require('querystring');
var http = require('http');
var request = require('request');
var name = 'Spotlight';
exports.name = name;
exports.process = function(text, callback) {
  GLOBAL.config.users.forEach(function(user) {
    if (user.username == name) {
      needsValidation = user.needsValidation;
    }
  });

  candidates(text, function(json) {
    try {
      json = JSON.parse(json);
    } catch (e) {
      console.log('FAILING JSON', json);
      callback(e);
      return;
    }

    annoRows = [];
    if (json.annotation.surfaceForm) {
      var r = json.annotation.surfaceForm;
      if (!r.length) {
        r = [r];
      }
      r.forEach(function(k) {
        var name = k['@name'];
        var offset =  parseInt(k['@offset']);
        var offsetEnd = offset + name.length;
        for (var i = 0; i < k.resource.length; i++) {
//          console.log('types "', k.resource[i]['@types'], '"');
          var types = k.resource[i]['@types'];
          if (types.trim().length > 0) {

            var a = {"ranges":[{"start":"/section[1]","startOffset":offset,"end":"/section[1]","endOffset":offsetEnd}],"quote":name, value : k.resource[i]['@label'],'text':'Spotlight annotation "' + name + '" ' + offset, types: types.split(', '), validated: !needsValidation}
            annoRows.push(a);
          }
        }
//console.log(JSON.stringify(annoRows, null, 2));
      });
    }
    callback(null, annoRows);
  });
}


function candidates(text, callback) {
  var postData = querystring.stringify({text : text, confidence:0.2, support:20});

  var postOptions = {
      host: GLOBAL.config.SPOTLIGHT.host,
      port: GLOBAL.config.SPOTLIGHT.port,
      path: '/rest/candidates',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
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
