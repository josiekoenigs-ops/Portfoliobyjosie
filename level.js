/* =====================================================================
   level.js — THE TRACK
   ---------------------------------------------------------------------
   Builds the level from data/projects.js and draws it:
     • parallax layers: sky (fixed) → clouds → far hills → near hills
     • the world layer: stops (buildings), dirt ramps, ground, finish
       flag and post office — these scroll 1:1 with the camera
   Also answers "how high is the track at x?" for the rider physics.

   Coordinates: x grows to the right along the track, y grows DOWN.
   The view is CONFIG.VIEW_HEIGHT (720) units tall.
   ===================================================================== */

/* ---------------------------------------------------------------
   JUMP SHAPES — each returns the height (world units) at distance d
   from the jump's start. ≈ 26 units = 1 metre.
   Add your own by copying one and listing its name in
   CONFIG.LEVEL.jumpPattern.
   --------------------------------------------------------------- */
const rise = (d, len, h) => h * (d / len) * (d / len);            // steeper toward the lip (launches you)
const fall = (d, len, h) => h * (1 - d / len) * (1 - d / len);    // smooth landing run-out
const ease = (d, len, h) => h * (1 - Math.cos(Math.PI * d / len)) / 2;

const JUMPS = {
  // three small bumps you can roll over or pump through
  rollers:  { w: 330, h: 22, shape: d => 22 * (1 - Math.cos(2 * Math.PI * (d % 110) / 110)) / 2 },
  // classic kicker: launch, then land on the run-out
  kicker:   { w: 400, h: 50, shape: d => d < 160 ? rise(d, 160, 50) : fall(d - 160, 240, 50) },
  // tabletop: up, flat top, down
  tabletop: { w: 470, h: 42, shape: d => d < 130 ? rise(d, 130, 42) : d < 280 ? 42 : fall(d - 280, 190, 42) },
  // double: take-off hump, a gap to clear, then a landing hump
  double:   { w: 470, h: 46, shape: d =>
              d < 110 ? rise(d, 110, 46) :
              d < 150 ? 46 * (1 - (d - 110) / 40) :
              d < 250 ? 0 :
              d < 300 ? ease(d - 250, 50, 40) :
              fall(d - 300, 170, 40) },
  // big kicker ≈ 3 m tall — real air!
  big:      { w: 500, h: 80, shape: d => d < 200 ? rise(d, 200, 80) : fall(d - 200, 300, 80) },
};

class Level {
  constructor() {
    const H = CONFIG.VIEW_HEIGHT;
    this.H = H;
    // Background strips (sky/clouds/ground) are 286px tall source art → stretch to 720.
    this.bgScale = H / CONFIG.BACKGROUND_SOURCE_HEIGHT;

    const ground = Assets.get('ground');
    this.groundThickness = ground ? Math.round(imgH(ground) * this.bgScale) : 80;
    // Safety net: if the ground image still has lots of empty space above the grass
    // (and it couldn't be trimmed), don't let it push the track off the top of the screen.
    if (this.groundThickness > H * 0.3) this.groundThickness = 80;
    this.groundY = H - this.groundThickness;   // y of the track surface

    // How thick the grass is on top of the ground strip (in world units).
    this.grassThickness = Math.round(CONFIG.GROUND_GRASS_ROWS * this.bgScale);

    this.buildLayout();
    this.buildDirt();
    this.hills = {
      far:  Assets.get('farHills')  || this.makeHills('far'),
      near: Assets.get('nearHills') || this.makeHills('near'),
    };
  }

