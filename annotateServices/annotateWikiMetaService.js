var http = require('http');
var querystring = require('querystring');
var fs = require('fs');
var exec=require('child_process').exec;
var url = require('url');

/** Hacky version.
* make a directory called docs 
**/

var apiKey = '186691395332'; // yes, this should not be here. but it's only on our private repo and will probably change anyway. 

http.createServer(function(request, response)
{
    if (request.method == 'POST')
	{
		postRequest(request, response, function()
		{
      fs.writeFileSync('docs/f.txt', response.post.data);
      var cmd = 'perl ../../../perl/wikimeta.pl ' + apiKey + ' /tmp/f';
      var e = exec(cmd, function (error, stdout, stderr) {
        response.writeHead(200, "OK", {'Content-Type': 'text/html'});
        response.write(stdout);
        response.end();
      });
		});
    }
	else
	{
		var path = url.parse(request.url).pathname;
		if (path === '/')
		{
			response.writeHead(200, "OK", {'Content-Type': 'text/html'});
			response.write('<form method="post"><textarea name="data"></textarea><input type="submit" /></form>');
			response.end();
		}
		else
		{
			console.log("Unknown path " + path);
		}
    }

}).listen(9001);

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

