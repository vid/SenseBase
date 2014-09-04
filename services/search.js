// service that periodically checks for and requests queued content
/*jslint node: true */
'use strict';

require('../index.js').setup();

var search = require('../lib/search.js');

// watch for new links every 2 seconds
setInterval(function() { search.getQueuedLink(search.getLinkContents); }, 2000);
