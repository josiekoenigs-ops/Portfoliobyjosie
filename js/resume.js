/* =====================================================================
   resume.js — THE RESUME AT THE END OF THE TRACK
   ---------------------------------------------------------------------
   When the rider reaches the post office (after the finish line), a
   folded letter flies onto the screen, unfolds in 3D, and shows the
   resume printed on old, wrinkled paper. At the bottom: "Mail me a
   letter" or "Back to the track".

   The resume itself is an image (CONFIG.RESUME.image) so it keeps your
   exact layout; the paper look (colour, wrinkles, stains, fold creases,
   rough edges) is drawn with CSS on top of it — see "RESUME" in style.css.
   ===================================================================== */

const Resume = {
  open: false,
  busy: false,               // true while the fly-in / unfold animation plays
  shownThisRide: false,      // auto-open only once per ride

  init() {
    this.root = document.getElementById('resume');
    this.scroll = document.getElementById('resume-scroll');
    this.stage = document.getElementById('resume-stage');
    this.paper = document.getElementById('resume-paper');
    this.fold = document.getElementById('resume-fold');

    // One shared wrinkle texture + ragged edge so every copy of the paper matches.
    this.root.style.setProperty('--wrinkle', `url("${this.wrinkleTexture()}")`);
    this.edge = this.raggedEdge();

    this.root.addEventListener('click', e => {
      const act = e.target.closest('[data-act]');
      if (act && !this.busy) this.action(act.dataset.act);
      else if (e.target === this.scroll && !this.busy) this.close();   // click outside the paper
    });
    window.addEventListener('keydown', e => {
      if (this.open && e.key === 'Escape' && !this.busy) { e.preventDefault(); this.close(); }
    });
  },

  /* The paper's content: background, the resume image ("ink"), texture layers, and the footer. */
  faceHTML() {
    const R = CONFIG.RESUME;
    return `
      <div class="face" style="clip-path:${this.edge}">
        <div class="paper-bg"></div>
        <img class="paper-ink" src="${esc(R.image)}" alt="${esc(R.alt)}" draggable="false">
        <div class="paper-footer">
          <p class="paper-note">${esc(POST_OFFICE.title)} ${esc(POST_OFFICE.message)}</p>
          <div class="paper-actions">
            <button class="pbtn primary" data-act="letter">&#9993; Mail me a letter</button>
            <button class="pbtn" data-act="track">Back to the track</button>
          </div>
          <p class="paper-links">
            ${R.pdf ? `<a href="${esc(R.pdf)}" target="_blank" rel="noopener" download>Download PDF</a> &middot; ` : ''}
            <button class="paper-link-btn" data-act="again">&#8635; Ride again</button>
          </p>
        </div>
        <div class="paper-wrinkles"></div>
        <div class="paper-creases"></div>
        <div class="paper-burn"></div>
      </div>`;
  },

  /* ---------------------------------------------------------------
     OPEN — fly in folded, unfold, settle
     --------------------------------------------------------------- */
  async openResume({ animate = true } = {}) {
    if (this.open) return;
    this.open = true;
    this.busy = true;
    Game.onPopupOpened();
    Input.reset();

    // Build the real paper (hidden) so we can measure it.
    this.paper.innerHTML = this.faceHTML();
    this.paper.style.visibility = 'hidden';
    this.fold.innerHTML = '';
    this.stage.style.transform = '';
    this.root.classList.remove('hidden');
    this.root.classList.add('show');
    this.scroll.scrollTop = 0;
    this.scroll.classList.add('locked');
    const img = this.paper.querySelector('img');
    try { await img.decode(); } catch (e) {}

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (animate && !reduce) await this.playUnfold();

    this.fold.innerHTML = '';
    this.paper.style.visibility = 'visible';
    this.stage.getAnimations().forEach(a => a.cancel());
    this.stage.style.transform = '';
    this.scroll.classList.remove('locked');
    this.busy = false;
    const first = this.paper.querySelector('[data-act="letter"]');
    if (first) first.focus({ preventScroll: true });
  },

  async playUnfold() {
    const H = this.paper.offsetHeight;
    const third = Math.round(H / 3);
    const heights = [third, third, H - third * 2];
    const tops = [0, third, third * 2];
    const face = this.faceHTML();

    // Three panels, each showing one third of the paper. The top and bottom
    // panels start folded over the middle one (we see their plain back side).
    this.fold.style.height = H + 'px';
    this.fold.innerHTML = [0, 1, 2].map(i => `
      <div class="panel panel-${i}" style="top:${tops[i]}px;height:${heights[i]}px">
        <div class="side front"><div class="face-window" style="top:${-tops[i]}px">${face}</div></div>
        ${i !== 1 ? `<div class="side back">${i === 0 ? `<span class="back-label">${esc(CONFIG.OWNER_NAME)}<br>R&eacute;sum&eacute;</span>` : ''}</div>` : ''}
      </div>`).join('');
    const [top, , bottom] = this.fold.querySelectorAll('.panel');
    const folded = { top: 'translateZ(2px) rotateX(-180deg)', bottom: 'translateZ(1px) rotateX(180deg)', flat: 'translateZ(0) rotateX(0deg)' };
    top.style.transform = folded.top;
    bottom.style.transform = folded.bottom;

    // Put the folded packet (the middle third) in the centre of the screen.
    const vh = this.scroll.clientHeight;
    const stageTop = this.stage.getBoundingClientRect().top - this.scroll.getBoundingClientRect().top;
    const centreY = Math.round(vh / 2 - stageTop - H / 2);
    const settleY = 0;                     // finish with the top of the paper in view
    const vw = window.innerWidth;

    // 1) Fly in from the top-right, spinning.
    Sound.play('paper');
    await this.stage.animate([
      { transform: `translate(${vw * 0.7}px, ${centreY - vh}px) rotate(-38deg) scale(0.35)` },
      { transform: `translate(${vw * 0.1}px, ${centreY - 40}px) rotate(8deg) scale(0.85)`, offset: 0.7 },
      { transform: `translate(0px, ${centreY}px) rotate(-3deg) scale(1)` },
    ], { duration: 950, easing: 'cubic-bezier(0.2, 0.8, 0.25, 1)', fill: 'forwards' }).finished;

    // 2) Unfold the top flap, then the bottom flap.
    Sound.play('paper');
    await top.animate([{ transform: folded.top }, { transform: folded.flat }],
      { duration: 620, easing: 'cubic-bezier(0.35, 0, 0.25, 1)', fill: 'forwards' }).finished;
    Sound.play('paper');
    await bottom.animate([{ transform: folded.bottom }, { transform: folded.flat }],
      { duration: 620, easing: 'cubic-bezier(0.35, 0, 0.25, 1)', fill: 'forwards' }).finished;

    // 3) Straighten and slide so the top of the resume is visible.
    await this.stage.animate([
      { transform: `translate(0px, ${centreY}px) rotate(-3deg) scale(1)` },
      { transform: `translate(0px, ${settleY}px) rotate(0deg) scale(1)` },
    ], { duration: 650, easing: 'cubic-bezier(0.3, 0.7, 0.3, 1)', fill: 'forwards' }).finished;
  },

  /* ---------------------------------------------------------------
     CLOSE + BUTTONS
     --------------------------------------------------------------- */
  close({ quiet = false } = {}) {
    if (!this.open) return;
    this.open = false;
    this.busy = false;
    this.root.classList.remove('show');
    this.root.classList.add('hidden');
    this.paper.innerHTML = '';
    this.fold.innerHTML = '';
    if (!quiet) { Sound.play('blip'); Game.onPopupClosed(); }
  },

  action(act) {
    if (act === 'track') this.close();
    if (act === 'letter') { this.close({ quiet: true }); Sound.play('open'); UI.openLetter(); }
    if (act === 'again') { this.close({ quiet: true }); Game.rideAgain(); }
  },

  /* ---------------------------------------------------------------
     PAPER TEXTURES (made once, in code)
     --------------------------------------------------------------- */

  /* Crumpled-paper shading: SVG noise lit from the top-left. */
  wrinkleTexture() {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1500" viewBox="0 0 900 1500" preserveAspectRatio="none">
      <filter id="w" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.007 0.011" numOctaves="5" seed="11"/>
        <feDiffuseLighting lighting-color="#fff" surfaceScale="5"><feDistantLight azimuth="225" elevation="48"/></feDiffuseLighting>
        <feComponentTransfer><feFuncR type="linear" slope="0.6" intercept="0.45"/><feFuncG type="linear" slope="0.6" intercept="0.43"/><feFuncB type="linear" slope="0.6" intercept="0.38"/></feComponentTransfer>
      </filter>
      <rect width="900" height="1500" filter="url(#w)"/>
    </svg>`;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg).replace(/'/g, '%27').replace(/"/g, '%22');
  },

  /* Slightly torn, uneven edges as a clip-path polygon (in %, so it fits any size). */
  raggedEdge() {
    let seed = 4;
    const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
    const pts = [], N = 26, j = () => (rnd() * 0.7).toFixed(2);
    for (let i = 0; i <= N; i++) pts.push(`${(i / N * 100).toFixed(2)}% ${j()}%`);              // top
    for (let i = 1; i <= N * 2; i++) pts.push(`${(100 - rnd() * 0.9).toFixed(2)}% ${(i / (N * 2) * 100).toFixed(2)}%`); // right
    for (let i = N - 1; i >= 0; i--) pts.push(`${(i / N * 100).toFixed(2)}% ${(100 - rnd() * 0.5).toFixed(2)}%`); // bottom
    for (let i = N * 2 - 1; i >= 1; i--) pts.push(`${(rnd() * 0.9).toFixed(2)}% ${(i / (N * 2) * 100).toFixed(2)}%`);  // left
    return `polygon(${pts.join(',')})`;
  },
};
