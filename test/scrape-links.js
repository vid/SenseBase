// test scraper functions

var fs = require('fs'), expect = require('expect.js');
var scraper = require('../lib/scraper.js');
GLOBAL.config = require('./test-config').config;

describe('Scraper links', function(done) {
  var sites = [
  // bing doesn't force https (for proxy op)
    {bing : 'http://www.bing.com/search?q=bing'}, 
    {clinicaltrials: 'http://www.clinicaltrials.gov/ct2/results?term=trials&Search=Search'}, 
    {'evidence-bmj': 'http://search.clinicalevidence.bmj.com/s/search.html?query=bmj&x=0&y=0&collection=bmj-clinical-evidence&profile=_default&form=simple'}, 
    {'evidence-nhs': 'http://www.evidence.nhs.uk/search?q=evidence'}, 
    {'google-scholar': 'http://scholar.google.ca/scholar?q=scholar&btnG=&hl=en&as_sdt=0%2C5'}, 
    {pubmed:'http://www.ncbi.nlm.nih.gov/pubmed/?term=pubmed'}, 
    {trip:'http://www.tripdatabase.com/search?categoryid=27&sa=true&criteria=trip'},
    {'yahoo-answers': 'https://answers.yahoo.com/search/search_result?fr=uh3_answers_vert_gs&type=2button&p=yahoo'},
    { 'patient.co.uk' : 'http://www.patient.co.uk/search.asp?searchterm=ferritin&searchcoll=Discuss_Forums&x=10&y=14'}
  ];
  sites.forEach(function(site) {
    var name = Object.keys(site)[0], uri = site[name];
    it('should find ' + name + ' nav and results', function() {
      var content = fs.readFileSync('./data/search-results/' + name + '.html');
      var allLinks = [], links = scraper.getRecognizedLinks({ uri: uri, content: content.toString()});
      ['navLinks', 'resultLinks'].forEach(function(type) {
        if (links[type]) {
          expect(links[type].length > 0).to.be(true);
          links[type].forEach(function(l) {
            allLinks.push(l);
            expect((l.indexOf('http://') === 0) || (l.indexOf('https://') === 0)).to.be(true);
          });
        }
      });
      expect(allLinks.size > 0).to.be.true;
    });
  });
});

