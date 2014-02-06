var enclosure = '#psContent';
$(enclosure).mousedown(function() {
  menu = true;
});
$(enclosure).mouseup(function() {
  menu = false;
  var text=getSelectedText();
  if (text!='') {
    annotate(text);
    assertHover();
  }
});
  
function getSelectedText() {
    if (window.getSelection) {
        return window.getSelection().toString();
    } else if (document.selection) {
        return document.selection.createRange().text;
    }
    return '';
}

function assertHover() {
  $('.psTag').mouseenter(function(){
    if (!menu) {
      $(this).append($('#message').clone());
      $(this).find('.message').css({'top':event.pageY - 10,'left':event.pageX, display: 'inline'});
      menu = true;
    }
  });
  $('.psTag').mouseleave(function(){
    $(this).find('.message').remove();
    menu = false;
  });
}

var menu = false;

/**

maybe store the last right position in the close span

**/

function annotate(toFind) {
  a = $(enclosure).html().toString();
  found = a.lastIndexOf(toFind);
  var k = 0;
  while (found > -1 && k++ < 1e5) { 
    var inTag = false, lt, lt = a.lastIndexOf('<', found);

    if (lt > -1) {
      var gt = a.lastIndexOf('>', found);
      if (lt > gt) {
        inTag = true;
      }
    }

    console.log(toFind, 'found', found, inTag, lt, gt);
    if (!inTag) {
      var tag = '<span class="psTag">' + toFind + '</span>';
      a = a.substring(0, found) + tag + a.substring(found + toFind.length);
      found = a.lastIndexOf(toFind, found);
    } else {
      found = a.lastIndexOf(toFind, found - 1);
    }
  } 
  $(enclosure).html(a);
}
