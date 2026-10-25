/* =====================================================================
   game.js — MAIN LOOP, CAMERA, GAME STATE
   ---------------------------------------------------------------------
   States:
     'loading' → images are preloading
     'title'   → title screen is showing (world drawn behind it)
     'playing' → riding!
     'popup'   → a pop-up is open; the world is frozen
   ===================================================================== */

const Game = {
  canvas: null,
  ctx: null,
  state: 'loading',
  viewW: 1280,               // world units visible horizontally (changes with window shape)
  H: CONFIG.VIEW_HEIGHT,
  scale: 1,                  // canvas pixels per world unit
  camX: 0,
  time: 0,
  lastTs: 0,
  level: null,
  player: null,
  activeStop: null,          // stop the rider is standing in front of
  promptRect: null,          // where the "Press E" bubble is (for tapping)
  finished: false,
  finishTimer: 0,
  interactCooldown: 0,
  isTouch: false,

  async boot() {
    this.canvas = document.getElementById('game');
    this.ctx = this.canvas.getContext('2d');
    this.isTouch = window.matchMedia('(pointer: coarse)').matches;

    Input.init();
    Sound.init();
    Music.init();
    UI.init();
    Resume.init();
    window.addEventListener('resize', () => this.resize());
    this.resize();

    // ---- Preload everything ----
    const A = CONFIG.ART;
    const manifest = [
      { key: 'sky', src: A.sky },
      { key: 'clouds', src: A.clouds },
      { key: 'ground', src: A.ground, trim: true },
      { key: 'flag', src: A.flag, trim: true },
      { key: 'postOffice', src: A.postOffice, trim: true },
      { key: 'buttons', src: A.buttons },
      ...(CONFIG.SHOW_HILLS ? [{ key: 'farHills', src: A.farHills }, { key: 'nearHills', src: A.nearHills }] : []),
      ...PROJECTS.map(p => ({ key: 'stop:' + p.id, src: p.stopImage, trim: true })),
      ...Avatar.manifest(),
    ];
    await Promise.all([
      Assets.loadAll(manifest, (n, total) => UI.setLoading(n / total)),
      document.fonts ? document.fonts.load('16px "Press Start 2P"').catch(() => {}) : null,
      document.fonts ? document.fonts.load('700 22px Nunito').catch(() => {}) : null,
    ]);
    Avatar.build();

    this.level = new Level();
    this.player = new Player(this.level);
    this.camX = 0;
    UI.buildHUD(this.level);
    Coins.build(this.level);
    UI.showTitle();
    this.state = 'title';

    this.canvas.addEventListener('pointerdown', e => this.onCanvasTap(e));
    requestAnimationFrame(ts => { this.lastTs = ts; this.loop(ts); });
  },

  /* Fit the canvas to the window. Height is always 720 world units;
     width follows the window shape (clamped), extra space is letterboxed. */
  resize() {
    const ww = window.innerWidth, wh = window.innerHeight;
    const aspect = Math.max(CONFIG.MIN_ASPECT, Math.min(CONFIG.MAX_ASPECT, ww / wh));
    this.viewW = Math.round(this.H * aspect);
    let cssW = ww, cssH = ww / aspect;
    if (cssH > wh) { cssH = wh; cssW = wh * aspect; }
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(cssW * dpr);
    this.canvas.height = Math.round(cssH * dpr);
    this.scale = this.canvas.width / this.viewW;
    const stage = document.getElementById('stage');
    stage.style.width = cssW + 'px';
    stage.style.height = cssH + 'px';
  },

  /* ---------------------------------------------------------------
     MAIN LOOP — requestAnimationFrame + delta time
     --------------------------------------------------------------- */
  loop(ts) {
    // dt in seconds, capped so a background tab doesn't teleport the rider.
    const dt = Math.min(0.05, (ts - this.lastTs) / 1000);
    this.lastTs = ts;
    if (this.state !== 'popup') this.time += dt;

    if (this.state === 'playing') this.update(dt);
    else if (this.state === 'title') this.updateTitle(dt);
    if (this.state !== 'popup') Particles.update(dt);

    this.render();
    requestAnimationFrame(t => this.loop(t));
  },

  update(dt) {
    const p = this.player, L = this.level;
    p.update(dt);
    Coins.update(dt, p);

    // Camera: keep the rider about a third in from the edge they're riding toward.
    const lead = p.facing > 0 ? 0.36 : 0.64;
    const target = p.x - this.viewW * lead;
    this.camX += (target - this.camX) * Math.min(1, dt * 4);
    this.camX = Math.max(0, Math.min(L.width - this.viewW, this.camX));

    // Which stop are we in front of?
    this.activeStop = L.stopAt(p.x);
    this.interactCooldown = Math.max(0, this.interactCooldown - dt);
    const wantsIn = Input.consumeInteract();
    if (wantsIn && this.activeStop && this.interactCooldown <= 0) this.enterStop(this.activeStop);
    UI.setEnterButton(!!this.activeStop);

    // Finish line!
    if (!this.finished && p.x > L.flag.lineX) {
      this.finished = true;
      this.finishTimer = 2.8;
      const fx = L.flag.lineX, fy = L.groundY - L.flag.h;
      Particles.confetti(fx - 120, fy);
      Particles.confetti(fx + 120, fy);
      setTimeout(() => Particles.confetti(fx, fy - 80, 90), 350);
      Sound.play('finish');
    }
    this.finishTimer = Math.max(0, this.finishTimer - dt);

    // Past the finish line and up to the post office → the resume flies in (once per ride).
    if (CONFIG.RESUME.autoOpen && this.finished && !Resume.shownThisRide && p.x >= L.postOffice.x - 40) {
      Resume.shownThisRide = true;
      Resume.openResume();
    }

    UI.updateHUD(p.x / L.width);
  },

  /* On the title screen the world is drawn (clouds drift) but key presses are ignored. */
  updateTitle(dt) {
    Input.consumeJump(); Input.consumeInteract();
  },

  /* ---------------------------------------------------------------
     RENDER
     --------------------------------------------------------------- */
  render() {
    const ctx = this.ctx;
    ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    if (!this.level) {
      ctx.fillStyle = '#0b1724'; ctx.fillRect(0, 0, this.viewW, this.H);
      return;
    }
    const camX = Math.round(this.camX);
    this.level.drawBackground(ctx, camX, this.viewW, this.time);
    this.level.drawWorld(ctx, camX, this.viewW, this.time);
    Coins.draw(ctx, camX, this.time);
    this.player.draw(ctx, camX);
    Particles.draw(ctx, camX);

    this.promptRect = null;
    if (this.state === 'playing' && this.activeStop) this.drawPrompt(ctx, this.activeStop, camX);
    if (this.finishTimer > 0) this.drawFinish(ctx);
    Coins.drawFact(ctx, this.viewW);
  },

  /* Bouncing speech bubble above the stop: title + "PRESS E". */
  drawPrompt(ctx, stop, camX) {
    const L = this.level;
    // The pixel font has no capital accented letters (É), so strip accents in this ALL-CAPS label.
    const title = stop.type === 'postOffice' ? 'POST OFFICE'
      : stop.project.title.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
    const hint = this.isTouch ? 'TAP TO ENTER' : 'PRESS E';
    const inset = Math.min(140, stop.w / 2);
    const cx = Math.max(stop.x + inset, Math.min(stop.x + stop.w - inset, this.player.x)) - camX;
    const bounce = Math.round(Math.abs(Math.sin(this.time * 4)) * -10);
    // Sit above the building, but below a fun-fact banner if one is showing.
    const fact = Coins.factRect(ctx, this.viewW);
    const minBottom = fact ? fact.y + fact.h + 110 : 140;
    const bottom = Math.max(minBottom, L.groundY - stop.h - 18) + bounce;

    ctx.font = '18px "Press Start 2P", monospace';
    const w1 = ctx.measureText(title).width;
    ctx.font = '14px "Press Start 2P", monospace';
    const w2 = ctx.measureText(hint).width;
    const w = Math.max(w1, w2) + 40, h = 70;
    const x = Math.round(Math.max(10, Math.min(this.viewW - w - 10, cx - w / 2)));
    const y = Math.round(bottom - h - 12);

    // Shadow, border, body, little pointer
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x + 6, y + 6, w, h);
    ctx.fillStyle = '#253a4f'; ctx.fillRect(x - 4, y - 4, w + 8, h + 8);
    ctx.fillStyle = '#f4f8fc'; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#a7c0d6'; ctx.fillRect(x, y + h - 6, w, 6);
    const px = Math.round(Math.max(x + 16, Math.min(x + w - 16, cx)));
    ctx.fillStyle = '#253a4f';
    ctx.beginPath(); ctx.moveTo(px - 14, y + h + 4); ctx.lineTo(px + 14, y + h + 4); ctx.lineTo(px, y + h + 20); ctx.fill();
    ctx.fillStyle = '#a7c0d6';
    ctx.beginPath(); ctx.moveTo(px - 8, y + h); ctx.lineTo(px + 8, y + h); ctx.lineTo(px, y + h + 10); ctx.fill();

    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#253a4f';
    ctx.font = '18px "Press Start 2P", monospace';
    ctx.fillText(title, x + w / 2, y + 30);
    const blink = Math.floor(this.time * 2.5) % 2 === 0;
    ctx.fillStyle = blink ? '#ff5a1f' : '#253a4f';
    ctx.font = '14px "Press Start 2P", monospace';
    ctx.fillText(hint, x + w / 2, y + 54);

    this.promptRect = { x: x - 10, y: y - 10, w: w + 20, h: h + 30 };
  },

  /* Flashing "FINISH!" across the screen. */
  drawFinish(ctx) {
    const colors = ['#ffec27', '#ff004d', '#29adff', '#00e436', '#ffffff'];
    const c = colors[Math.floor(this.time * 10) % colors.length];
    const pop = Math.min(1, (2.8 - this.finishTimer) * 6);   // scale-in
    ctx.save();
    ctx.translate(this.viewW / 2, 230);
    ctx.scale(pop, pop);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '72px "Press Start 2P", monospace';
    ctx.fillStyle = '#1e2a38'; ctx.fillText('FINISH!', 6, 6);
    ctx.fillStyle = c; ctx.fillText('FINISH!', 0, 0);
    ctx.restore();
  },

  /* ---------------------------------------------------------------
     ACTIONS
     --------------------------------------------------------------- */
  start() {
    Sound.unlock();
    Sound.play('open');
    Music.start();
    Input.reset();
    UI.hideTitle();
    this.state = 'playing';
    this.canvas.focus();
  },

  enterStop(stop) {
    this.state = 'popup';
    Input.reset();
    Sound.play('open');
    if (stop.type === 'postOffice') {
      Resume.shownThisRide = true;
      Resume.openResume();
    } else {
      stop.visited = true;
      UI.markVisited(stop.index);
      UI.openProject(stop.project);
    }
  },

  /* Called by the UI whenever a pop-up closes. */
  onPopupClosed() {
    Input.reset();
    Music.duck(false);
    this.interactCooldown = 0.3;
    if (this.state === 'popup') this.state = UI.titleVisible ? 'title' : 'playing';
    this.canvas.focus();
  },

  onPopupOpened() {
    if (this.state !== 'loading') this.state = 'popup';
    Input.reset();
    Music.duck(true);
  },

  rideAgain() {
    Particles.clear();
    this.player.reset(CONFIG.LEVEL.startX);
    this.camX = 0;
    this.finished = false;
    this.finishTimer = 0;
    this.level.stops.forEach(s => (s.visited = false));
    UI.resetVisited();
    Coins.reset();
    Resume.close({ quiet: true });
    Resume.shownThisRide = false;
    UI.closeModal();
    Music.duck(false);
    Input.reset();
    if (UI.titleVisible) this.start();
    else { this.state = 'playing'; this.canvas.focus(); }
  },

  /* Tapping the prompt bubble (or the building itself) enters the stop. */
  onCanvasTap(e) {
    if (e.pointerType === 'touch' && !this.isTouch) { this.isTouch = true; UI.showTouchControls(); }
    if (this.state !== 'playing' || !this.activeStop) return;
    const r = this.canvas.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width * this.viewW;
    const y = (e.clientY - r.top) / r.height * this.H;
    const s = this.activeStop, camX = this.camX;
    const inPrompt = this.promptRect && x >= this.promptRect.x && x <= this.promptRect.x + this.promptRect.w &&
      y >= this.promptRect.y && y <= this.promptRect.y + this.promptRect.h;
    const inBuilding = x >= s.x - camX && x <= s.x + s.w - camX && y >= this.level.groundY - s.h && y <= this.level.groundY;
    if (inPrompt || inBuilding) this.enterStop(s);
  },
};

window.addEventListener('DOMContentLoaded', () => Game.boot());
