var utils = require('../lib/utils'), cheerio = require('cheerio');
exports.findPubMedArticle = findPubMedArticle;

/*findPubMedArticle('Lexical patterns, features and knowledge resources for coreference resolution in clinical notes.', function(err, res) {
  console.log(err, res);
});
*/

function findPubMedArticle(title, callback) {
  utils.retrieve('http://www.ncbi.nlm.nih.gov/pubmed/?term=' + title.replace(/ /g, '+'), function(err, contents) {
     var $ = cheerio.load(contents); 
     var absid = $('#absid');
     if (absid) {
       callback(null, $(absid).val());
     } else {
       callback(null, null);
     }

  });
}

