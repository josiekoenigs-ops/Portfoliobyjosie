/* =====================================================================
   assets.js — IMAGE PRELOADER
   ---------------------------------------------------------------------
   Loads every image before the game starts and reports progress to the
   loading screen. A missing file never crashes the game: it is stored
   as null and the game draws a placeholder instead.

   "trim: true" crops away the empty transparent border around an image.
   Your building art sits at the bottom of big 2000x1545 canvases, so
   trimming lets the game place each building exactly on the track.
   ===================================================================== */

const Assets = {
  images: {},   // key -> drawable (Image or trimmed canvas) or null if missing

  /** manifest: [{ key, src, trim }] ; onProgress(loadedCount, total) */
  loadAll(manifest, onProgress) {
    let done = 0;
    const jobs = manifest.map(item => this.loadImage(item.src).then(img => {
      this.images[item.key] = img && item.trim ? this.trim(img) : img;
      done++;
      if (onProgress) onProgress(done, manifest.length);
    }));
    return Promise.all(jobs);
  },

  loadImage(src) {
    return new Promise(resolve => {
      if (!src) return resolve(null);
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => {
        console.info('[assets] not found (placeholder used):', src);
        resolve(null);
      };
      img.src = src;
    });
  },

  get(key) { return this.images[key] || null; },

  /** Crop transparent edges. Falls back to the full image if the browser
      blocks pixel access (e.g. opening index.html straight from disk). */
  trim(img) {
    try {
      const w = imgW(img), h = imgH(img);
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const ctx = c.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, w, h).data;
      let minX = w, minY = h, maxX = -1, maxY = -1;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          if (data[(y * w + x) * 4 + 3] > 8) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }
      if (maxX < 0) return img; // fully transparent — leave as is
      const out = document.createElement('canvas');
      out.width = maxX - minX + 1;
      out.height = maxY - minY + 1;
      out.getContext('2d').drawImage(c, minX, minY, out.width, out.height, 0, 0, out.width, out.height);
      return out;
    } catch (e) {
      console.warn('[assets] could not trim (use a local server like Live Server):', e.message);
      return img;
    }
  },
};

/* Width/height helper that works for both <img> and <canvas>. */
function imgW(img) { return img.naturalWidth || img.width; }
function imgH(img) { return img.naturalHeight || img.height; }
