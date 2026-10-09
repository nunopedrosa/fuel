(function (root) {
  'use strict';

  var workerPromise = null;
  var SCRIPT_PATH = 'vendor/tesseract/tesseract.min.js';
  var WORKER_PATH = 'vendor/tesseract/worker.min.js';
  var CORE_PATH = 'vendor/tesseract/tesseract-core.wasm.js';
  var LANGUAGE_PATH = 'https://tessdata.projectnaptha.com/4.0.0_fast';

  function loadEngine() {
    if (root.Tesseract) return Promise.resolve(root.Tesseract);
    return new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src = SCRIPT_PATH;
      script.onload = function () { resolve(root.Tesseract); };
      script.onerror = function () { reject(new Error('Could not load the local OCR engine.'));
      };
      document.head.appendChild(script);
    });
  }

  function readAndDownscale(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onerror = function () { reject(new Error('Could not read this photo.')); };
      reader.onload = function () {
        var image = new Image();
        image.onerror = function () { reject(new Error('This image could not be opened.')); };
        image.onload = function () {
          var maxSide = 1280;
          var scale = Math.min(1, maxSide / Math.max(image.width, image.height));
          var canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(image.width * scale));
          canvas.height = Math.max(1, Math.round(image.height * scale));
          var context = canvas.getContext('2d');
          if (!context) { reject(new Error('Image processing is unavailable in this browser.')); return; }
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          try {
            var pixels = context.getImageData(0, 0, canvas.width, canvas.height);
            var data = pixels.data;
            for (var i = 0; i < data.length; i += 4) {
              var grey = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
              var contrast = Math.max(0, Math.min(255, (grey - 128) * 1.35 + 128));
              data[i] = data[i + 1] = data[i + 2] = contrast;
            }
            context.putImageData(pixels, 0, 0);
            resolve(canvas.toDataURL('image/jpeg', 0.86));
          } catch (error) {
            reject(new Error('Image cleanup failed. Try a smaller or clearer photo.'));
          } finally {
            canvas.width = 1;
            canvas.height = 1;
            image.src = '';
          }
        };
        image.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function scan(file, onProgress) {
    if (!file || !file.type || file.type.indexOf('image/') !== 0) return Promise.reject(new Error('Choose an image file.'));
    if (file.size > 8 * 1024 * 1024) return Promise.reject(new Error('Choose a receipt photo smaller than 8 MB.'));
    if (workerPromise) return Promise.reject(new Error('A receipt scan is already running.'));
    var worker;
    workerPromise = loadEngine().then(function (engine) {
      return engine.createWorker('por', 1, {
        workerPath: WORKER_PATH,
        // Serve a same-origin worker directly so the app's strict CSP remains
        // in force. Its separate response policy permits only local OCR code.
        workerBlobURL: false,
        corePath: CORE_PATH,
        langPath: LANGUAGE_PATH,
        gzip: true,
        cacheMethod: 'write',
        logger: function (message) { if (onProgress) onProgress(message); }
      });
    }).then(function (created) {
      worker = created;
      return readAndDownscale(file);
    }).then(function (image) {
      return worker.recognize(image).then(function (result) { return root.FuelLogReceipt.parse(result.data.text); });
    }).then(function (result) {
      return result;
    }).finally(function () {
      var cleanup = worker ? worker.terminate() : Promise.resolve();
      workerPromise = null;
      return cleanup;
    });
    return workerPromise;
  }

  root.FuelLogReceiptOCR = { scan: scan };
})(window);
