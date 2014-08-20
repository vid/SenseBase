// ### results.grid
/*jslint browser: true */
/*jslint node: true */
/* global $,Slick */
'use strict';

var utils = require('./clientUtils'), details = require('./grid/document-details');
var grid, loadingIndicator = null;

var annotationsFormatter = function(row, cell, value, columnDef, dataContext) {
  return '<div class="ui tiny orange annotations button"><i class="checked tiny checkbox icon"></i> ' +  dataContext.annotations + '</div>';
};

var columns = [
  {id: 'num', name: '#', field: 'index'},
  {id: "document", name: "Document", width: 520, formatter: details.formatter, cssClass: "cell-details", editor: details.editor},
  {id: 'annotations', name: 'Annotations', field: 'annotations', width: 60, sortable: true, formatter: annotationsFormatter}
];

var options = {
  editable: true,
  autoHeight: true,
  enableAddRow: true,
  enableCellNavigation: true,
  autoEdit: true,
  forceFitColumns: true,
  fullWidthRows: true,
  rowHeight: 50
};

var loader = require('./grid/pubsub-loader').init();

exports.render = function(dest, results) {
  $(dest).append('<div id="gridContainer"></div>');
  $(dest).append('<div id="pager"></div>');
  dest = '#gridContainer';
  grid = new Slick.Grid(dest, loader.data, columns, options);
//  grid.setSelectionModel(new Slick.CellSelectionModel());

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

  grid.onClick.subscribe(function(e, args) {
    var item = grid.getDataItem(args.row);
    console.log('item', item);
  }

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
    grid.render();

    //loadingIndicator.fadeOut();
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
