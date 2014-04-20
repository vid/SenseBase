// test scraper functions

var fs = require('fs'), expect = require('expect.js');
var scraper = require('../lib/scraper.js');

describe('Scraper links', function(done) {
  var sites = [
    {bing : 'http://www.bing.com/search?q=bing'}, 
    {clinicaltrials: 'http://www.clinicaltrials.gov/ct2/results?term=trials&Search=Search'}, 
    {'evidence-bmj': 'http://search.clinicalevidence.bmj.com/s/search.html?query=bmj&x=0&y=0&collection=bmj-clinical-evidence&profile=_default&form=simple'}, 
    {'evidence-nhs': 'http://www.evidence.nhs.uk/search?q=evidence'}, 
    {'google-scholar': 'http://scholar.google.ca/scholar?q=scholar&btnG=&hl=en&as_sdt=0%2C5'}, 
    {pubmed:'http://www.ncbi.nlm.nih.gov/pubmed/?term=pubmed'}, 
    {trip:'http://www.tripdatabase.com/search?categoryid=27&sa=true&criteria=trip'} 
  ];
  sites.forEach(function(site) {
    var name = Object.keys(site)[0], uri = site[name];
    it('should find ' + name + ' nav and results', function() {
      var content = fs.readFileSync('./data/search-results/' + name + '.html');
      var links = scraper.getRecognizedLinks({ uri: uri, content: content.toString()});
      ['navLinks', 'resultLinks'].forEach(function(type) {
        if (links[type]) {
          expect(links[type].length > 0).to.be(true);
          links[type].forEach(function(l) {
            expect((l.indexOf('http://') === 0) || (l.indexOf('https://') === 0)).to.be(true);
          });
        }
      });
    });
  });
});

//
