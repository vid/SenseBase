// site related search queries

var utils = require('../lib/utils'), cheerio = require('cheerio');
exports.findPubMedArticle = findPubMedArticle;

/*findPubMedArticle('Lexical patterns, features and knowledge resources for coreference resolution in clinical notes.', function(err, res) {
  console.log(err, res);
});
*/

function findPubMedArticle(title, callback) {
  var uri = 'http://www.ncbi.nlm.nih.gov/pubmed/?term=' + title.replace(/ /g, '+');
  utils.retrieve(uri, function(err, contents) {
     var $ = cheerio.load(contents); 
     var absid = $('#absid');
     if (absid) {
       var id = $(absid).val();
       callback(null, id, 'http://www.ncbi.nlm.nih.gov/pubmed/' + id);
     } else {
       callback(null, null);
     }

  });
}

