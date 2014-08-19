// ### results.slickgrid
/*jslint browser: true */
/*jslint node: true */
/* global $,Slick */
'use strict';

var utils = require('./clientUtils');
$.extend(true, window, { Slick: { Data: { RemoteModel: RemoteModel }}});
var grid;

var columns = [
  {id: "num", name: "#", field: "index", width: 40},
  {id: "uri", name: "Document", width: 520, formatter: storyTitleFormatter, cssClass: "cell-story"},
  {id: "date", name: "Date", field: "create_ts", width: 60, formatter: dateFormatter, sortable: true},
  {id: "annotations", name: "Annotations", field: "annotations", width: 60, sortable: true}
];

var options = {
  editable: true,
  enableAddRow: false,
  enableCellNavigation: false,
  autoHeight: true
};

var loadingIndicator = null;

var loader = new Slick.Data.RemoteModel();

exports.render = function(dest, results) {
  grid = new Slick.Grid(dest, loader.data, columns, options);

  grid.onViewportChanged.subscribe(function (e, args) {
    console.log('onViewportChanged');
    var vp = grid.getViewport();
    loader.ensureData(vp.top, vp.bottom);
  });

  grid.onSort.subscribe(function (e, args) {
    loader.setSort(args.sortCol.field, args.sortAsc ? 1 : -1);
    var vp = grid.getViewport();
    loader.ensureData(vp.top, vp.bottom);
  });

  loader.onDataLoading.subscribe(function () {
    console.log('dataLoading', loader.data);
    if (!loadingIndicator) {
      loadingIndicator = $("<span class='loading-indicator'><label>Buffering...</label></span>").appendTo(document.body);
      var $g = $(dest);

      loadingIndicator
          .css("position", "absolute")
          .css("top", $g.position().top + $g.height() / 2 - loadingIndicator.height() / 2)
          .css("left", $g.position().left + $g.width() / 2 - loadingIndicator.width() / 2);
    }

    loadingIndicator.show();
  });

  loader.onDataLoaded.subscribe(function (e, args) {
    console.log('onDataLoaded', loader.data);
    for (var i = args.from; i <= args.to; i++) {
      grid.invalidateRow(i);
    }

    grid.updateRowCount();
    console.log('G', grid);
    grid.render();

//    loadingIndicator.fadeOut();
  });

  $("#txtSearch").keyup(function (e) {
    if (e.which == 13) {
      loader.setSearch($(this).val());
      var vp = grid.getViewport();
      loader.ensureData(vp.top, vp.bottom);
    }
  });

  loader.setSearch($("#txtSearch").val());
  loader.setSort("create_ts", -1);
  grid.setSortColumn("date", false);

  // load the first page
  grid.onViewportChanged.notify();
};

var storyTitleFormatter = function (row, cell, value, columnDef, dataContext) {
  console.log('HIHIHI');
  var s ="<b><a href='" + dataContext["url"] + "' target=_blank>" +
            dataContext.title + "</a></b><br/>";
  var desc = dataContext.text;
  if (desc) { // on Hackernews many stories don't have a description
      s += desc;
  }
  return s;
};

var dateFormatter = function (row, cell, value, columnDef, dataContext) {
  return 'HI';// (value.getMonth()+1) + "/" + value.getDate() + "/" + value.getFullYear();
};



// Pubsub slickgrid remote model
function RemoteModel() {
  // private
  var PAGESIZE = 50;
  var data = {length: 0};
  var searchstr = "";
  var sortcol = null;
  var sortdir = 1;
  var h_request = null;
  var req = null; // ajax request

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
    for (var key in data) {
      delete data[key];
    }
    data.length = 0;
  }


  function ensureData(from, to) {
    console.log('ensureData', from, to);
    if (req) {
      req.abort();
      for (var i = req.fromPage; i <= req.toPage; i++)
        data[i * PAGESIZE] = undefined;
    }

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

/*
    var url = "http://api.thriftdb.com/api.hnsearch.com/items/_search?filter[fields][type][]=submission&q=" + searchstr + "&start=" + (fromPage * PAGESIZE) + "&limit=" + (((toPage - fromPage) * PAGESIZE) + PAGESIZE);

    if (sortcol != null) {
        url += ("&sortby=" + sortcol + ((sortdir > 0) ? "+asc" : "+desc"));
    }

    if (h_request != null) {
      clearTimeout(h_request);
    }

    h_request = setTimeout(function () {
      for (var i = fromPage; i <= toPage; i++)
        data[i * PAGESIZE] = null; // null indicates a 'requested but not available yet'

      onDataLoading.notify({from: from, to: to});

      req = $.jsonp({
        url: url,
        callbackParameter: "callback",
        cache: true,
        success: onSuccess,
        error: function () {
          onError(fromPage, toPage)
        }
      });
      req.fromPage = fromPage;
      req.toPage = toPage;
    }, 50);
  */
    onSuccess();
//    setTimeout(onSuccess, 500);
  }

  function onError(fromPage, toPage) {
    console.log("error loading pages " + fromPage + " to " + toPage);
  }

  function onSuccess(resp) {
    var from = 0, to = 1000;
    for (var i = 0; i < to; i++) {
      data[from + i] = { index: i, create_ts: new Date(), uri: 'hi'+i};
    }
    console.log('onSuccess', data);
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

    data.length = Math.min(1000,1000); // limitation of the API
    req = null;

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
}

// Slick.Data.RemoteModel
