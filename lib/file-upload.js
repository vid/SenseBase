// file upload from the main service
/*jslint node: true */

'use strict';

var path = require('path'), fs = require('fs'), childProcess = require('child_process');

// move a request uploaded file to the upload directory and return its indexed contents
exports.uploadFile = function(req, callback) {
  var uploadedFiles = req.files.file;
    if (!Array.isArray(uploadedFiles)) {
      uploadedFiles = [uploadedFiles];
    }
    uploadedFiles.forEach(function(uploadedFile) {
      var tmpPath = uploadedFile.path,
      targetPath = path.join(GLOBAL.config.uploadDirectory, uploadedFile.name.replace(/.*\//g, '')),
      fileName = uploadedFile.name;

// copy it to upload directory
    fs.createReadStream(tmpPath).pipe(fs.createWriteStream(targetPath));

    fs.unlink(tmpPath, function(err) {
      if (err) throw err;
    });

    var buffer = '';

    var extract = childProcess.execFile('bin/extractText.sh', [targetPath], { detached:true });

    extract.stdout.on('data', function (data) {
      buffer += data;
    });

    extract.stderr.on('data', function (err) {
     callback(err);
    });

    extract.on('close', function (code) {
      callback(null, { title: fileName, fileName : fileName, buffer: buffer});
    });

    extract.on('error', function (err) {
      callback(err);
    });
  });
};
