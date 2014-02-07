
var fs = require('fs'), 
  http = require('http'),
  flash = require('connect-flash'),
  express = require('express'),
  passport = require('passport'),
  util = require('util'),
  LocalStrategy = require('passport-local').Strategy;
  
var fileUpload = require('./lib/file-upload.js');

GLOBAL.authed = GLOBAL.authed || {}; //FIXME  use auth scheme that works behind proxies
var users = require('./users.json').logins;

exports.start = start;

function start(config) {
  config.users = users;
  config.indexer = require('./lib/indexer.js');
  config.pageCache = require('./lib/pageCache.js');
  config.prefrontal = require('./lib/auth.js');
  config.consolidate = { 
    process: function(uri, referer, is_html, pageBuffer, contentType, saveHeaders, browser_request) {
      var status = browser_request.proxy_received.statusCode;
      if (status != 200) {
        return;
      }
      // only index HTML with title
      var m = /<title>(.*)<\/title>/mi.exec(pageBuffer);
      if (m && m[1]) {
        var title = m[1].replace(/<.*?>/g);
        var psMember = browser_request.psMember.username;
        GLOBAL.config.pageCache.cache(uri, referer, is_html, pageBuffer, contentType, saveHeaders, browser_request);
        GLOBAL.config.indexer.indexPage({
          uri: uri, title: title, member: psMember, referer: referer, isHTML: browser_request.is_html, contents: pageBuffer, contentType: contentType, headers: saveHeaders});
      }
    }
  }
  // globally shared context
  GLOBAL.config = config;

// Passport stuff
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
    // asynchronous verification
    process.nextTick(function () {
      findByUsername(username, function(err, user) {
        if (err) { return done(err); }
        if (!user) { return done(null, false, { message: 'Unknown user ' + username }); }
        if (user.password != password) { return done(null, false, { message: 'Invalid password' }); }
        if (!user.active) { return done(null, false, { message: 'Account not active' }); }
        return done(null, user);
      });
    });
  }
));

// Express stuff
var app = express();

app.configure(function() {
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  app.use(express.cookieParser());
  app.use(express.logger({stream: GLOBAL.config.logStream}));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.session({ secret: 'popsicle-fish' }));
  // Initialize Passport!  Also use passport.session() middleware, to support persistent login sessions (recommended).
  app.use(flash());
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(app.router);
  app.use(express.static('static'));
  app.use(require('connect-livereload')()); // FIXME
  app.enable('trust proxy');
});

app.all('/__wm/*', function(req, res, next) {
  if (req.user) {
//console.log('USER', req.user);
    next();
  } else {
    res.redirect("/login"); 
  }
});

app.get('/', function(req, res){
console.log('OO', req.session.user);
  if (req.user) {
    res.cookie('psMember', req.user.username, { maxAge: 900000 });
    res.cookie('psSession', req.user.id + '/' + new Date().getTime(), { maxAge: 900000 });
     
    res.redirect('/__wm/index.html');
//    res.render('index', { user: req.user.username });
  } else {
    res.render('login', { user: req.user, message: req.flash('error') });
  }
});

// used by client for identity
app.get('/member.js', function(req, res){
  res.render('memberjs', { user: req.user });
});

app.get('/login', function(req, res){
  res.render('login', { user: req.user, message: req.flash('error') });
});

app.post('/login', 
  passport.authenticate('local', { failureRedirect: '/login', failureFlash: true }),
  function(req, res) {
    GLOBAL.authed[req.ip] = req.user;
    console.log('OOOOOOO', req.ip, GLOBAL.authed);
    var oreq = req.headers['original-request'] || '/';
    if (oreq == 'undefined') { oreq = '/'; }
    res.redirect(GLOBAL.config.HOMEPAGE);
  });
  
app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});

app.post('/upload', function(req, res) {
  fileUpload.uploadFile(req, function(err, resp) {
  console.log('GOGO', err, resp);
    GLOBAL.config.indexer.indexPage({
    uri: GLOBAL.config.HOMEPAGE + '/files/' + resp.fileName, isHTML: true, title: resp.title, member: req.user.username, content: resp.buffer, 
      callback: function(err, res) {
        console.log('okiokok');
      }
    });
  });
});

var server = app.listen(9999);

var pubsub = require('./lib/pubsub.js');
pubsub.start(server);

var filterProxy = require('filter-proxy');

filterProxy.start(GLOBAL.config); 

// interactive command line

repl = require("repl");
r = repl.start({ prompt: GLOBAL.config.project + "> ", useGlobal: true});
}
