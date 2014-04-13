
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

// perform a POST then callback
exports.doPost = function(path, data, callback) {
  var options = {
    host: GLOBAL.config.ESEARCH.server.host,
    port: GLOBAL.config.ESEARCH.server.port,
    path: GLOBAL.config.ESEARCH._index + path,
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(data)
    }
  };

  var buffer = '';
  var req = http.request(options, function(res) {
    res.setEncoding('utf8');
    res.on('data', function (chunk) {
      buffer += chunk;
    });
    res.on('end', function() {
     callback(null, JSON.parse(buffer));
    });
  });

  req.write(data);
  req.end();
}

