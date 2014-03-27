// faye stuf

var indexer = require('../lib/indexer');
var utils = require('../lib/utils');
var faye = require('faye');
var bayeux = new faye.NodeAdapter({mount: '/montr', timeout: 45});
var fayeClient = new faye.Client(GLOBAL.config.FAYEHOST);
var annotations = require('./annotations.js'), contentExtractor = require('./contentExtractor');

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
    fs.writeFileSync('versions/local-users.' + new Date().getTime() + '.json', JSON.stringify({ logins : GLOBAL.config.users}, null, 2));
    if (istep) { istep(); }
    fs.writeFileSync('local-users.json', JSON.stringify({ logins : GLOBAL.config.users}, null, 2));
  }

// annotations

// annotations for an individual uri
  fayeClient.subscribe('/annotate', function(data) {
    GLOBAL.info('/annotate', data);
    // FIXME deal with anchors
    indexer.retrieveAnnotations(data.uri.replace(/#.*$/, ''), function(err, results) {
      if (err) {
        GLOBAL.error('/annotate error' + err);
      } else {
        fayeClient.publish('/annotations', { uri: data.uri, annotations: results.hits.hits.map(function(h) { return h._source;})});
      }
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

  // update content of existing item by uri
  fayeClient.subscribe('/updateContent', function(data) {
    GLOBAL.info('/updateContent', data.uri);
    indexer.resetAnnotations({ target: data.uri }, function(err, res) {
      indexer.updateContent(data.uri, data.content, function(err, result) {
        if (err) {
          GLOBAL.error('error', err);
        } else {
          console.log('requestAnnotate', data.uri, data.content.length);
          requestAnnotate(data.uri, data.content);
        }
      });
    });
  });


  // retrieve an existing content item by uri
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

  // updates clients with a content item
  exports.updateItem = function(cItem) {
    fayeClient.publish('/updateItem', cItem);
  };

  // requests annotators to annotate. pass plain text or it will be extracted from cItem
  
  function requestAnnotate(uri, html) {
    contentExtractor.extractContent(uri, html, function(uri, html, selector, content) {
      console.log('selector', selector, content.length);
      fayeClient.publish('/requestAnnotate', { uri: uri, html: content, selector: selector, text: utils.getTextFromHtml(content)});
    });
  };

  exports.requestAnnotate = requestAnnotate;

  // scraping functions

  var scrapeLinks = {};
  var seenLinks = {};
  var saveResult = function(err, res) { if (err) { GLOBAL.error('scrape anno failed', err); } else { GLOBAL.info('saved anno', res); }} ;

// process incoming links
  fayeClient.subscribe('/links', function(site) {
    GLOBAL.info('/links', site, Object.keys(scrapeLinks).length);
    var scraped = site.scraped, links = site.links || [], tags = site.tags || 'scraped-no-tag', scraper = site.scraper, validated = false;

    if (scraped) {
// annotate and remove scraped link
      (function(pscrapeLinks, pscraped) {
        for (var i in pscrapeLinks) {
          var scrape = pscrapeLinks[i];
          if (scrape.link.replace(/\/$/, '') === pscraped.replace(/\/$/, '')) {
            tags = scrape.tags;
            seenLinks[scrape.link] = new Date().getTime();
            validated = true;
            delete scrapeLinks[i];
            break;
          }
        }
        var anno = annotations.createAnnotation({hasTarget: pscraped, type: 'category', category: tags, validated: validated, annotatedBy: scraper});
        indexer.saveAnnotations(pscraped, [anno], saveResult);
      }(scrapeLinks, scraped)); 
    }

// add incoming links
    links.forEach(function(link) {
      if (link && !seenLinks[link]) {
        scrapeLinks[link] = { link : link, tags: tags, scraper: scraper };
      }
    });

// send out a new link if available
    if (Object.keys(scrapeLinks).length) {
      var sendScrape = scrapeLinks[Object.keys(scrapeLinks)[0]];
      if (sendScrape) {
        GLOBAL.info('pushing scrape', sendScrape);
        fayeClient.publish('/scrape', { site: sendScrape });
        // bump it to the end
        scrapeLinks[sendScrape.link] = sendScrape;
      }
    }
  });

/*  GLOBAL.send({ text: 'register'}, 'workers'); */
};

