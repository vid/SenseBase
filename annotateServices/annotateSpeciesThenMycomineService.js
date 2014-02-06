var http = require('http');
var querystring = require('querystring');
var java = require("java");
var fs = require('fs');
var url = require('url');
var exec=require('child_process').exec;

eval(fs.readFileSync('jarlist.js')+''); // classpath

var TextMiningPipeline = java.import('csfg.TextMiningPipeline');
var pipe = new TextMiningPipeline();
pipe.initSync();
console.log("ready");

http.createServer(function(request, response) {
    if (request.method == 'POST') {
      postRequest(request, response, function()
      {
        fs.writeFileSync("docs/f.txt", response.post.data);

        var cmd = "./species docs";
        var e = exec(cmd, function (error, stdout, stderr) {
console.log('specied', stdout);
          pipe.processTextSync(stdout);
          var ret = ''+pipe.getDocResultSync();

          response.writeHead(200, "OK", {'Content-Type': 'text/html'});
          response.write(ret);
          response.end();
        });
      });
    }
	else {
		var path = url.parse(request.url).pathname;
		if (path === '/')
		{
			response.writeHead(200, "OK", {'Content-Type': 'text/html'});
			response.write('<form method="post"><textarea name="data"></textarea><input type="submit" /></form>');
			response.end();
		}
		else {
			console.log("Unknown path " + path);
		}
    }

}).listen(9000);

function postRequest(request, response, callback)
{
    var queryData = "";
    request.on('data', function(data)
	{
        queryData += data;
        if(queryData.length > 1e6)
		{
            queryData = "";
            response.writeHead(413, {'Content-Type': 'text/plain'});
            request.connection.destroy();
        }
    });

    request.on('end', function()
	{
        response.post = querystring.parse(queryData);
        callback();
    });

}

