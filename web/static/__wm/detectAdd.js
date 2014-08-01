new function(){console.log('moo', window.parent.document.getElementById('pxControls'));
/** 
 * If we are in the dashboard we need to detect that we're in a frame and the parent has pxContent
 **/
if (!window.parent.document.getElementById('pxControls')) {
   function pxCreate(htmlStr) {
     var frag = document.createDocumentFragment(), temp = document.createElement("div");
     temp.innerHTML = htmlStr;
     while (temp.firstChild) {
     frag.appendChild(temp.firstChild);
   }
   return frag;
  }
  console.log(document.getElementById('pxContent'));
  document.getElementById("pxContent").style.left = "302px";
  var fragment = pxCreate('<div id="pxIFrameContainer" style="z-index: 9999; position: fixed; top: 0px; left: 0px; height: 1900px width: 300px; background-image:url(/__wm/mesh.png); "><iframe id="pxIFrame" src="/__wm/iframe.html" style="z-index: 1; height: 1900px; width: 97%"></iframe></div>');
  document.body.insertBefore(fragment, document.body.childNodes[0]);
}}();

