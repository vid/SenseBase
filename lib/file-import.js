// # import-files
// imports files as contentItems
/*jslint node: true */

'use strict';

var path = require('path'), fs = require('fs'), spawn = require('child_process').spawn;

var utils = require('./utils'), contentLib = require('./content.js');


// Index files.
// @param {object} files - { name, path }
// @param {function} eachCallback - executed after copying each file
exports.indexFiles = function(files, meta, callback, eachCallback) {
  files.forEach(function(file) {
    var filePath = file.path,
    targetPath = path.join(GLOBAL.config.uploadDirectory, file.name.replace(/.*\//g, '')),
    fileName = file.name;
    console.log('yi', filePath, targetPath, fileName);

    // copy it to upload directory
    fs.createReadStream(filePath).pipe(fs.createWriteStream(targetPath));

    if (eachCallback) {
      eachCallback(filePath);
    }

    var buffer = '';

    var extract = spawn('bin/extractText.sh', [targetPath]);

    extract.stdout.on('data', function (data) {
      console.log('BUF', buffer.length, data.length);
      buffer += data;
    });

    extract.stderr.on('data', function (err) {
      console.log('ERR', err);
      extract.kill('SIGKILL');
     callback(err);
    });

    extract.stdout.on('close', function (code) {
      extract.kill('SIGKILL');
      importFile({ title: fileName, fileName : fileName, content: buffer.toString(), meta: meta}, callback);
    });

    extract.stdout.on('error', function (err) {
      extract.kill('SIGKILL');
      callback(err);
    });
  });
};

function importFile(res, callback) {
  var content = res.content || utils.NOCONTENT, uri = GLOBAL.config.HOMEPAGE + 'files/' + res.fileName;
  contentLib.indexContentItem({ uri: uri, title: res.title, content: content },
    res.meta,
    callback);
}
