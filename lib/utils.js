var http = require('http');

// verify the keys are present or explode
//
exports.check = function(arr, desc) {
  arr.forEach(function(k) {
    if (desc[k] === undefined) {
      checkError(desc, k);
    }
  });
};

// notify of errors we aren't dealing with
exports.passingError = function(err, res) { 
  if (err) { 
    GLOBAL.error('uncaught error', err); 
    console.trace();
  }
};

exports.checkError = checkError;

function checkError(desc, field) {
 throw Error('missing field ' + field + ' from ' + JSON.stringify(desc, null, 2));
}

// return plain text from an html document
exports.getTextFromHtml = function(html) {
  return html ? html.replace(/.*<\/head>/im, '').replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/mgi, '').replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/mgi,'').replace(/<[^>]*>/mg, '') : null;; //FIXME
}

// escape a regex's special characters
exports.escapeRegex = function(r) {
  return (r+'').replace(/([.?*+^$[\]\\(){}|-])/g, "\\$1");
}

exports.NOCONTENT = 'NOCONTENT';

// perform a GET then callback content
exports.retrieve = function(url, callback) {
  var buffer = '';
  http.get(url, function(res) {
    res.on('data', function (chunk) {
      buffer += chunk;
    });
    res.on('end', function() {
      callback(null, buffer);
    });
  }).on('error', function(e) {
    callback(e);
  });
}

// perform a POST then callback JSON contents
exports.doPostJson = function(options, data, callback) {
  doPost(options, data, function(err, result) {
    try {
      callback(null, JSON.parse(result));
    } catch (e) {
      callback(e);
    }
  });
}

exports.doPost = doPost;

// perform a POST then callback contents
function doPost(options, data, callback) {
  var buffer = '';
  var req = http.request(options, function(res) {
    res.setEncoding('utf8');
    res.on('data', function (chunk) {
      buffer += chunk;
    });
    res.on('end', function() {
      callback(null, buffer);
    });
  }).on('error', function(e) {
    callback(e);
  });

  req.write(data);
  req.end();
}

