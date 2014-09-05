// # import-files
// imports files as contentItems
/*jslint node: true */

'use strict';

var path = require('path'), fs = require('fs'), childProcess = require('child_process');

var utils = require('./utils'), contentLib = require('./content.js');


// Index all files in a directory
// @param {function} eachCallback - executed after copying each file
exports.indexFiles = function(files, member, callback, eachCallback) {
  files.forEach(function(file) {
    var filePath = file.path,
    targetPath = path.join(GLOBAL.config.uploadDirectory, file.name.replace(/.*\//g, '')),
    fileName = file.name;

    // copy it to upload directory
    fs.createReadStream(filePath).pipe(fs.createWriteStream(targetPath));

    if (eachCallback) {
      eachCallback(filePath);
    }

    var buffer = '';

    var extract = childProcess.execFile('bin/extractText.sh', [targetPath], { detached:true });

    extract.stdout.on('data', function (data) {
      buffer += data;
    });

    extract.stderr.on('data', function (err) {
     callback(err);
    });

    extract.on('close', function (code) {
      importFile({ title: fileName, fileName : fileName, content: buffer, member: member}, callback);
    });

    extract.on('error', function (err) {
      callback(err);
    });
  });
};

function importFile(res, callback) {
  var content = res.content || utils.NOCONTENT, uri = GLOBAL.config.HOMEPAGE + 'files/' + res.fileName;
  contentLib.indexContentItem({ uri: uri, title: res.title, content: content },
    { member: res.member },
    callback);
}
