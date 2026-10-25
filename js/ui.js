/* =====================================================================
   ui.js — EVERYTHING THAT ISN'T THE CANVAS
   ---------------------------------------------------------------------
   Loading bar, title screen, HUD (mini-map + mute), pop-ups (project
   gallery, post office, letter form, list view) and touch controls.
   Pop-ups are normal HTML so text stays sharp and readable on phones.
   ===================================================================== */

/* Where each button lives inside assets/ui/buttons.webp: [left, top, right, bottom]
   If you replace that sheet, update these numbers (or use your own images). */
const SPRITE_SHEET = { w: 2000, h: 1545 };
const SPRITES = {
  quit:  [128, 128, 562, 318],  pause: [652, 128, 878, 320],  close: [916, 128, 1146, 318],
  gear:  [1192, 128, 1422, 320], home: [1460, 128, 1690, 320],
  power: [116, 348, 346, 538],  undo:  [380, 348, 610, 538],  reset: [660, 348, 1134, 538],
  search:[1192, 348, 1422, 538], save: [1468, 348, 1698, 538],
  setting:[116, 580, 610, 766], mail:  [660, 580, 890, 766],  share: [928, 580, 1154, 766],
  no:    [1204, 568, 1422, 778], yes:  [1480, 568, 1698, 778],
  pauseText: [132, 796, 598, 986], play: [660, 796, 890, 986], menu: [928, 792, 1154, 986],
  saveText: [1232, 796, 1698, 986],
};

