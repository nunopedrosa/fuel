Tesseract.js 5.1.1 browser distribution and Tesseract.js-core 5.1.1 scalar WebAssembly core.

Pinned to these versions because the 7.0.0 core uses optional chaining and
BigInt typed arrays unavailable in Safari 12. Both library/worker files come from
https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/ and both core files from
https://cdn.jsdelivr.net/npm/tesseract.js-core@5.1.1/.

The browser library, worker, and scalar core are served locally. The Portuguese
fast language model is requested from https://tessdata.projectnaptha.com/4.0.0_fast
on first use and cached by Tesseract.js in IndexedDB. Receipt photos are never
sent to that host.

The worker is loaded directly from this directory, without a blob wrapper.
Deploy the included `.htaccess`: its worker-only CSP permits WebAssembly
(`unsafe-eval` is needed on Safari 12) and the model download. The page retains
its strict script policy. OCR assets remain lazy-loaded; no startup payload is
added. Physical Safari 12 testing is still required.

See LICENSE.md and LICENSE-core for license terms.
