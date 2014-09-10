// ### tree-interface
//
// General module for SenseBase browser client.
/* jslint browser: true */
/* jslint node: true */
/* global $,setupDND */

var context, lastAnno;
var lastAnno = lastAnno;

exports.init = function(ctx) {
  context = ctx;
};

exports.hover = function(anno) {};
exports.select = function(anno, e, data) {
  // selected an annotation
  if (anno) {
    lastAnno = anno;
    $('.subscribe.annotation').removeClass('disabled');
    console.log(anno);
    $('#annoType option:contains(anno.type)').prop('selected', true);
    // for now categories only
    $('#annoValue').val(anno.text);
    $('#annoBy').val(anno.annotatedBy);
    $('#annotatedAt').html(anno.annotatedAt || '&nbsp;');
    $('.filter.icon').click(function() {
//      console.log(anno, 'filtering on', this);
      if ($(this).hasClass('by')) {
        $('.query.member').val('"' + anno.annotatedBy + '"');
        $('.query.annotation.state').val('provided');
      } else {
        context.queryLib.addAnnotationTag(anno.text);
      }
      context.queryLib.submitQuery();
    });

    // set state buttons accordingly
    $('.annotation.button').removeClass('disabled');
    if (anno.state === 'erased') {
      $('.erase.annotation').addClass('disabled');
    } else if (anno.state === 'validated') {
      $('.validate.button').addClass('disabled');
    } else {
      $('.unvalidate.button').addClass('disabled');
    }
    var annoFunctions = { anno: anno, select: function() { console.log(anno); } };
    $('.annotation.button').click(annoFunctions.select);
  } else {
    $('.subscribe.annotation').addClass('disabled');
    lastAnno = null;
  }
  // it has children
  if (data.node.children.length < 1) {
    $('.annotation.children').hide();
  } else {
    $('.annotation.children').show();
    $('.annotation.children .count').html(data.node.children.length);
  }
};
