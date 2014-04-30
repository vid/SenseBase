// http actions (express)

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
app.use('/lib', express.static(__dirname + '/../bower_components'));
app.use('/files', express.static(__dirname + '/../' + GLOBAL.config.uploadDirectory));

app.use('/__wm', express.static(__dirname + '/../static/__wm'));

app.all('/__wm/*', function(req, res, next) {
    if (req.user) {
  //console.log('USER', req.user);
      next();
    } else {
      res.redirect('/login'); 
    }
  });
  
app.get('/', function(req, res){
  if (req.user) {
    res.cookie('psMember', req.user.username, { maxAge: 900000 });
    res.cookie('psSession', req.user.id + '/' + new Date().getTime(), { maxAge: 900000 });
     
    res.redirect('/__wm/index.html');
  } else {
    res.render('login', { user: req.user, message: req.flash('error') });
  }
});

// used by client for identity
app.get('/member.js', function(req, res) {
  res.render('memberjs', { user: req.user, collab: GLOBAL.config.collab, logo: GLOBAL.config.logo, homepage: GLOBAL.config.homepage });
});

app.get('/login', function(req, res){
  res.render('login', { user: req.user, message: req.flash('error') });
});

app.post('/login', 
  passport.authenticate('local', { failureRedirect: '/login', failureFlash: true }),
  function(req, res) {
    GLOBAL.authed[req.ip] = req.user;
    res.redirect(GLOBAL.config.HOMEPAGE);
  });
  
// FIXME don't allow displaying stale last page
app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
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