  /* ---------------------------------------------------------------
     LAYOUT — place each stop, the ramps, the flag and the post office
     --------------------------------------------------------------- */
  buildLayout() {
    const L = CONFIG.LEVEL;
    let cursor = L.firstStopX;

    this.stops = PROJECTS.map((project, index) => {
      const img = Assets.get('stop:' + project.id);
      const scale = project.stopScale != null ? project.stopScale : L.defaultStopScale;
      const w = img ? imgW(img) * scale : 420;
      const h = img ? imgH(img) * scale : 300;
      const x = typeof project.x === 'number' ? project.x : cursor;
      cursor = x + w + L.stopGap;
      return { type: 'project', project, index, img, x, w, h, visited: false };
    });

    const lastRight = this.stops.reduce((m, s) => Math.max(m, s.x + s.w), L.firstStopX);

    const flagImg = Assets.get('flag');
    const fh = L.flagHeight;
    const fw = flagImg ? fh * imgW(flagImg) / imgH(flagImg) : 200;
    this.flag = { img: flagImg, x: lastRight + L.flagGap, w: fw, h: fh };
    this.flag.lineX = this.flag.x + fw / 2;      // crossing this triggers FINISH

    const poImg = Assets.get('postOffice');
    const ps = L.postOfficeScale;
    const pw = poImg ? imgW(poImg) * ps : 300;
    const ph = poImg ? imgH(poImg) * ps : 240;
    this.postOffice = { type: 'postOffice', img: poImg, x: this.flag.x + fw + L.postOfficeGap, w: pw, h: ph };

    this.width = this.postOffice.x + pw + L.endPadding;

    // Dirt ramps: one in the middle of every gap that's wide enough.
    this.ramps = [];
    if (L.ramps) {
      const obstacles = [...this.stops, this.flag, this.postOffice]
        .map(o => ({ a: o.x, b: o.x + o.w }))
        .sort((p, q) => p.a - q.a);
      let prevEnd = L.startX + 200;
      for (const o of obstacles) {
        this.addRampInGap(prevEnd, o.a);
        prevEnd = Math.max(prevEnd, o.b);
      }
    }
  }

  /* Put the next jump type from CONFIG.LEVEL.jumpPattern in the middle of a gap.
     If it's too long for the gap, try the next type; skip the gap if nothing fits. */
  addRampInGap(a, b) {
    const margin = 90, room = b - a - margin * 2;
    const pattern = CONFIG.LEVEL.jumpPattern;
    this.jumpIndex = this.jumpIndex || 0;
    for (let tries = 0; tries < pattern.length; tries++) {
      const type = pattern[(this.jumpIndex + tries) % pattern.length];
      const def = JUMPS[type];
      if (!def || def.w > room) continue;
      this.jumpIndex += tries + 1;
      this.ramps.push({ type, x: (a + b) / 2 - def.w / 2, w: def.w, h: def.h, shape: def.shape });
      return;
    }
  }

  /* ---------------------------------------------------------------
     PHYSICS HELPERS
     --------------------------------------------------------------- */

  /** Track surface y at world x (jumps raise it). */
  groundAt(x) {
    let y = this.groundY;
    for (const r of this.ramps) {
      if (x > r.x && x < r.x + r.w) y = Math.min(y, this.groundY - r.shape(x - r.x));
    }
    return y;
  }

  slopeAt(x) { return (this.groundAt(x + 2) - this.groundAt(x - 2)) / 4; }

  /** Which stop (project or post office) is the rider standing in front of? */
  stopAt(x) {
    const pad = 30;
    for (const s of [...this.stops, this.postOffice]) {
      if (x > s.x - pad && x < s.x + s.w + pad) return s;
    }
    return null;
  }

  /* ---------------------------------------------------------------
     DRAWING
     --------------------------------------------------------------- */

  drawBackground(ctx, camX, viewW, time) {
    const H = this.H;

    // 1) Sky — fixed. 'pixel' style = colour bands with dithering (matches the pixel art).
    const sky = Assets.get('sky');
    if (CONFIG.SKY_STYLE === 'pixel') {
      if (!this.skyPattern) this.skyPattern = ctx.createPattern(this.makePixelSky(), 'repeat-x');
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = this.skyPattern;
      ctx.fillRect(0, 0, viewW, H);
    } else if (sky) {
      ctx.imageSmoothingEnabled = true;          // it's a smooth gradient
      ctx.drawImage(sky, 0, 0, viewW, H);
    } else {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#0aa8ff'); g.addColorStop(1, '#6ee6d6');
      ctx.fillStyle = g; ctx.fillRect(0, 0, viewW, H);
    }

    ctx.imageSmoothingEnabled = !CONFIG.PIXEL_ART;

    // 2) Clouds — slow parallax + gentle drift.
    const clouds = Assets.get('clouds');
    if (clouds) {
      const w = imgW(clouds) * this.bgScale;
      this.tile(ctx, clouds, camX * 0.12 + time * 6, 0, w, H, viewW);
    }

    // 3 + 4) Hills.
    if (CONFIG.SHOW_HILLS) {
      this.tileFit(ctx, this.hills.far, camX * 0.3, viewW);
      this.tileFit(ctx, this.hills.near, camX * 0.55, viewW);
    }
  }

