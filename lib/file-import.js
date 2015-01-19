// # import-files
// imports files as contentItems
/*jslint node: true */

'use strict';

var path = require('path'), fs = require('fs'), spawn = require('child_process').spawn;

var utils = require('./utils'), contentLib = require('./content.js');


// Index files.
// @param {object} files - { name, path }
// @param {function} eachCallback - executed after copying each file
exports.indexFiles = function(files, context, callback, eachCallback) {
  var ex = [];
  files.forEach(function(file) {
    var filePath = file.path,
    targetPath = path.join(GLOBAL.config.uploadDirectory, file.name.replace(/.*\//g, '')),
    fileName = file.name;

    // copy it to upload directory
    fs.createReadStream(filePath).pipe(fs.createWriteStream(targetPath));

    var buffer = '';

    var extract = spawn('bin/extractText.sh', [filePath]);

    extract.stdout.on('data', function (data) {
      buffer += data;
    });

    extract.stderr.on('data', function (err) {
      extract.kill('SIGKILL');
      callback(err);
      if (eachCallback) {
        eachCallback(filePath);
      }
    });

    extract.stdout.on('close', function (code) {
      extract.kill('SIGKILL');
      importFile({ title: context.title || fileName, fileName : fileName, content: buffer.toString(), context: context}, callback);
      if (eachCallback) {
        eachCallback(filePath);
      }
    });

    extract.stdout.on('error', function (err) {
      console.log('file error', err);
      extract.kill('SIGKILL');
      callback(err);
    });
  });
};

function importFile(item, callback) {
  var content = item.content || utils.NOCONTENT, uri = GLOBAL.config.HOMEPAGE + 'files/' + item.fileName;
  contentLib.indexContentItem({ uri: uri, title: item.title, content: content },
    item.context,
    function(err, res, cItem) {
      callback(err, item, cItem);
    });
}
