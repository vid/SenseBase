// ### service manager

var forever = require('forever'), _ = require('lodash');

var auth = require('../lib/auth');

var site = require('../local-site.json'), services = [];

site.logins.forEach(function(member) {
  if (member.type === 'Agent' && member.status === 'available' && member.service) {
    var service = member.service;
    services[service] =  forever.start('services/' + service + '.js', {});
  }
});
console.log(_.keys(services));
