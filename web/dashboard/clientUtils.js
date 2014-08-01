// ### clientUtils

var encIDs = [];

// Maximum length of display label
var ULEN = 70;

// encode a string (URI) for an ID
exports.encID = function(c) {
  return 'enc' + (encIDs.indexOf(c) > -1 ? encIDs.indexOf(c) : encIDs.push(c) - 1);
};

exports.deEncID = function(c) {
  return encIDs[c.replace('enc', '')];
};

exports.shortenURI = function(u) {
  return (!u || u.length < ULEN) ? u : (u.substring(0, ULEN - 3) + '…' + u.substring(u.length - 3));
};