const UI = {
  titleVisible: false,
  modalOpen: false,
  lastFocus: null,
  gallery: null,   // { images, index }

  $(id) { return document.getElementById(id); },

  init() {
    this.$('title-name').textContent = CONFIG.OWNER_NAME.toUpperCase();
    this.$('title-tag').textContent = CONFIG.OWNER_TAGLINE;
    document.title = CONFIG.OWNER_NAME + ' · ' + CONFIG.OWNER_TAGLINE;

    this.applySprites(document);
    this.updateMuteButton();
    if (Game.isTouch) this.showTouchControls();

    this.$('btn-start').addEventListener('click', () => Game.start());
    this.$('title-skip').addEventListener('click', () => this.openList());
    this.$('skip-link').addEventListener('click', e => { e.preventDefault(); this.openList(); });
    this.$('btn-list').addEventListener('click', () => { Sound.play('blip'); this.openList(); });
    this.$('btn-mute').addEventListener('click', () => {
      Sound.unlock();
      Sound.setMuted(!Sound.muted);
      this.updateMuteButton();
      Sound.play('blip');
      this.$('btn-mute').blur();
    });
    this.$('btn-music').addEventListener('click', () => {
      Music.toggle();
      this.updateMusicButton();
      this.$('btn-music').blur();
    });
    this.updateMusicButton();
    this.$('dialog-close').addEventListener('click', () => this.closeModal());
    // Click the dark backdrop to close.
    this.$('modal').addEventListener('pointerdown', e => { if (e.target.id === 'modal') this.closeModal(); });

    window.addEventListener('keydown', e => this.onKey(e));
  },

  onKey(e) {
    if (this.modalOpen) {
      if (e.key === 'Escape') { e.preventDefault(); this.closeModal(); }
      const typing = /INPUT|TEXTAREA/.test(e.target.tagName);
      if (this.gallery && !typing) {
        if (e.key === 'ArrowLeft') this.galleryStep(-1);
        if (e.key === 'ArrowRight') this.galleryStep(1);
      }
      if (e.key === 'Tab') this.trapFocus(e);
      return;
    }
    // Title screen: SPACE (or Enter) starts the game — no mouse needed.
    // Exception: Enter on the "skip the game" link still opens the list.
    if (this.titleVisible && Game.state === 'title') {
      const onSkip = e.target && e.target.id === 'title-skip';
      if (e.code === 'Space' || (e.code === 'Enter' && !onSkip)) {
        e.preventDefault();
        Game.start();
      }
    }
  },

  /* ---------- sprites from the button sheet ---------- */
  applySprites(root) {
    root.querySelectorAll('[data-sprite]').forEach(el => {
      const r = SPRITES[el.dataset.sprite];
      if (!r) return;
      const h = +(el.dataset.size || 48), s = h / (r[3] - r[1]);
      el.style.width = Math.round((r[2] - r[0]) * s) + 'px';
      el.style.height = h + 'px';
      el.style.backgroundImage = `url("${CONFIG.ART.buttons}")`;
      el.style.backgroundSize = `${SPRITE_SHEET.w * s}px ${SPRITE_SHEET.h * s}px`;
      el.style.backgroundPosition = `${-r[0] * s}px ${-r[1] * s}px`;
    });
  },

  /* ---------- loading + title ---------- */
  setLoading(f) { this.$('load-fill').style.width = Math.round(f * 100) + '%'; },

  showTitle() {
    this.$('loading').classList.add('hidden');
    this.$('title').classList.remove('hidden');
    this.titleVisible = true;
    const touch = Game.isTouch;
    this.$('controls-keys').classList.toggle('hidden', touch);
    this.$('controls-touch').classList.toggle('hidden', !touch);
    this.$('start-label').textContent = touch ? 'TAP TO START' : 'PRESS SPACE TO START';
    // Make sure key presses reach the page straight away.
    window.focus();
    this.$('btn-start').focus({ preventScroll: true });
  },

  hideTitle() {
    this.$('title').classList.add('hidden');
    this.$('hud').classList.remove('hidden');
    this.titleVisible = false;
  },

  showTouchControls() {
    this.$('touch-controls').classList.remove('hidden');
    document.body.classList.add('touch');
    if (this.titleVisible) this.showTitle();
  },

  setEnterButton(show) { this.$('tc-enter').classList.toggle('hidden', !show); },

  /* ---------- HUD mini-map ---------- */
  buildHUD(level) {
    const track = this.$('hud-track');
    const pct = x => (x / level.width * 100).toFixed(2) + '%';
    level.stops.forEach((s, i) => {
      const m = document.createElement('div');
      m.className = 'hud-stop';
      m.style.left = pct(s.x + s.w / 2);
      m.dataset.index = i;
      m.title = s.project.title;
      track.appendChild(m);
    });
    const flag = document.createElement('div');
    flag.className = 'hud-flag';
    flag.style.left = pct(level.flag.lineX);
    track.appendChild(flag);
    const po = document.createElement('div');
    po.className = 'hud-po';
    po.style.left = pct(level.postOffice.x + level.postOffice.w / 2);
    track.appendChild(po);
    this.updateHUD(CONFIG.LEVEL.startX / level.width);
  },

  updateHUD(f) {
    const p = (Math.max(0, Math.min(1, f)) * 100).toFixed(2) + '%';
    this.$('hud-rider').style.left = p;
    this.$('hud-fill').style.width = p;
  },

  updateCoins(n, total) {
    const el = this.$('hud-coins');
    el.textContent = `${n}/${total}`;
    const box = el.parentElement;
    box.classList.remove('bump'); void box.offsetWidth;
    if (n > 0) box.classList.add('bump');
  },

  markVisited(i) {
    const m = document.querySelector(`.hud-stop[data-index="${i}"]`);
    if (m) m.classList.add('visited');
  },
  resetVisited() { document.querySelectorAll('.hud-stop.visited').forEach(m => m.classList.remove('visited')); },

  updateMuteButton() {
    const on = !Sound.muted;
    const waves = on ? '<path d="M10 4h1v1h1v6h-1v1h-1V4zM12 2h1v1h1v10h-1v1h-1V2z"/>' : '<path d="M10 5h1v1h1V5h1v1h-1v1h1v1h-1v1h1v1h-1V9h-1v1h-1V9h1V8h-1V7h1V6h-1z" transform="translate(0 1)"/>';
    this.$('btn-mute').innerHTML =
      `<svg viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true"><path d="M2 6h3l3-3h1v10H8l-3-3H2z"/>${waves}</svg>`;
    this.$('btn-mute').setAttribute('aria-label', on ? 'Mute sound' : 'Unmute sound');
    this.$('btn-mute').classList.toggle('is-muted', !on);
  },

  /* Pixel music-note icon; a slash through it when the music is off. */
  updateMusicButton() {
    const on = Music.on;
    const slash = on ? '' : '<path fill="#e2502f" d="M2 2h2v1h1v1h1v1h1v1h1v1h1v1h1v1h1v1h1v1h1v1h1v1h1v2h-2v-1h-1v-1h-1v-1h-1v-1h-1v-1h-1v-1h-1v-1h-1v-1h-1v-1h-1v-1h-1z"/>';
    this.$('btn-music').innerHTML =
      `<svg viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true"><path d="M6 2h8v9h-1v1h-3v-1H9V9h1V8h2V5H8v7H7v1H4v-1H3v-2h1V9h2z"/>${slash}</svg>`;
    this.$('btn-music').setAttribute('aria-label', on ? 'Turn music off' : 'Turn music on');
    this.$('btn-music').classList.toggle('is-muted', !on);
  },

  /* ---------------------------------------------------------------
     MODAL — one dialog box, different content
     --------------------------------------------------------------- */
  openModal(html, className = '') {
    const modal = this.$('modal'), content = this.$('dialog-content');
    if (!this.modalOpen) this.lastFocus = document.activeElement;
    content.innerHTML = html;
    content.scrollTop = 0;
    modal.querySelector('.dialog').className = 'dialog ' + className;
    this.applySprites(content);
    modal.classList.remove('hidden');
    // restart the pop-in animation
    modal.classList.remove('pop'); void modal.offsetWidth; modal.classList.add('pop');
    this.modalOpen = true;
    this.gallery = null;
    Game.onPopupOpened();
    const first = content.querySelector('[autofocus]') || this.$('dialog-close');
    setTimeout(() => first.focus({ preventScroll: true }), 30);
  },

  closeModal() {
    if (!this.modalOpen) return;
    this.$('modal').classList.add('hidden');
    this.modalOpen = false;
    this.gallery = null;
    Sound.play('blip');
    Game.onPopupClosed();
    if (this.titleVisible && this.lastFocus) this.lastFocus.focus({ preventScroll: true });
  },

  trapFocus(e) {
    const items = [...this.$('modal').querySelectorAll('button, a[href], input, textarea')].filter(el => el.offsetParent);
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  },

  /* ---------- PROJECT pop-up ---------- */
  openProject(p, fromList = false) {
    const images = p.gallery || [];
    const paragraphs = String(p.description || '').split(/\n\s*\n/).map(t => `<p>${esc(t)}</p>`).join('');
    const links = (p.links || []).map(l =>
      `<a class="pbtn small" href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)} &#8599;</a>`).join('');

    this.openModal(`
      <header class="dialog-header">
        <h2 id="dialog-title" class="pixel">${esc(p.title)}</h2>
        ${p.subtitle ? `<p class="subtitle">${esc(p.subtitle)}</p>` : ''}
        ${p.concept ? `<blockquote class="concept">${esc(p.concept)}</blockquote>` : ''}
      </header>
      ${images.length ? `
      <div class="gallery">
        <div class="gallery-frame">
          <img id="g-img" alt="">
          ${images.length > 1 ? `
          <button class="g-arrow g-prev" aria-label="Previous image"><svg viewBox="0 0 8 8" shape-rendering="crispEdges"><path d="M5 1h1v6H5V6H4V5H3V3h1V2h1z"/></svg></button>
          <button class="g-arrow g-next" aria-label="Next image"><svg viewBox="0 0 8 8" shape-rendering="crispEdges"><path d="M2 1h1v1h1v1h1v2H4v1H3v1H2z"/></svg></button>` : ''}
        </div>
        <div class="gallery-meta"><span id="g-caption"></span><span class="pixel" id="g-count"></span></div>
        <p class="gallery-credit" id="g-credit"></p>
      </div>` : ''}
      <div class="dialog-text">${paragraphs}</div>
      ${links ? `<div class="dialog-links">${links}</div>` : ''}
      <div class="dialog-actions">
        ${fromList ? `<button class="pbtn" id="act-list">&#9664; All projects</button>` : ''}
        <button class="pbtn primary" id="act-back" autofocus>Back to the track</button>
      </div>`, 'project');

    if (images.length) {
      this.gallery = { images, index: 0, credit: p.credit || '' };
      this.showGalleryImage();
      const frame = this.$('dialog-content').querySelector('.gallery-frame');
      frame.querySelector('.g-prev')?.addEventListener('click', () => this.galleryStep(-1));
      frame.querySelector('.g-next')?.addEventListener('click', () => this.galleryStep(1));
      // swipe on phones
      let sx = null;
      frame.addEventListener('pointerdown', e => { sx = e.clientX; });
      frame.addEventListener('pointerup', e => {
        if (sx !== null && Math.abs(e.clientX - sx) > 40) this.galleryStep(e.clientX < sx ? 1 : -1);
        sx = null;
      });
    }
    this.$('act-back').addEventListener('click', () => this.closeModal());
    this.$('act-list')?.addEventListener('click', () => this.openList());
  },

  galleryStep(d) {
    const g = this.gallery;
    if (!g || g.images.length < 2) return;
    g.index = (g.index + d + g.images.length) % g.images.length;
    Sound.play('blip');
    this.showGalleryImage();
  },

  showGalleryImage() {
    const g = this.gallery, item = g.images[g.index];
    const img = this.$('g-img');
    img.src = item.src;
    img.alt = item.caption || '';
    this.$('g-caption').textContent = item.caption || '';
    this.$('g-count').textContent = g.images.length > 1 ? `${g.index + 1}/${g.images.length}` : '';
    // Credit line: the image's own credit, or the project's.
    const credit = item.credit != null ? item.credit : g.credit;
    this.$('g-credit').textContent = credit || '';
    this.$('g-credit').hidden = !credit;
  },

  /* (The post office opens the resume — see js/resume.js.) */

  /* ---------- LETTER (contact form) ---------- */
  openLetter() {
    this.openModal(`
      <form class="letter" id="letter" novalidate>
        <div class="stamp" aria-hidden="true"><span class="sprite" data-sprite="mail" data-size="40"></span></div>
        <div class="postmark pixel" aria-hidden="true">PORTFOLIO<br>POST</div>
        <h2 id="dialog-title" class="letter-greeting">${esc(POST_OFFICE.letterGreeting)}</h2>
        <label class="letter-msg">
          <span class="sr-only">Your message</span>
          <textarea name="message" rows="7" required placeholder="Write your message here..." autofocus></textarea>
        </label>
        <div class="letter-from">
          <span class="from-label">From,</span>
          <label><span>Your name</span><input name="name" autocomplete="name" required></label>
          <label><span>Your email</span><input name="email" type="email" autocomplete="email" required></label>
        </div>
        <input type="text" name="_gotcha" class="honeypot" tabindex="-1" autocomplete="off" aria-hidden="true">
        <p class="form-error" id="form-error" role="alert"></p>
        <div class="dialog-actions">
          <button type="button" class="pbtn" id="act-cancel">Back to the track</button>
          <button type="submit" class="pbtn primary">Send &#9993;</button>
        </div>
      </form>
      <div class="mail-anim" id="mail-anim" aria-hidden="true">
        <div class="mailbox"><div class="mb-door"></div><div class="mb-flag"></div><div class="mb-post"></div></div>
        <div class="envelope"><div class="env-flap"></div></div>
      </div>`, 'letter-dialog');
    this.$('act-cancel').addEventListener('click', () => this.closeModal());
    this.$('letter').addEventListener('submit', e => { e.preventDefault(); this.sendLetter(e.target); });
  },

  async sendLetter(form) {
    const data = {
      name: form.name.value.trim(),
      email: form.email.value.trim(),
      message: form.message.value.trim(),
    };
    const err = this.$('form-error');
    if (form._gotcha.value) return;   // a bot filled the hidden field
    if (!data.message) { err.textContent = 'Your letter is empty!'; form.message.focus(); return; }
    if (!data.name) { err.textContent = 'Please sign your name.'; form.name.focus(); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) { err.textContent = 'Please add an email so I can write back.'; form.email.focus(); return; }
    err.textContent = '';

    // Play the envelope → mailbox animation while the letter is sent.
    this.$('dialog-content').classList.add('sending');
    Sound.play('send');
    const animation = wait(1900);

    let ok = true, viaMailto = !CONFIG.FORM_ENDPOINT;
    if (!viaMailto) {
      try {
        const res = await fetch(CONFIG.FORM_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ ...data, _subject: 'Portfolio letter from ' + data.name }),
        });
        ok = res.ok;
      } catch (e) { ok = false; }
    }
    await animation;
    this.$('dialog-content').classList.remove('sending');

    if (viaMailto) window.location.href = mailtoLink(data);
    if (ok) this.openSent(viaMailto);
    else this.openSendError(data);
  },

  openSent(viaMailto) {
    this.openModal(`
      <header class="dialog-header center"><h2 id="dialog-title" class="pixel">Letter sent!</h2></header>
      <div class="dialog-text center">
        <p class="lead">${esc(POST_OFFICE.sentMessage)}</p>
        ${viaMailto ? `<p class="small-note">Your email app should open with the letter ready. Just press send there.</p>` : ''}
      </div>
      <div class="dialog-actions center">
        <button class="pbtn" id="act-back">Back to the track</button>
        <button class="pbtn primary" id="act-again" autofocus>&#8635; Ride again</button>
      </div>`, 'post');
    this.$('act-back').addEventListener('click', () => this.closeModal());
    this.$('act-again').addEventListener('click', () => Game.rideAgain());
  },

  openSendError(data) {
    this.openModal(`
      <header class="dialog-header center"><h2 id="dialog-title" class="pixel">Oops!</h2></header>
      <div class="dialog-text center">
        <p class="lead">The mail truck broke down and your letter didn't go through.</p>
        <p>You can send it from your own email app instead:</p>
      </div>
      <div class="dialog-actions center">
        <button class="pbtn" id="act-retry">Try again</button>
        <a class="pbtn primary" href="${esc(mailtoLink(data))}" autofocus>Open my email app</a>
      </div>`, 'post');
    this.$('act-retry').addEventListener('click', () => {
      this.openLetter();
      const f = this.$('letter');
      f.name.value = data.name; f.email.value = data.email; f.message.value = data.message;
    });
  },

  /* ---------- LIST VIEW (skip the game) ---------- */
  openList() {
    const cards = PROJECTS.map((p, i) => {
      const thumb = (p.gallery && p.gallery[0] && p.gallery[0].src) || p.stopImage;
      return `
        <button class="card" data-i="${i}">
          <span class="card-thumb"><img src="${esc(thumb)}" alt="" loading="lazy"></span>
          <span class="card-title pixel">${esc(p.title)}</span>
          <span class="card-sub">${esc(p.subtitle || '')}</span>
        </button>`;
    }).join('');
    this.openModal(`
      <header class="dialog-header">
        <h2 id="dialog-title" class="pixel">All projects</h2>
        <p class="subtitle">${esc(CONFIG.OWNER_NAME)} · ${esc(CONFIG.OWNER_TAGLINE)}</p>
      </header>
      <div class="card-grid">${cards}</div>
      ${FUN_FACTS.length ? `
      <h3 class="facts-heading pixel">Fun facts about me</h3>
      <ul class="facts-list">${FUN_FACTS.map(f => `<li>${esc(f)}</li>`).join('')}</ul>` : ''}
      <div class="dialog-actions">
        <button class="pbtn" id="act-resume">&#128196; View my r&eacute;sum&eacute;</button>
        <button class="pbtn" id="act-letter">&#9993; Write me a letter</button>
        <button class="pbtn primary" id="act-back" autofocus>${this.titleVisible ? 'Play the game' : 'Back to the track'}</button>
      </div>`, 'list');
    this.$('dialog-content').querySelectorAll('.card').forEach(c =>
      c.addEventListener('click', () => { Sound.play('open'); this.openProject(PROJECTS[+c.dataset.i], true); }));
    this.$('act-letter').addEventListener('click', () => this.openLetter());
    this.$('act-resume').addEventListener('click', () => {
      // Close the list quietly (no state change), then fly the resume in.
      this.$('modal').classList.add('hidden');
      this.modalOpen = false;
      this.gallery = null;
      Resume.openResume();
    });
    this.$('act-back').addEventListener('click', () => {
      const fromTitle = this.titleVisible;
      this.closeModal();
      if (fromTitle) Game.start();
    });
  },
};

/* ---------- small helpers ---------- */
function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function wait(ms) { return new Promise(r => setTimeout(r, ms)); }
function mailtoLink(d) {
  const subject = 'Portfolio letter from ' + d.name;
  const body = `${d.message}\n\n— ${d.name} (${d.email})`;
  return `mailto:${CONFIG.OWNER_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
