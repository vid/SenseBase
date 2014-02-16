// faye stuf

var indexer = require('../lib/indexer');
var utils = require('../lib/utils');
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

  // request annotating a document
  fayeClient.subscribe('/annotate', function(message) {
    indexer.retrieveAnnotations(message.uri, function(err, results) {
      GLOBAL.info('/annotate', message.uri, results.hits.total);
      var annotations = results.hits.hits.map(function(m) {
        return m._source;
      });
      fayeClient.publish('/annotations', { uri: message.uri, annotations: annotations});
    });
  });

  // index incoming annotations
  fayeClient.subscribe('/saveAnnotations', function(annotations) {
    GLOBAL.info('saveAnnotations', annotations.length);
    GLOBAL.config.indexer.saveAnnotations(annotations);
    fayeClient.publish('/annotations', annotations);
  });

  // search
  fayeClient.subscribe('/search', function(message) {
    GLOBAL.info('/search', message);
    GLOBAL.config.indexer.formSearch(message, function(err, results) {
      if (results) {
        GLOBAL.info('searchResults', err, results.hits.hits.length);
        fayeClient.publish('/searchResults', results);
// retrieve and send annotations
        var uris = [];
        results.hits.hits.forEach(function(h) {
          uris.push(h.fields.uri); 
        });
        indexer.retrieveAnnotations(uris, function(err, results) {
          fayeClient.publish('/annotations', results);
        });
      } else {
        fayeClient.publish('/searchResults', []);
        GLOBAL.debug('NO RESULTS');
      }
    });
  });

  fayeClient.subscribe('/moreLikeThis', function(message) {
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

// updates clients with a content item
exports.updateItem = function(cItem) {
  fayeClient.publish('/updateItem', cItem);
};

// requests annotators to annotate
exports.requestAnnotate = function(cItem) {
  fayeClient.publish('/requestAnnotate', { cItem: cItem, text: utils.getTextFromHtml(cItem.content)});
};

