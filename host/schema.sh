#!/bin/bash

if [ $# -eq 0 ]; then echo "usage: $0 <indexname>"; exit 1; fi

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
      "timestamp" : {
        "type" : "date",
        "format" : "dateOptionalTime"
      },
      "uri" : {
        "type" : "string", "index":"not_analyzed", "store" : "yes"
      }
    }
  }
}'

curl -XPUT "http://localhost:9200/$1/annotation/_mapping" -d '
{
  "annotation" : {
    "_parent":{
      "type" : "contentItem"
    },
    "properties" : {
      "flatCategory" : {
        "type" : "string", "index":"not_analyzed", "store" : "yes"
      }
    }
  }
}'

curl -XPUT "http://localhost:9200/$1/removedItem/_mapping" -d '
{
  "removedItem" : {
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

