
var expect = require("expect.js"), indexer = require('../../lib/indexer.js'), fs = require('fs'), path = require('path');
var uniq = (new Date().getTime()).toString(16) + 'x' + Math.round(Math.random(9e9) * 9e9).toString(16);
var fileUpload = require('../../lib/file-upload.js');
GLOBAL.config = require('../lib/test-config.js').config;

describe('File upload', function(done){
  it('should process the file', function(done) {
    var uniqPath = path.join('/tmp', uniq);
    fs.writeFileSync(uniqPath, uniq);
    var uploadingFileRequest = { files : { file: { name: uniq, path: uniqPath} } };

    fileUpload.uploadFile(uploadingFileRequest, function(err, resp) {
      expect(resp).to.not.be.null;
      expect(err).to.be.null;
      expect(resp.buffer.indexOf(uniq) > -1).to.be.true;
      expect(path.join(GLOBAL.config.uploadDirectory, uniq)).to.be.true;
      expect(fs.existsSync(uniqPath)).to.be.false;
      done();
    });
  });
});

