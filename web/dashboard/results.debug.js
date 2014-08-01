// ### results.debug
/*jslint node: true */

'use strict';

exports.render = function(dest, results) {
  $(dest).html('<pre>'+JSON.stringify(results, null, 2) + '<br />Length: ' + JSON.stringify(results, null, 2).length + '</pre>');
};

exports.annotations = '*';
