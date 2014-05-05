// http actions (express)

// must be before app is instantiated
require('express-namespace');
var express = require('express'), passport = require('passport'),
  flash = require('connect-flash'),
  LocalStrategy = require('passport-local').Strategy,
  app = module.exports = express();

var fileUpload = require('./file-upload.js');

var users = GLOBAL.config.users;

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  findById(id, function (err, user) {
    done(err, user);
  });
});

passport.use(new LocalStrategy(
  function(username, password, done) {
    findByUsername(username, function(err, user) {
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

var namespace = GLOBAL.config.namespace, main = namespace + '/__wm/index.html';
console.log('NAM', namespace);

app.use(namespace + '/lib', express.static(__dirname + '/../bower_components'));
app.use(namespace + '/files', express.static(__dirname + '/../' + GLOBAL.config.uploadDirectory));
app.use(namespace + '/__wm', express.static(__dirname + '/../static/__wm'));

app.namespace(namespace, function() {
  app.get('/__wm/*', function(req, res, next) {
      if (req.user) {
        next();
      } else {
        res.redirect(namespace + '/login'); 
      }
    });
    
  app.get('/', function(req, res){
    if (req.user) {
      res.cookie('psMember', req.user.username, { maxAge: 900000 });
      res.cookie('psSession', req.user.id + '/' + new Date().getTime(), { maxAge: 900000 });
       
      res.redirect(main);
    } else {
      res.render('login', { user: req.user, message: req.flash('error') });
    }
  });

  // used by client for identity
  app.get('/member.js', function(req, res) {
    res.render('memberjs', { user: req.user, collab: GLOBAL.config.collab, logo: GLOBAL.config.logo, homepage: GLOBAL.config.homepage });
  });

  app.get('/cached/:page', function(req, res) {
    if (req.user) {
      GLOBAL.config.indexer.retrieveByURI(req.params.page, function(err, cItem) {
        if (err) {
          res.send("Not found " + req.params.page);
        } else {
          res.send(cItem._source.content);
        }
      });
    }
  });

  app.get('/login', function(req, res){
    res.render('login', { user: req.user, message: req.flash('error') });
  });

  app.post('login', 
    passport.authenticate('local', { failureRedirect: 'login', failureFlash: true }),
    function(req, res) {
      GLOBAL.authed[req.ip] = req.user;
      res.redirect(main);
    });
    
  // FIXME don't allow displaying stale last page
  app.get('/logout', function(req, res){
    req.logout();
    res.redirect(namespace + '/logout');
  });

  app.post('/upload', function(req, res) {
    fileUpload.uploadFile(req, function(err, resp) {
      if (err) {
       GLOBAL.error('/upload', err);
      } else {
        var content = resp.buffer || utils.NOCONTENT, uri = GLOBAL.config.HOMEPAGE + '/files/' + resp.fileName;
        GLOBAL.config.indexer.saveContentItem({ uri: uri, isHTML: true, title: resp.title, member: req.user.username, content: content}, function(err, res, cItem) {
          console.log('uploaded', resp.fileName, cItem);
          GLOBAL.config.pubsub.updateItem(cItem);
          GLOBAL.config.pubsub.requestAnnotate(uri, content);
        });
      }
    });
    res.end();
  });

  app.use(function(err, req, res, next){
    console.error(err.stack);
    res.send(500, 'Something broke!');
  });
});

// Passport utilities
function findById(id, fn) {
  var found = null;
  users.forEach(function(u) {
    if (u.id == id) {
      found = u;
    }
  });
  if (found) {
    fn(null, found);
  } else {
    fn(new Error('User ' + id + ' does not exist'));
  }
}

function findByUsername(username, fn) {
  for (var i = 0, len = users.length; i < len; i++) {
    var user = users[i];
    if (user.username === username) {
      return fn(null, user);
    }
  }
  return fn(null, null);
}