  drawWorld(ctx, camX, viewW, time) {
    const left = camX - 50, right = camX + viewW + 50;
    const onScreen = o => o.x + o.w > left && o.x < right;

    // Buildings first, so the grass overlaps their base a little.
    ctx.imageSmoothingEnabled = CONFIG.SMOOTH_STOPS;
    for (const s of this.stops) if (onScreen(s)) this.drawStop(ctx, s, camX);
    if (onScreen(this.postOffice)) this.drawStop(ctx, this.postOffice, camX);

    // Finish flag.
    ctx.imageSmoothingEnabled = !CONFIG.PIXEL_ART;
    if (onScreen(this.flag)) this.drawFlag(ctx, camX, time);

    // Ground strip, tiled.
    const ground = Assets.get('ground');
    if (ground) {
      const w = imgW(ground) * this.bgScale;
      this.tile(ctx, ground, camX, this.groundY, w, this.groundThickness, viewW);
    } else {
      ctx.fillStyle = '#9c6b45'; ctx.fillRect(0, this.groundY, viewW, this.groundThickness);
      ctx.fillStyle = '#5fb84a'; ctx.fillRect(0, this.groundY, viewW, 10);
    }

    // Dirt jumps — drawn after the ground so they cover the grass and merge into the dirt.
    for (const r of this.ramps) {
      if (r.x + r.w < left || r.x > right) continue;
      this.drawRamp(ctx, r, camX, viewW);
    }
  }

  /* A dirt jump: its outline is the track height (groundAt), filled with the same
     dirt texture as the ground and extended down through the grass layer, so the
     mound and the dirt below are one continuous piece. */
  drawRamp(ctx, r, camX, viewW) {
    const STEP = 4;                                         // chunky pixel steps
    // Only replace grass where the mound actually rises (> 4 units), so the
    // flat run-in and run-out stay grassy.
    let x0 = r.x, x1 = r.x + r.w;
    while (x0 < x1 && this.groundY - this.groundAt(x0) < 4) x0 += STEP;
    while (x1 > x0 && this.groundY - this.groundAt(x1) < 4) x1 -= STEP;
    x0 -= STEP; x1 += STEP;
    const bottom = this.groundY + this.grassThickness;     // where the ground's dirt begins
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(Math.round(x0 - camX), bottom);
    for (let x = x0; x <= x1; x += STEP) {
      const top = Math.round(this.groundAt(x + STEP / 2) / STEP) * STEP;
      ctx.lineTo(Math.round(x - camX), top);
      ctx.lineTo(Math.round(x + STEP - camX), top);
    }
    ctx.lineTo(Math.round(x1 - camX), bottom);
    ctx.closePath();
    ctx.clip();

    // Fill with the dirt texture, stacked upward from where the real dirt sits.
    if (this.dirt) {
      const w = imgW(this.dirt) * this.bgScale, h = imgH(this.dirt) * this.bgScale;
      for (let y = bottom; y > this.groundY - r.h - h; y -= h) {
        this.tile(ctx, this.dirt, camX, Math.round(y), w, Math.ceil(h), viewW);
      }
    } else {
      ctx.fillStyle = '#9c6b45';
      ctx.fillRect(x0 - camX, this.groundY - r.h - 4, x1 - x0, r.h + this.grassThickness + 8);
    }
    // A slightly darker, packed top edge so the shape reads clearly.
    ctx.fillStyle = 'rgba(70, 40, 20, 0.35)';
    for (let x = x0; x < x1; x += STEP) {
      const top = Math.round(this.groundAt(x + STEP / 2) / STEP) * STEP;
      if (top < this.groundY) ctx.fillRect(Math.round(x - camX), top, STEP, STEP);
    }
    ctx.restore();
  }

