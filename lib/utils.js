
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
  return html.replace(/.*<\/head>/im, '').replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/mgi, '').replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/mgi,'').replace(/<[^>]*>/mg, ''); //FIXME
};

exports.NOCONTENT = 'NOCONTENT';

