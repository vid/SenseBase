var newLinks = [];

var subChat = fayeClient.subscribe('/collab', function(message) {
  console.log('collab', message);
});

var subLink = fayeClient.subscribe('/link', function(message) {
	if (!newLinks[message.link]) {
		console.log("+", message.link);
		newLinks[message.link] = message.sessionID;
	} else {
		console.log ("=", message.link);
	}
});

var saveScrapeSub = fayeClient.subscribe('/saveScrape', function(message) {
  console.log('saveScrape', message);
  indexer.saveScrape(message);
  setTimeout(sendScrapes, 3000);
});

var scrapesSub = fayeClient.subscribe('/savedScrapes', function(message) {
  console.log('savedScrapes', message);
  sendScrapes();
});

function sendScrapes(message) {
  indexer.scrapeSearch(message, function(err, results) {
    console.log('sendScrapes', err, results.hits.hits.length);
    fayeClient.publish('/scrapesResults', results);
  })
}

var subMessage = fayeClient.subscribe('/threadMessage', function(message) {
  console.log('message', message);
});

var subMember = fayeClient.subscribe('/threadMember', function(message) {
  console.log('member', message);
});

var subWorkers = fayeClient.subscribe('/workers', function(message) {
  console.log('workers', message);
});
