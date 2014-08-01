function createDiv() { 
  // not nested
  if (!parent.document.getElementById('sbIframe')) {
    console.log('injecting SenseBase iframe');
    document.body.innerHTML += '<div id="sbIframe" style="z-index: 899; position: fixed; right: 1em; top: 0; height: 90%; color: black; background: #ffe; filter:alpha(opacity=90); opacity:0.9; border: 0"><iframe style="width: 100%; height: 100%" src="/__wm/injected-iframe.html"></div></div>';
  }
}
createDiv();
