// Main service http actions (express).
/*jslint node: true */

'use strict';

// Must be required before app is instantiated.
require('express-namespace');
var loplate = require('./lodash-render');

var express = require('express'), passport = require('passport'),
  flash = require('connect-flash'),
  LocalStrategy = require('passport-local').Strategy,
  app = module.exports = express();
  app.engine('html', loplate.renderFile);
  app.engine('js', loplate.renderFile);
  app.set('view engine', 'html');
  app.set('views', __dirname + '/../web/site');

var fileImport = require('./file-import.js'), contentLib = require('./content.js'), utils = require('./utils'), auth = require('./auth');

var fs = require('fs');

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  auth.findById(id, function (err, user) {
    done(err, user);
  });
});

passport.use(new LocalStrategy(
  function(username, password, done) {
    auth.findByUsername(username, function(err, user) {
      if (err) { return done(err); }
      if (!user) { return done(null, false, { message: 'Unknown user ' + username }); }
      if (user.password !== password) { return done(null, false, { message: 'Invalid password' }); }
      if (!user.active) { return done(null, false, { message: 'Account not active' }); }
      return done(null, user);
    });
  }
));

app.use(passport.initialize());
app.use(passport.session());

var namespace = GLOBAL.config.namespace, main = namespace + '/';

app.use(namespace + '/fonts', express.static(__dirname + '/../bower_components/semantic-ui/npm/fonts/'));
app.use(namespace + '/files', express.static(__dirname + '/../' + GLOBAL.config.uploadDirectory));
app.use(namespace + '/', express.static(__dirname + '/../web/static'));
app.use(namespace + '/__wm/', express.static(__dirname + '/../web/static'));

app.namespace(namespace, function() {
  app.get('/login', function(req, res){
    res.render('login', { banner: GLOBAL.config.banner, user: req.user, message: req.flash('error') });
  });

  app.post('login',
    passport.authenticate('local', { failureRedirect: namespace + '/login', failureFlash: true }),
    function(req, res) {
      auth.addAuthenticated(req.ip, req.user);
      res.redirect(main);
    });

  app.get('/', function(req, res){
    if (req.user) {
      res.sendFile('/web/static/index.html');
    } else {
      res.render('login', { banner: GLOBAL.config.banner, user: req.user, message: req.flash('error') });
    }
  });

  // used by client for identity
  app.get('/member.js', function(req, res) {
    res.set('Content-Type', 'application/javascript');
    res.send(auth.memberJS(req.user ? req.user : null));
  });

  app.get('/iframe.html', function(req, res) {
    res.set('Content-Type', 'text/html');
    res.render('iframe.html', { homepage: GLOBAL.config.HOMEPAGE });
  });

  app.get('/content/:page(*)', function(req, res) {
    if (req.user) {
      GLOBAL.svc.indexer.retrieveByURI(req.params.page, function(err, cItem) {
        if (err) {
          res.send("Not found " + req.params.page);
        } else {
          res.send('<pre>'+cItem._source.text+'</pre>');
        }
      });
    }
  });
  app.get('/cached/:page(*)', function(req, res) {
    if (req.user) {
      GLOBAL.svc.indexer.retrieveByURI(req.params.page, function(err, cItem) {
        if (err) {
          res.send("Not found " + req.params.page);
        } else {
          res.send(cItem._source.content);
        }
      });
    }
  });


  // FIXME don't allow displaying stale last page
  app.get('/logout', function(req, res){
    req.logout();
    res.redirect(namespace + '/login');
  });

  app.post('/upload', function(req, res) {
    // multiple callbacks
    var uploadedFiles = req.files.file;
    if (!Array.isArray(uploadedFiles)) {
      uploadedFiles = [uploadedFiles];
    }
    var callback = function(err, res, cItem) {
      if (err) {
       GLOBAL.error('/upload', err);
       } else {
         console.log('uploaded', res.fileName, cItem.uri, cItem.content.length);
       }
    };
    fileImport.indexFiles(uploadedFiles, req.user.username, callback, function(tmpPath) {
      fs.unlink(tmpPath, function(err) {
        if (err) throw err;
      });
    });
    res.end();
  });

  app.use(function(err, req, res, next){
    console.error(err.stack);
    res.send(500, 'App error' + JSON.stringify(err, null, 2));
  });
});
