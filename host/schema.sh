#!/bin/bash

if [ "e$1" == "e" ]; then echo "usage: $0 <indexname>"; exit 1; fi

curl -XDELETE http://localhost:9200/$1/
curl -XPUT http://localhost:9200/$1/
curl -XPUT "http://localhost:9200/$1/contentItem/_mapping" -d '
{
  "contentItem" : {
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

curl -XGET http://localhost:9200/$1/_mapping?pretty=true
