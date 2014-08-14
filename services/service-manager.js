// ### service manager

var forever = require('forever');
var services = [];

['search', 'annotators/sentiment', 'annotators/addRequest'].forEach(function(service) {
  services[service] =  forever.start('services/' + service + '.js', {});
});
console.log(services);

forever.list ({}, function(err, res) {
  console.log(err, res);
});



