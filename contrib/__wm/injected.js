function createDiv() { 
  if (!parent.document.getElementById('sbIframe')) {
    console.log('injecting SenseBase iframe');
    /*
    // we need at least one class or div to work with
    if (document.body.innerHTML.indexOf(' class=') < 0 && document.body.innerHTML.indexOf(' id=') < 0) {
      console.log('injecting base enclosure');
      document.body.innerHTML = '<div id="sbEnclosure">' + document.body.innerHTML + '</div>';
    }
    */
    document.body.innerHTML += '<div id="sbIframe" style="z-index: 999; position: fixed; right: 1em; top: 0; height: 90%; color: black; background: #ffe; filter:alpha(opacity=90); opacity:0.9; border: 0"><iframe style="width: 100%; height: 100%" src="/__wm/injected-iframe.html"></div></div>';
  } else {
    console.log('NOT injecting SenseBase iframe');
  }
}
window.onload = createDiv;
