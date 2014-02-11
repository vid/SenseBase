var inspect = require('eyes').inspector({maxLength:20000});
var pdf_extract = require('pdf-extract');
var absolute_path_to_pdf = process.argv[0];
var options = {
    type: 'text'  // extract the actual text in the pdf file
};

var callback = function(v) { console.log(v); };

var processor = pdf_extract(absolute_path_to_pdf, options, function(err) {
    if (err) {
          return callback(err);
            }
});
processor.on('complete', function(data) {
    inspect(data.text_pages, 'extracted text pages');
      callback(null, data.text_pages);
});
processor.on('error', function(err) {
    inspect(err, 'error while extracting pages');
      return callback(err);
});
