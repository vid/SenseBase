// service to perform sentiment annotation

var http = require('http');
var querystring = require('querystring');
var fs = require('fs');
var url = require('url');
var analyze = require('Sentimental').analyze;

http.createServer(function(request, response) {
    if (request.method == 'POST') {
		postRequest(request, response, function() {
      if (!response.post.data) {
        response.post.data = "nodata";
      }
			response.writeHead(200, "OK", {'Content-Type': 'text/html'});
      //var a= response.post.data.split(".\s");
      var a= [response.post.data];
      var res = [];
      a.forEach(function(f) {
        f = (f + '.').trim();
        var r = analyze(f);
        res.push({ s:f, r:r});
      });
			response.write(JSON.stringify(res, null, 2).toString());
			response.end();
		});
    }
	else {
		var path = url.parse(request.url).pathname;
		if (path === '/') {
			response.writeHead(200, "OK", {'Content-Type': 'text/html'});
			response.write('<form method="post"><textarea name="data" rows="10" cols="80"></textarea><input type="submit" /></form>');
			response.end();
		}
		else {
			console.log("Unknown path " + path);
		}
    }

}).listen(9002);

function postRequest(request, response, callback) {
    var queryData = "";
    request.on('data', function(data) {
        queryData += data;
        if(queryData.length > 1e6) {
            queryData = "";
            response.writeHead(413, {'Content-Type': 'text/plain'});
            request.connection.destroy();
        }
    });

    request.on('end', function() {
        response.post = querystring.parse(queryData);
console.log(response.post);
        callback();
    });
}

