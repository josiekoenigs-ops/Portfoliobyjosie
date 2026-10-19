/* =====================================================================
   coins.js — COLLECTIBLE COINS + FUN FACTS
   ---------------------------------------------------------------------
   One spinning coin per fact in FUN_FACTS (data/projects.js). Riding
   into a coin collects it and pops that fact up in the sky.

   Placement is automatic and mixed so it's fun to find them all:
   coins near a jump float over its peak (ride over it to grab them),
   others alternate between bike height (just ride through) and up high
   (you'll need to jump).
   ===================================================================== */

const Coins = {
  list: [],
  collected: 0,
  fact: null,              // { text, number, t } — the fact currently shown in the sky
  FACT_TIME: 7,            // seconds a fact stays up
  RADIUS: 13,

  build(level) {
    this.level = level;
    this.list = [];
    const n = FUN_FACTS.length;
    if (!n) return;
    const startX = CONFIG.LEVEL.startX + 520, endX = level.flag.x - 260;
    let alt = 0;
    for (let i = 0; i < n; i++) {
      let x = n === 1 ? (startX + endX) / 2 : startX + (endX - startX) * i / (n - 1);
      let y;
      // Snap to a nearby jump: hover just above its highest point.
      const ramp = level.ramps.find(r => Math.abs(r.x + r.w / 2 - x) < 380);
      if (ramp) {
        let best = 0, bestD = 0;
        for (let d = 0; d < ramp.w; d += 5) { const hh = ramp.shape(d); if (hh > best) { best = hh; bestD = d; } }
        x = ramp.x + bestD;
        y = level.groundY - best - 62;
      } else {
        y = level.groundY - (alt++ % 2 === 0 ? 34 : 125);   // ride-through height, or jump height
      }
      this.list.push({ x, y, factIndex: i, taken: false, popT: 0 });
    }
    this.collected = 0;
    this.fact = null;
    UI.updateCoins(0, n);
  },

  reset() {
    this.list.forEach(c => { c.taken = false; c.popT = 0; });
    this.collected = 0;
    this.fact = null;
    UI.updateCoins(0, this.list.length);
  },

  update(dt, player) {
    // The rider's body: ≈ bike length wide, rider height tall.
    const halfW = 26, top = player.y - CONFIG.AVATAR.drawHeight, bottom = player.y;
    for (const c of this.list) {
      if (c.taken) { c.popT += dt; continue; }
      const nx = Math.max(player.x - halfW, Math.min(c.x, player.x + halfW));
      const ny = Math.max(top, Math.min(c.y, bottom));
      if ((c.x - nx) ** 2 + (c.y - ny) ** 2 < this.RADIUS ** 2) this.collect(c);
    }
    if (this.fact) {
      this.fact.t += dt;
      if (this.fact.t > this.FACT_TIME) this.fact = null;
    }
  },

  collect(c) {
    c.taken = true;
    c.popT = 0;
    this.collected++;
    this.fact = { text: FUN_FACTS[c.factIndex], number: this.collected, t: 0 };
    Sound.play('coin');
    Particles.sparkle(c.x, c.y);
    UI.updateCoins(this.collected, this.list.length);
  },

  /* Spinning pixel coin (drawn in code — no image needed). */
  draw(ctx, camX, time) {
    for (const c of this.list) {
      let y = c.y + Math.sin(time * 3 + c.x) * 3, alpha = 1;
      if (c.taken) {                                  // quick "pop" upward, then gone
        if (c.popT > 0.45) continue;
        y -= c.popT * 120;
        alpha = 1 - c.popT / 0.45;
      }
      const x = c.x - camX;
      if (x < -40 || x > 4000) continue;
      const r = this.RADIUS, squash = Math.max(0.15, Math.abs(Math.cos(time * 4 + c.x * 0.01)));
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(Math.round(x), Math.round(y));
      ctx.scale(squash, 1);
      ctx.fillStyle = '#7a4a00';                       // outline
      ctx.fillRect(-r + 3, -r, 2 * r - 6, 2 * r); ctx.fillRect(-r, -r + 3, 2 * r, 2 * r - 6);
      ctx.fillStyle = '#f5b800';                       // gold body
      ctx.fillRect(-r + 4, -r + 2, 2 * r - 8, 2 * r - 4); ctx.fillRect(-r + 2, -r + 4, 2 * r - 4, 2 * r - 8);
      ctx.fillStyle = '#ffe066';                       // light face
      ctx.fillRect(-r + 6, -r + 4, 2 * r - 12, 2 * r - 8);
      ctx.fillStyle = '#c98a00';                       // centre slot
      ctx.fillRect(-2, -r + 7, 4, 2 * r - 14);
      ctx.fillStyle = '#fff8cc';                       // shine
      ctx.fillRect(-r + 6, -r + 5, 3, 6);
      ctx.restore();
    }
  },

  /* Where the fact banner sits (so the "Press E" bubble can move out of its way). */
  factRect(ctx, viewW) {
    if (!this.fact) return null;
    const w = Math.min(780, viewW - 80), pad = 24;
    ctx.save();
    ctx.font = '700 22px Nunito, system-ui, sans-serif';
    const lines = wrapText(ctx, this.fact.text, w - pad * 2);
    ctx.restore();
    return { x: (viewW - w) / 2, y: 108, w, h: 58 + lines.length * 30 + 14, lines, pad };
  },

  /* The fact banner floating in the sky. */
  drawFact(ctx, viewW) {
    const f = this.fact;
    if (!f) return;
    const t = f.t, fadeOut = Math.max(0, Math.min(1, (this.FACT_TIME - t) / 0.5));
    const pop = Math.min(1, t / 0.22);
    const scale = 0.6 + 0.4 * (1 - Math.pow(1 - pop, 3));
    const { x, y, w, h, lines, pad } = this.factRect(ctx, viewW);

    ctx.save();
    ctx.globalAlpha = fadeOut * pop;
    ctx.translate(viewW / 2, y + h / 2);
    ctx.scale(scale, scale);
    ctx.translate(-viewW / 2, -(y + h / 2));

    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x + 8, y + 8, w, h);
    ctx.fillStyle = '#253a4f'; ctx.fillRect(x - 4, y - 4, w + 8, h + 8);
    ctx.fillStyle = '#fffaf0'; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#ffe066'; ctx.fillRect(x, y, w, 6);

    // header with a little coin
    ctx.fillStyle = '#f5b800'; ctx.fillRect(x + pad, y + 20, 16, 16);
    ctx.fillStyle = '#7a4a00'; ctx.fillRect(x + pad + 6, y + 23, 4, 10);
    ctx.fillStyle = '#e2502f';
    ctx.font = '15px "Press Start 2P", monospace';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(`FUN FACT ${f.number}/${this.list.length}`, x + pad + 26, y + 29);

    ctx.fillStyle = '#253a4f';
    ctx.font = '700 22px Nunito, system-ui, sans-serif';
    lines.forEach((ln, i) => ctx.fillText(ln, x + pad, y + 62 + i * 30 + 6));
    ctx.restore();
  },
};

/* Split text into lines that fit maxWidth. */
function wrapText(ctx, text, maxWidth) {
  const words = text.split(/\s+/), lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = w; }
    else line = test;
  }
  if (line) lines.push(line);
  return lines;
}
