// # Subscription lib

var _ = require('lodash');
exports.matches = function(cItem, subscriptions) {
  var found = [];
  subscriptions.forEach(function(sub) {
    var type = sub.match.substr(0, sub.match.indexOf(':')), match = sub.match.substr(sub.match.indexOf(':') + 1);
    if (type === 'annotation') {
      if (_.where(cItem.annotations, { flattened: match }).length > 0) { found.push(sub); }
    } else if (type === 'uri') {
      if(cItem.uri === match) { found.push(sub); }
    }
  });
  return found;
};