  drawStop(ctx, s, camX) {
    const x = Math.round(s.x - camX);
    const sink = 6;                                // tuck the base behind the grass
    const y = Math.round(this.groundY - s.h + sink);
    if (s.img) {
      ctx.drawImage(s.img, x, y, Math.round(s.w), Math.round(s.h));
    } else {
      // Placeholder building if the image is missing.
      ctx.fillStyle = '#e9e2d0'; ctx.fillRect(x, y + 60, s.w, s.h - 60);
      ctx.fillStyle = '#c0523e';
      ctx.beginPath(); ctx.moveTo(x - 10, y + 62); ctx.lineTo(x + s.w / 2, y); ctx.lineTo(x + s.w + 10, y + 62); ctx.fill();
      ctx.fillStyle = '#2a3d50'; ctx.font = '20px "Press Start 2P", monospace'; ctx.textAlign = 'center';
      ctx.fillText(s.project ? s.project.title : 'POST', x + s.w / 2, y + s.h / 2 + 30);
    }
  }

  drawFlag(ctx, camX, time) {
    const f = this.flag;
    const x = Math.round(f.x - camX), y = Math.round(this.groundY - f.h + 4);
    if (!f.img) {
      ctx.fillStyle = '#333'; ctx.fillRect(x + f.w / 2 - 3, y, 6, f.h);
      return;
    }
    // Draw in vertical slices with a small sine offset so the banner waves.
    // The poles (outer edges) stay still.
    const slices = 24, sw = imgW(f.img) / slices, dw = f.w / slices;
    for (let i = 0; i < slices; i++) {
      const edge = Math.min(i, slices - 1 - i) / (slices / 2);   // 0 at poles, 1 at middle
      const wave = Math.sin(time * 5 + i * 0.6) * 4 * edge;
      ctx.drawImage(f.img, i * sw, 0, sw, imgH(f.img), x + i * dw, y + wave, dw + 0.6, f.h);
    }
  }

  /* Repeat an image horizontally to fill the view. offset = how far it has scrolled. */
  tile(ctx, img, offset, y, w, h, viewW) {
    let start = -((offset % w) + w) % w;
    for (let x = start; x < viewW; x += w) ctx.drawImage(img, Math.round(x), y, Math.ceil(w) + 1, h);
  }

  /* Tile a full-height hill layer (canvas or image), scaled to view height. */
  tileFit(ctx, img, offset, viewW) {
    const h = this.H, w = imgW(img) * (h / imgH(img));
    this.tile(ctx, img, offset, 0, w, h, viewW);
  }

  /* ---------------------------------------------------------------
     PROCEDURAL ART (used when you haven't supplied an image)
     --------------------------------------------------------------- */

