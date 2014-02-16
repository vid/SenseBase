
// verify the keys are present or explode
//
exports.check = function(arr, desc) {
  arr.forEach(function(k) {
    if (desc[k] === undefined) {
     throw Error("missing field " + k + ' from ' + JSON.stringify(desc, null, 2));
    }
  });
}

// return plain text from an html document
exports.getTextFromHtml = function(html) {
  return html.replace(/.*<\/head>/im, '').replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/mgi, '').replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/mgi,'').replace(/<[^>]*>/mg, ''); //FIXME
}
