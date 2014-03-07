// faye stuf

var indexer = require('../lib/indexer');
var utils = require('../lib/utils');
var faye = require('faye');
var bayeux = new faye.NodeAdapter({mount: '/montr', timeout: 45});
var fayeClient = new faye.Client(GLOBAL.config.FAYEHOST);

exports.start = function(server) {
  bayeux.attach(server);

// user functions

  fayeClient.subscribe('/team/list', function(data) {
    GLOBAL.info('team/list', data);
    fayeClient.publish('/teamList', GLOBAL.config.users);
  });

  fayeClient.subscribe('/team/remove', function(member) {
    GLOBAL.info('team/remove', member);
    for (var i = 0; i < GLOBAL.config.users.length; i++) {
      if (GLOBAL.config.users[i].username == member.username) {
        GLOBAL.config.users.splice(i, 1);
        saveUsers();
        fayeClient.publish('/teamList', GLOBAL.config.users);
      }
    }
  });

  fayeClient.subscribe('/team/save', function(member) {
    GLOBAL.info('team/save', member);
    for (var i = 0; i < GLOBAL.config.users.length; i++) {
      if (GLOBAL.config.users[i].username == member.username) {
        GLOBAL.config.users[i] = member;
        saveUsers();
        fayeClient.publish('/teamList', GLOBAL.config.users);
      }
    }
  });

  fayeClient.subscribe('/team/add', function(candidate) {
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

// annotations for an individual uri
  fayeClient.subscribe('/annotate', function(data) {
    GLOBAL.info('/annotate', data);
    indexer.retrieveAnnotations(data.uri, function(err, results) {
      fayeClient.publish('/annotations', { uri: data.uri, annotations: results.hits.hits.map(function(h) { return h._source;})});
    });
  });

  // index incoming annotations, adding validated state
  fayeClient.subscribe('/saveAnnotations', function(combo) {
    GLOBAL.info('saveAnnotations', combo.uri, combo.annotations.length);
// apply validation state based on user
    combo.annotations.forEach(function(a) {
      a.validated = false;
      GLOBAL.config.users.forEach(function(u) {
        if (u.username === a.annotatedBy) {
          a.validated = !u.needsValidation;
        }
      }); 
    });
    GLOBAL.config.indexer.saveAnnotations(combo.uri, combo.annotations);
    fayeClient.publish('/annotations', { uri: combo.uri, annotations: combo.annotations});
  });

  // search
  fayeClient.subscribe('/search', function(data) {
    GLOBAL.info('/search', data);
    GLOBAL.config.indexer.formSearch(data, function(err, results) {
      if (results) {
        GLOBAL.info('searchResults', err, results.hits.hits.length);
        fayeClient.publish('/searchResults', results);
      } else {
        fayeClient.publish('/searchResults', []);
        GLOBAL.debug('NO RESULTS');
      }
    });
  });

  fayeClient.subscribe('/getContentItem', function(uri) {
    GLOBAL.info('/getContentItem', uri);
    indexer.retrieveByURI(uri, function(err, result) {
      fayeClient.publish('/updateItem', result);
    });
  });

  fayeClient.subscribe('/delete', function(cItemURIs) {
    GLOBAL.info('/delete', cItemURIs);
    indexer.deleteContentItems(cItemURIs.selected, function(err, res) {
      if (err) {
        GLOBAL.error('/delete', err, res);
      } else {
        fayeClient.publish('/deletedItem', {_id: res._id});
      }
    });
  });

  fayeClient.subscribe('/moreLikeThis', function(data) {
    GLOBAL.info('/moreLikeThis', data);
    GLOBAL.config.indexer.moreLikeThis(data.uri, function(err, results) {
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

// requests annotators to annotate. pass plain text or it will be extracted from cItem
exports.requestAnnotate = function(uri, html, text) {
  fayeClient.publish('/requestAnnotate', { uri: uri, html: text, text: utils.getTextFromHtml(html)});
};

