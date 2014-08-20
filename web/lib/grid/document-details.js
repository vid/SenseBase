// ### results.slickgrid
/*jslint browser: true */
/*jslint node: true */
/* global $,Slick */
'use strict';

exports.formatter = function (row, cell, value, columnDef, dataContext) {
  var s ='<b><a href="' + dataContext.uri + '" target=_blank>' + dataContext.title + '</a></b><br/>' + dataContext.uri;
  return s;
};

exports.editor = function(args) {
  var $uri, $title;
  var scope = this;

  this.init = function () {
    var $container = $('<div style="background: white"></div>').appendTo(args.container);

    $title = $('<input style="width: 99%"/></textarea>')
      .appendTo($container)
      .bind('keydown', scope.handleKeyDown);

   $container.append('<br />');

    $uri = $('<input style="width: 99%" type=text />')
      .appendTo($container)
      .bind('keydown', scope.handleKeyDown);

    scope.focus();
  };

  this.handleKeyDown = function (e) {
    if (e.keyCode == $.ui.keyCode.LEFT || e.keyCode == $.ui.keyCode.RIGHT || e.keyCode == $.ui.keyCode.TAB) {
      e.stopImmediatePropagation();
    }
  };

  this.destroy = function () {
    $(args.container).empty();
  };

  this.focus = function () {
    $uri.focus();
  };

  this.serializeValue = function () {
    return {uri: $uri.val(), title: $title.val()};
  };

  this.applyValue = function (item, state) {
    item.uri = state.uri;
    item.title = state.title;
  };

  this.loadValue = function (item) {
    $uri.val(item.uri);
    $title.val(item.title);
  };

  this.isValueChanged = function () {
    return args.item.uri != $uri.val() || args.item.title != $title.val();
  };

  this.validate = function () {
    /*
    if (isNaN(parseInt($uri.val(), 10)) || isNaN(parseInt($title.val(), 10))) {
      return {valid: false, msg: "Please type in valid numbers."};
    }

    if (parseInt($uri.val(), 10) > parseInt($title.val(), 10)) {
      return {valid: false, msg: "'uri' cannot be greater than 'title'"};
    }
    */

    return {valid: true, msg: null};
  };

  this.init();
};
