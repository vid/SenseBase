curl -XDELETE http://localhost:9200/ps/
curl -XPUT http://localhost:9200/ps/
curl -XPUT 'http://localhost:9200/ps/annotationItem/_mapping' -d '
{
  "annotationItem" : {
      "_id" : {
        "path" : "uri",
        "index": "not_analyzed", "store" : "yes"
      },
    "properties" : {
      "@timestamp" : {
        "type" : "date",
        "format" : "dateOptionalTime"
      },
      "uri" : {
        "type" : "string", "index":"not_analyzed", "store" : "yes"
      }
    }
  }
}'

curl -XGET http://localhost:9200/ps/_mapping?pretty=true
