// # reset
//reset elasticsearch data and schemas
/*jslint node: true */

'use strict';

var _ = require('lodash');
var utils = require('./utils.js');

exports.resetAll = resetAll;
var callback, curStep, stepDefs, steps;

function resetAll(cb) {
  callback = cb;

  var baseOptions = {
      host: GLOBAL.config.ESEARCH.server.host,
      port: GLOBAL.config.ESEARCH.server.port
  };

  var contentItemSchema = JSON.stringify({
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
    }
  );
  stepDefs = {
    delIndex : _.extend(baseOptions,
      {
        path: '/' + GLOBAL.config.ESEARCH._index,
        method: 'DELETE'
      }
    ),
    createIndex : _.extend(baseOptions,
      {
      path: '/' + GLOBAL.config.ESEARCH._index,
        method: 'PUT'
      }
    ),
    createContentItems : _.extend(baseOptions,
      {
        path: '/' + GLOBAL.config.ESEARCH._index + '/contentItem/_mapping',
        method: 'PUT',
        data: contentItemSchema,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': contentItemSchema.length
        }
      }
    )
  };
  stepDefs.createRemovedItems = _.extend(stepDefs.createContentItems,
    {
      path: '/' + GLOBAL.config.ESEARCH._index + '/removedItem/_mapping'
    }
  );
  stepDefs.createHistoryItems = _.extend(stepDefs.createContentItems,
    {
      path: '/' + GLOBAL.config.ESEARCH._index + '/historyItem/_mapping'
    }
  );
  // this depends on de facto keys returned in insert order
  steps = Object.keys(stepDefs);

  step();
}

// check for an error, if none do the next step, if none callback
function step(err, res) {
  if (err) {
    console.log('failing on', curStep, err);
    console.trace();
    callback(err);
    return;
  }
  var nextStep = steps.shift();
  if (nextStep) {
    curStep = stepDefs[nextStep];
  console.log('\n******', nextStep, 'err', err, 'res', res);
    var data = curStep.data;
    utils.doPostJson(curStep, data, step);
  } else {
    callback(err, res);
  }
}
