function createDiv() { 
  if (!parent.document.getElementById('sbIframe')) {
    console.log('injecting SenseBase iframe');
    document.body.innerHTML += '<style>.sbShort { height: 10%; }\n.sbAnnotationBlink { background: yellow !important; }\n.sbAnnotation { background: lightblue; }\n.sbEnclosure { border: 1px solid lightblue; padding: 0px; margin: 0px;}</style><div id="sbIframe" style="z-index: 999; position: fixed; right: 1em; top: 0; height: 90%; color: black; background: #ffe; filter:alpha(opacity=90); opacity:0.9; border: 0"><iframe style="width: 100%; height: 100%" src="/__wm/injected-iframe.html"></div></div>';
  } else {
    console.log('NOT nesting SenseBase iframe');
  }
}

onloadPrevious = document.onload;
window.onload = function () {
  if (typeof onloadPrevious == "function") {
    onloadPrevious();
  }
  createDiv();
}
