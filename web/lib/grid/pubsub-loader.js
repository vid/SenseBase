// ### pubsub-loader
/*jslint browser: true */
/*jslint node: true */
/* global $,Slick */
'use strict';

var loader;
var pubsub = require('../../../lib/pubsub-client');
var _ = require('lodash');

exports.init = function() {
  loader = new RemoteModel();
  $.extend(true, window, { Slick: { Data: { RemoteModel: loader }}});
  return loader;
};

// Pubsub slickgrid remote model
function RemoteModel() {
  // private
  var PAGESIZE = 50;
  var data = {length: 0};
  var searchstr = "";
  var sortcol = null;
  var sortdir = 1;

  // events
  var onDataLoading = new Slick.Event();
  var onDataLoaded = new Slick.Event();


  function init() {
  }


  function isDataLoaded(from, to) {
    for (var i = from; i <= to; i++) {
      if (data[i] === undefined || data[i] == null) {
        console.log('failing', from, to, data);
        return false;
      }
    }

    return true;
  }


  function clear() {
    console.log('clear', data.length);
    for (var key in data) {
      delete data[key];
    }
    data.length = 0;
  }


  function ensureData(from, to) {
    console.log('ensureData', from, to);
    if (from < 0) {
      from = 0;
    }

    if (data.length > 0) {
      to = Math.min(to, data.length - 1);
    }

    var fromPage = Math.floor(from / PAGESIZE);
    var toPage = Math.floor(to / PAGESIZE);

    while (data[fromPage * PAGESIZE] !== undefined && fromPage < toPage) { fromPage++; }

    while (data[toPage * PAGESIZE] !== undefined && fromPage < toPage) { toPage--; }

    if (fromPage > toPage || ((fromPage == toPage) && data[fromPage * PAGESIZE] !== undefined)) {
      // TODO:  look-ahead
      onDataLoaded.notify({from: from, to: to});
      return;
    }
    pubsub.queryResults(onSuccess);

    onSuccess();
  }

  function onError(fromPage, toPage) {
    console.log("error loading pages " + fromPage + " to " + toPage);
  }

  function onSuccess(resp) {
    var from = 0, to = 1000, i = 0;
    if (_.isObject(resp) && resp.hits.hits.length > 0) {
      resp.hits.hits.forEach(function(hit) {
        var d = hit._source;
        data[from + i] = { index: i, create_ts: d.timestamp, uri: d.uri, title: d.title, content: d.content};
        i++;
      });
      data.length = Math.min(resp.hits.hits.length, 1000); // limitation of the API
      console.log('RESP', resp, 'data', data);
    } else {
    console.log('no RESP', resp);
//      data = {length: 0};
    }
    /*
    var from = resp.request.start, to = from + resp.results.length;
    data.length = Math.min(parseInt(resp.hits),1000); // limitation of the API

    for (var i = 0; i < resp.results.length; i++) {
      var item = resp.results[i].item;

      // Old IE versions can't parse ISO dates, so change to universally-supported format.
      item.create_ts = item.create_ts.replace(/^(\d+)-(\d+)-(\d+)T(\d+:\d+:\d+)Z$/, "$2/$3/$1 $4 UTC");
      item.create_ts = new Date(item.create_ts);

      data[from + i] = item;
      data[from + i].index = from + i;
    }
    */


    onDataLoaded.notify({from: from, to: to});
  }


  function reloadData(from, to) {
    for (var i = from; i <= to; i++)
      delete data[i];

    ensureData(from, to);
  }


  function setSort(column, dir) {
    sortcol = column;
    sortdir = dir;
    clear();
  }

  function setSearch(str) {
    searchstr = str;
    clear();
  }


  init();

  return {
    // properties
    "data": data,

    // methods
    "clear": clear,
    "isDataLoaded": isDataLoaded,
    "ensureData": ensureData,
    "reloadData": reloadData,
    "setSort": setSort,
    "setSearch": setSearch,

    // events
    "onDataLoading": onDataLoading,
    "onDataLoaded": onDataLoaded
  };

};
