// faye stuf

var annotateServices = require('./annotateServices.js'), indexer = require('../lib/indexer');

var faye = require('faye');
var bayeux = new faye.NodeAdapter({mount: '/montr', timeout: 45});
var fayeClient = new faye.Client(GLOBAL.config.FAYEHOST);

exports.start = function(server) {
  bayeux.attach(server);

  // user functions

  var subUsersList = fayeClient.subscribe('/team/list', function(message) {
    GLOBAL.info('team/list', message);
    fayeClient.publish('/teamList', GLOBAL.config.users);
  });

  var subUserRemove = fayeClient.subscribe('/team/remove', function(member) {
    GLOBAL.info('team/remove', member);
    for (var i = 0; i < GLOBAL.config.users.length; i++) {
      if (GLOBAL.config.users[i].username == member.username) {
        GLOBAL.config.users.splice(i, 1);
        saveUsers();
        fayeClient.publish('/teamList', GLOBAL.config.users);
      }
    }
  });

  var subUserSave = fayeClient.subscribe('/team/save', function(member) {
    GLOBAL.info('team/save', member);
    for (var i = 0; i < GLOBAL.config.users.length; i++) {
      if (GLOBAL.config.users[i].username == member.username) {
        GLOBAL.config.users[i] = member;
        saveUsers();
        fayeClient.publish('/teamList', GLOBAL.config.users);
      }
    }
  });

  var subUserAdd = fayeClient.subscribe('/team/add', function(candidate) {
    GLOBAL.info('team/add', candidate);
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
    GLOBAL.info('Annotate', message);
    try {
      indexer.retrieveByURI(message.uri, function(err, res) {
        if (!res) {
          GLOBAL.info('no annotations', message.uri);
          fayeClient.publish('/annotations', { uri: message.uri, annotations : []});
	  return;
	}

	var text = res._source.content;
        annotateServices.annotate(message.services, message.uri, text, function(service, annotations) {
          GLOBAL.info('publishing', service, annotations.length);
          fayeClient.publish('/annotations', { uri: message.uri, service: service, annotations : annotations});
        });
      });
    } catch (e) {
      GLOBAL.info('\nAnnotate failed', e);
    }
  });

  var subSaveAnnotation = fayeClient.subscribe('/saveAnnotations', function(set) {
      GLOBAL.info('saveAnnotations', set.uri);
      GLOBAL.config.indexer.saveContentItem(set.uri, null, null, null, true, null, null, null, set.annotations);
  });

  // search

  var searchSub = fayeClient.subscribe('/search', function(message) {
    GLOBAL.info('/search', message);
    GLOBAL.config.indexer.formSearch(message, function(err, results) {
      if (results) {
        GLOBAL.info('searchResults', err, results.hits.hits.length);
        fayeClient.publish('/searchResults', results);
      } else {
        fayeClient.publish('/searchResults', []);
        GLOBAL.debug('NO RESULTS');
      }
    });
  });

  var searchSub = fayeClient.subscribe('/moreLikeThis', function(message) {
    GLOBAL.info('/moreLikeThis', message);
    GLOBAL.config.indexer.moreLikeThis(message.uri, function(err, results) {
      if (results) {
        GLOBAL.info('moreLikeThisResults', err, results.hits.hits.length);
        fayeClient.publish('/searchResults', results);
      } else {
        fayeClient.publish('/searchResults', []);
        GLOBAL.debug('NO RESULTS');
      }
    });
  });

  // scraping functions

  // old version in lib/scraping.js

  var scrapeLinks = [];
  var seenLinks = {};

  var linksSub = fayeClient.subscribe('/links', function(site) {
    GLOBAL.info('/links', site);

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
      GLOBAL.debug('pushing', scrapeLinks[0]);
      fayeClient.publish('/scrape', scrapeLinks[0]);
    }
  });


/*  GLOBAL.send({ text: 'register'}, 'workers'); */
};

exports.updateItem = function(item) {
  fayeClient.publish('/updateItem', item);
};