  /* Colours of the sky image from top to bottom (falls back to a blue gradient). */
  skyColours(n) {
    const out = [];
    const sky = Assets.get('sky');
    try {
      if (!sky) throw 0;
      const c = document.createElement('canvas');
      c.width = 1; c.height = n;
      const g = c.getContext('2d');
      g.drawImage(sky, imgW(sky) / 2, 0, 1, imgH(sky), 0, 0, 1, n);
      const d = g.getImageData(0, 0, 1, n).data;
      for (let i = 0; i < n; i++) out.push([d[i * 4], d[i * 4 + 1], d[i * 4 + 2]]);
    } catch (e) {
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1);
        out.push([10 + 100 * t, 168 + 62 * t, 255 - 41 * t]);
      }
    }
    return out;
  }

  /* SNES-style sky: flat colour bands with a dithered checkerboard where they meet.
     Returns a narrow tile that repeats sideways. */
  makePixelSky() {
    const PX = 3, BANDS = 12, H = this.H, bandH = H / BANDS;
    const cols = this.skyColours(BANDS);
    const c = document.createElement('canvas');
    c.width = PX * 2; c.height = H;
    const g = c.getContext('2d');
    const css = ([r, gg, b]) => `rgb(${r | 0},${gg | 0},${b | 0})`;
    for (let i = 0; i < BANDS; i++) {
      g.fillStyle = css(cols[i]);
      g.fillRect(0, Math.floor(i * bandH), PX * 2, Math.ceil(bandH));
      if (i < BANDS - 1) {                           // checker dither into the next band
        g.fillStyle = css(cols[i + 1]);
        const y = Math.floor((i + 1) * bandH) - PX * 2;
        g.fillRect(PX, y, PX, PX);
        g.fillRect(0, y + PX, PX, PX);
      }
    }
    return c;
  }

  /* Rounded hills in the same pixel style and grass colours as the ground strip.
     Near hills: textured grass with a highlight edge, dark outline and little bushes.
     Far hills: same shapes, faded toward the sky colour for depth. */
  makeHills(kind) {
    const PX = 3;                                   // one "pixel" = 3 world units (close to the ground art)
    const W = 2400 / PX, H = Math.ceil(this.H / PX);
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d');
    const base = Math.round((this.groundY + 6) / PX);
    const far = kind === 'far';

    // Palette taken from the ground's grass, mixed toward the sky for far hills.
    const skyLow = this.skyColours(12)[9];
    const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
    const fade = far ? 0.55 : 0;
    const P = {
      body:  mix([108, 176, 80], skyLow, fade),
      dark:  mix([86, 150, 66], skyLow, fade),
      light: mix([150, 206, 104], skyLow, fade),
      edge:  mix([168, 222, 116], skyLow, fade),
      line:  mix([50, 110, 48], skyLow, fade * 0.8),
      bush:  mix([70, 140, 60], skyLow, fade),
    };
    const css = ([r, gg, b]) => `rgb(${r},${gg},${b})`;

    // [centre x, half width, height] in small pixels — repeats every W.
    const domes = far
      ? [[60, 110, 54], [250, 80, 38], [400, 130, 66], [600, 95, 44], [730, 70, 34]]
      : [[110, 70, 34], [290, 52, 24], [450, 84, 42], [660, 62, 28]];
    const heightAt = x => {
      let best = 0;
      for (const [cx, rx, hh] of domes) {
        for (const off of [-W, 0, W]) {             // wrapped copies so the tile repeats seamlessly
          const u = (x - cx - off) / rx;
          if (u > -1 && u < 1) best = Math.max(best, Math.round(hh * Math.sqrt(1 - u * u)));
        }
      }
      return best;
    };
    let seed = far ? 11 : 5;
    const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;

    for (let x = 0; x < W; x++) {
      const h = heightAt(x);
      if (h <= 0) continue;
      const top = base - h;
      g.fillStyle = css(P.body); g.fillRect(x, top, 1, H - top);
      if (!far) { g.fillStyle = css(P.line); g.fillRect(x, top - 1, 1, 1); }
      g.fillStyle = css(P.edge); g.fillRect(x, top, 1, 1);
      g.fillStyle = css(P.light); g.fillRect(x, top + 1, 1, 1);
      // grass texture specks, like the ground art
      for (let y = top + 3; y < base; y += 2) {
        const r = rnd();
        if (r < (far ? 0.05 : 0.09)) { g.fillStyle = css(P.dark); g.fillRect(x, y, 1, 1 + (r < 0.03 ? 1 : 0)); }
        else if (r > 0.975) { g.fillStyle = css(P.light); g.fillRect(x, y, 1, 1); }
      }
    }
    // little round bushes sitting on the near hills
    if (!far) {
      for (let i = 0; i < 9; i++) {
        const bx = Math.floor(rnd() * W), h = heightAt(bx);
        if (h < 10) continue;
        const top = base - h, r = 3 + Math.floor(rnd() * 3);
        g.fillStyle = css(P.line);
        g.beginPath(); g.arc(bx, top + 1, r + 1, Math.PI, 0); g.fill();
        g.fillStyle = css(P.bush);
        g.beginPath(); g.arc(bx, top + 1, r, Math.PI, 0); g.fill();
        g.fillStyle = css(P.light); g.fillRect(bx - 1, top - r + 2, 2, 1);
      }
    }
    // Snap away anti-aliasing so edges are crisp pixels.
    const img = g.getImageData(0, 0, W, H);
    for (let i = 3; i < img.data.length; i += 4) img.data[i] = img.data[i] > 110 ? 255 : 0;
    g.putImageData(img, 0, 0);
    return c;
  }

  /* Cut the dirt part (everything below the grass) out of your ground image,
     so the jumps use exactly the same texture as the track. */
  buildDirt() {
    const ground = Assets.get('ground');
    const rows = CONFIG.GROUND_GRASS_ROWS;
    this.dirt = null;
    if (!ground || imgH(ground) <= rows) return;
    const c = document.createElement('canvas');
    c.width = imgW(ground);
    c.height = imgH(ground) - rows;
    c.getContext('2d').drawImage(ground, 0, rows, c.width, c.height, 0, 0, c.width, c.height);
    this.dirt = c;
  }
}
