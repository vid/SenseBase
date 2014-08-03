// adapated from http://html5demos.com/dnd-upload

function setupDND(dropzone, postLoc) {

  document.getElementById("uploadInfo").className = "";

  var holder = document.getElementById(dropzone),
    tests = {
      filereader: typeof FileReader != 'undefined',
      dnd: 'draggable' in document.createElement('span'),
      formdata: !!window.FormData,
      progress: "upload" in new XMLHttpRequest
    },
    support = {
      filereader: document.getElementById('filereader'),
      formdata: document.getElementById('formdata'),
      progress: document.getElementById('progress')
    },
    progress = document.getElementById('uploadprogress'),
    fileupload = document.getElementById('upload');

  ["filereader", "formdata", "progress"].forEach(function (api) {
//  console.log(api, support[api]);
    if (tests[api] === false) {
      support[api].className = 'fail';
    } else {
      support[api].className = 'hidden';
    }
  });

  if (tests.dnd) {
    holder.ondragover = function () { this.className += ' hover'; return false; };
    holder.ondragleave = function () { this.className = this.className.replace(/ hover/g, ''); return false; };
    holder.ondrop = function (e) {
      this.className = '';
      e.preventDefault();
      readfiles(e.dataTransfer.files);
    }
  } else {
    fileupload.className = 'hidden';
    fileupload.querySelector('input').onchange = function () {
      readfiles(this.files);
    };
  }

  // FIXME display filetype icon
  function previewfile(file) {
    if (false && tests.filereader === true) {
      var reader = new FileReader();
      reader.onload = function (event) {
        var image = new Image();
        image.src = event.target.result;
        image.width = 250; // a fake resize
        holder.appendChild(image);
      };

      reader.readAsDataURL(file);
    }  else {
      holder.innerHTML += '<p>Uploaded ' + file.name + ' ' + (file.size ? (file.size/1024|0) + 'K' : '');
//      console.log(file);
    }
  }

  function readfiles(files) {
      var formData = tests.formdata ? new FormData() : null;
      for (var i = 0; i < files.length; i++) {
        if (tests.formdata) formData.append('file', files[i]);
        previewfile(files[i]);
      }

      // now post a new XHR request
      if (tests.formdata) {
        var xhr = new XMLHttpRequest();
        document.getElementById('uploadprogress').className = '';

        xhr.open('POST', postLoc);
        xhr.onload = function() {
          progress.value = progress.innerHTML = 100;
        };

        if (tests.progress) {
          xhr.upload.onprogress = function (event) {
            if (event.lengthComputable) {
              var complete = (event.loaded / event.total * 100 | 0);
              progress.value = progress.innerHTML = complete;
              if (complete === 100) {
                document.getElementById('uploadprogress').className = 'hidden';
              }
            }
          }
        }

        xhr.send(formData);
      }
  }
}
