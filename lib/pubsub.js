// faye stuf

var annotateServices = require('./annotateServices.js'), indexer = require('../lib/indexer');

var faye = require('faye');
var bayeux = new faye.NodeAdapter({mount: '/montr', timeout: 45});
var fayeClient = new faye.Client(GLOBAL.config.FAYEHOST);

exports.start = function(server) {
  bayeux.attach(server);

  // user functions

  var subUsersList = fayeClient.subscribe('/team/list', function(message) {
    console.log('team/list', message);
    fayeClient.publish('/teamList', GLOBAL.config.users);
  });

  var subUserRemove = fayeClient.subscribe('/team/remove', function(member) {
    console.log('team/remove', member);
    for (var i = 0; i < GLOBAL.config.users.length; i++) {
      if (GLOBAL.config.users[i].username == member.username) {
        GLOBAL.config.users.splice(i, 1);
        saveUsers();
        fayeClient.publish('/teamList', GLOBAL.config.users);
      }
    }
  });

  var subUserSave = fayeClient.subscribe('/team/save', function(member) {
    console.log('team/save', member);
    for (var i = 0; i < GLOBAL.config.users.length; i++) {
      if (GLOBAL.config.users[i].username == member.username) {
        GLOBAL.config.users[i] = member;
        saveUsers();
        fayeClient.publish('/teamList', GLOBAL.config.users);
      }
    }
  });

  var subUserAdd = fayeClient.subscribe('/team/add', function(candidate) {
    console.log('team/add', candidate);
    if (candidate.name && candidate.type) {
      saveUsers(function() {
        GLOBAL.config.users.push({id : new Date().getTime(), active: new Date(), username : candidate.name, type: candidate.type});
      });
      fayeClient.publish('/teamList', GLOBAL.config.users);
    }
  });

  function saveUsers(istep) {
    fs.writeFileSync('versions/users.' + new Date().getTime() + '.json', JSON.stringify({ logins : GLOBAL.config.users}, null, 2));
    if (istep) { istep(); }
    fs.writeFileSync('users.json', JSON.stringify({ logins : GLOBAL.config.users}, null, 2));
  }

  // annotations
  var subAnnotate = fayeClient.subscribe('/annotate', function(message) {
    console.log('Annotate', message);
    try {
      indexer.retrieveByURI(message.uri, function(err, res) {
        if (!res) {
          console.log('no annotations', message.uri);
          fayeClient.publish('/annotations', { uri: message.uri, annotations : []});
	  return;
	}

console.log('RES', message.uri, res);
	var text = res._source.content;
//      GLOBAL.config.pageCache.get(message.uri, function(headers, text) {
        annotateServices.annotate(message.services, message.uri, text, function(service, annotations) {
          console.log('publishing', service, annotations.length);
          fayeClient.publish('/annotations', { uri: message.uri, service: service, annotations : annotations});
        });
      });
    } catch (e) {
      console.log('\nAnnotate failed', e);
    }
  });

  var subSaveAnnotation = fayeClient.subscribe('/saveAnnotations', function(set) {
      console.log('saveAnnotations', set.uri);
      GLOBAL.config.indexer.saveContentItem(set.uri, null, null, null, true, null, null, null, set.annotations);
  });

  // search

  var searchSub = fayeClient.subscribe('/search', function(message) {
    console.log('/search', message);
    GLOBAL.config.indexer.formSearch(message, function(err, results) {
      if (results) {
        console.log('searchResults', err, results.hits.hits.length);
        fayeClient.publish('/searchResults', results);
      } else {
        fayeClient.publish('/searchResults', []);
        console.log('NO RESULTS');
      }
    });
  });

  var searchSub = fayeClient.subscribe('/moreLikeThis', function(message) {
    console.log('/moreLikeThis', message);
    GLOBAL.config.indexer.moreLikeThis(message.uri, function(err, results) {
      if (results) {
        console.log('moreLikeThisResults', err, results.hits.hits.length);
        fayeClient.publish('/searchResults', results);
      } else {
        fayeClient.publish('/searchResults', []);
        console.log('NO RESULTS');
      }
    });
  });

  // scraping functions

  // old version in lib/scraping.js

  var scrapeLinks = [];
  var seenLinks = {};

  var linksSub = fayeClient.subscribe('/links', function(site) {
    console.log('/links', site);

    var found = false;
    
    for (var i = 0; i < scrapeLinks.length; i++) {
      if (scrapeLinks[i].replace(/\/$/, '') == site.site.replace(/\/$/, '')) {
        scrapeLinks.splice(i, 1);
        found = true;
      }
    }
    if (found || site.scrape) {
      site.links.forEach(function(link) {
        if (!seenLinks[link]) {
          seenLinks[link] = 1;
          scrapeLinks.push(link);
        }
      });
    }
    if (scrapeLinks.length) {
      console.log('pushing', scrapeLinks[0]);
      fayeClient.publish('/scrape', scrapeLinks[0]);
    }
  });


/*  GLOBAL.send({ text: 'register'}, 'workers'); */
};

exports.updateItem = function(item) {
  fayeClient.publish('/updateItem', item);
};

