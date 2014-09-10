// reset elasticsearch data and schemas
/*jslint node: true */

'use strict';

var utils = require('./utils.js');

exports.resetAll = resetAll;

function resetAll(callback) {
  var esHost = GLOBAL.config.ESEARCH.server.host, esPort = GLOBAL.config.ESEARCH.server.port;
  // delete all
  var deleteIndex = {
      host: esHost,
      port: esPort,
      path: '/' + GLOBAL.config.ESEARCH._index,
      method: 'DELETE',
  };
  utils.doPostJson(deleteIndex, null, function(err, res) {
    checkError('delete', err, res);
    // create index
    var createIndex = {
        host: esHost,
        port: esPort,
        path: '/' + GLOBAL.config.ESEARCH._index,
        method: 'PUT'
    };
    utils.doPostJson(createIndex, null, function(err, res) {
      checkError('index', err, res);
      // contentItem
      var data = JSON.stringify(contentItemSchema);
      contentItemSchema = {
        host: esHost,
        port: esPort,
        path: '/' + GLOBAL.config.ESEARCH._index + '/contentItem/_mapping',
        method: 'PUT',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': data.length
        }
      };
      utils.doPostJson(contentItemSchema, data, function(err, res) {
        checkError('contentItem', err, res);
        // removedItem
        var removedItemSchema = {
          host: esHost,
          port: esPort,
          path: '/' + GLOBAL.config.ESEARCH._index + '/removedItem/_mapping',
          method: 'PUT',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': data.length
          }
        };
        utils.doPostJson(contentItemSchema, data, function(err, res) {
          checkError('removedItem', err, res);
          callback(err, res);
        });
    });
  });
  function checkError(step, err, res) {
    if (err) {
      GLOBAL.error(step, err);
      callback(err);
    } else {
      GLOBAL.info(step.green, res);
    }
  }

});


var contentItemSchema = {
  contentItem : {
    _id : {
      path : "uri",
      index: "not_analyzed", store : "yes"
    },
    properties : {
      created : {
        type : "date",
        format : "dateOptionalTime"
      },
      uri : {
        type : "string", "index":"not_analyzed", "store" : "yes"
      },
      queued : {
        type : "object",
          properties: {
            "lastAttempt" : {
              type : "date",
              format : "dateOptionalTime"
            }
          }
      },
      annotations : {
        type : "object",
        properties: {
          position : {
            type: "string", index: "not_analyzed", store: "yes"
          },
          flattened : {
            type: "string", index: "not_analyzed", store: "yes"
          },
          key : {
            type: "string", index: "not_analyzed", store: "yes"
          },
          value : {
            type: "string",
            index: "not_analyzed",
            store: "yes"
          },
          category : {
            type: "string",
            index: "not_analyzed",
            store: "yes"
          },
          typed: {
            type: "object",
            properties: {
              type: {
                type: "string",  index:"not_analyzed", store : "yes"
              },
              "Date": {
                type: "date"
              },
              "String": {
                type: "string", index:"not_analyzed", store : "yes"
              }
            }
          }
        }
      },
      annotationSummary : {
        type: "object",
        properties: {
          validated : {
            type: "integer"
          },
          unvalidated : {
            type: "integer"
          },
          erased : {
            type: "integer"
          }
        }
      },
      visitors : {
        type : "object",
          properties : {
            "@timestamp" : {
              type : "date",
              format : "dateOptionalTime"
            },
            member : {
              type : "string", index:"not_analyzed", store : "yes"
            }
          }
        }
      }
    }
  };
}
