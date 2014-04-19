// reset elasticsearch data and schemas

var utils = require('./utils.js');

exports.resetAll = resetAll;

function resetAll(callback) {
  var esHost = GLOBAL.config.ESEARCH.server.host, esPort = GLOBAL.config.ESEARCH.server.port;
  // delete all
  var options = {
      host: esHost,
      port: esPort,
      path: '/' + GLOBAL.config.ESEARCH._index,
      method: 'DELETE',
  };
  utils.doPostJson(options, null, function(err, res) {
    checkError('delete', err, res);
    // create index
    var options = {
        host: esHost,
        port: esPort,
        path: '/' + GLOBAL.config.ESEARCH._index,
        method: 'PUT'
    };
    utils.doPostJson(options, null, function(err, res) {
      checkError('index', err, res);
      // contentItem
      var data = JSON.stringify(contentItemSchema);
      options = {
        host: esHost,
        port: esPort,
        path: '/' + GLOBAL.config.ESEARCH._index + '/contentItem/_mapping',
        method: 'PUT',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': data.length
        }
      };
      utils.doPostJson(options, data, function(err, res) {
        checkError('contentItem', err, res);
        // removedItem
        options = {
          host: esHost,
          port: esPort,
          path: '/' + GLOBAL.config.ESEARCH._index + '/removedItem/_mapping',
          method: 'PUT',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': data.length
          }
        };
        utils.doPostJson(options, data, function(err, res) {
          checkError('removedItem', err, res);
          // annotation
          var data = JSON.stringify(annotationSchema);
          options = {
            host: esHost,
            port: esPort,
            path: '/' + GLOBAL.config.ESEARCH._index + '/annotation/_mapping',
            method: 'PUT',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Content-Length': data.length
            }
          };
          utils.doPostJson(options, data, function(err, res) {
            checkError('annotation', err, res);
            GLOBAL.info('schemas reset'.green);
            if (callback) { callback(null, true); }
          });
        });
    });
  });
  function checkError(step, err, res) {
    if (err) {
      GLOBAL.error(step, err);
      if (callback) {
        callback(err);
      } else {
        throw(err);
      }
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
      timestamp : {
        type : "date",
        format : "dateOptionalTime"
      },
      uri : {
        type : "string", "index":"not_analyzed", "store" : "yes"
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
};

var annotationSchema = {
  annotation : {
    _parent:{
      type : "contentItem"
    },
    properties : {
      value : {
        type : "string", index:"not_analyzed", store : "yes"
      }
    }
  }
};

