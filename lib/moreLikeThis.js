// query used for moreLikeThis

module.exports = {
  fields : ['_id', 'uri', '@timestamp', 'title', 'visitors', 'annotations', 'accessors'],
  size: 500,
  sort : [
    { "_score" : {"order" : "desc"}},
  ],

  "query": {
    "bool": {
      "must": {
        "match_all": {
          "boost": 1
        }
      },
      "should": [
        {
          "mlt_field": {
            "content": {
              "like_text": "Data corruption is the all-too-common problem of words that are garbled into strings of question marks, black diamonds, or random glyphs",
              "boost": 1,
              "min_doc_freq": 0,
              "min_word_len": 0,
              "min_term_freq": 0
            }
          }
        },
        {
          "mlt_field": {
            "title": {
              "like_text": "LingPipe",
              "boost": 3,
              "min_doc_freq": 0,
              "min_word_len": 0,
              "min_term_freq": 0
            }
          }
        }
      ],
      "minimum_number_should_match": 1
    }
  }
};
