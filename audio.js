/* =====================================================================
   audio.js — RETRO SOUND EFFECTS
   ---------------------------------------------------------------------
   By default every sound is synthesized (no files needed) with the Web
   Audio API, like an old console chip. To use your own files, set the
   paths in CONFIG.SOUNDS. Mute state is remembered between visits.
   ===================================================================== */

const Sound = {
  ctx: null,
  muted: false,
  files: {},

  init() {
    try { this.muted = localStorage.getItem('portfolio-muted') === '1'; } catch (e) {}
    for (const [name, src] of Object.entries(CONFIG.SOUNDS)) {
      if (src) { const a = new Audio(src); a.preload = 'auto'; this.files[name] = a; }
    }
  },

  /* Browsers only allow audio after a click/tap/key, so this is called on Start. */
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) this.ctx = new AC();
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  },

  setMuted(m) {
    this.muted = m;
    try { localStorage.setItem('portfolio-muted', m ? '1' : '0'); } catch (e) {}
  },

  play(name) {
    if (this.muted) return;
    if (this.files[name]) {
      const a = this.files[name].cloneNode();
      a.volume = 0.6;
      a.play().catch(() => {});
      return;
    }
    if (!this.ctx) return;
    const s = this.SYNTH[name];
    if (s) s.call(this, this.ctx.currentTime);
  },

  /* One square/triangle "beep" with a pitch slide. */
  tone(t, { freq = 440, to = null, dur = 0.1, type = 'square', vol = 0.08, delay = 0 }) {
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t + delay);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + delay + dur);
    g.gain.setValueAtTime(vol, t + delay);
    g.gain.exponentialRampToValueAtTime(0.0001, t + delay + dur);
    o.connect(g).connect(this.ctx.destination);
    o.start(t + delay);
    o.stop(t + delay + dur + 0.02);
  },

  noise(t, { dur = 0.2, vol = 0.05, delay = 0, filter = 1200 }) {
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource(), g = this.ctx.createGain(), f = this.ctx.createBiquadFilter();
    src.buffer = buf; f.type = 'lowpass'; f.frequency.value = filter; g.gain.value = vol;
    src.connect(f).connect(g).connect(this.ctx.destination);
    src.start(t + delay);
  },

  SYNTH: {
    blip(t)   { this.tone(t, { freq: 880, dur: 0.06, vol: 0.05 }); },
    coin(t)   { this.tone(t, { freq: 988, dur: 0.07, vol: 0.06 }); this.tone(t, { freq: 1319, dur: 0.32, delay: 0.07, vol: 0.06 }); },
    open(t)   { this.tone(t, { freq: 523, dur: 0.08 }); this.tone(t, { freq: 784, dur: 0.12, delay: 0.08 }); },
    jump(t)   { this.tone(t, { freq: 300, to: 700, dur: 0.15, vol: 0.06 }); },
    land(t)   { this.noise(t, { dur: 0.08, vol: 0.06, filter: 500 }); },
    finish(t) { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => this.tone(t, { freq: f, dur: 0.14, delay: i * 0.11, vol: 0.07 })); },
    send(t)   { this.noise(t, { dur: 0.5, vol: 0.05, filter: 2500 }); this.tone(t, { freq: 1319, dur: 0.3, delay: 0.9, type: 'triangle', vol: 0.12 }); this.tone(t, { freq: 1760, dur: 0.4, delay: 1.0, type: 'triangle', vol: 0.12 }); },
  },
};


/* =====================================================================
   BACKGROUND MUSIC
   ---------------------------------------------------------------------
   A little 8-bar chiptune loop played by the Web Audio "chip" above
   (square-wave melody + triangle bass, chords C – Am – F – G).
   Set CONFIG.MUSIC.src to use your own audio file instead.
   ===================================================================== */

const Music = {
  on: true,                // visitor's preference (remembered)
  playing: false,
  el: null,                // <audio> element when using your own file
  gain: null,              // volume knob for the built-in tune
  timer: null,
  step: 0,
  nextTime: 0,

  // One number per eighth-note: MIDI note (60 = middle C), 0 = rest. 8 bars × 8.
  MELODY: [
    72, 0, 76, 79, 76, 0, 72, 74,   76, 0, 72, 69, 72, 0, 76, 0,
    77, 0, 76, 74, 72, 0, 69, 72,   74, 0, 71, 67, 71, 74, 79, 0,
    79, 0, 76, 79, 84, 0, 79, 76,   81, 0, 79, 76, 72, 0, 76, 79,
    77, 76, 74, 72, 74, 0, 77, 81,  79, 0, 74, 71, 67, 0, 0, 0,
  ],
  BASS_ROOTS: [48, 45, 41, 43, 48, 45, 41, 43],   // C, A, F, G (one per bar)

  init() {
    try { this.on = localStorage.getItem('portfolio-music') !== '0'; } catch (e) {}
    if (CONFIG.MUSIC.src) {
      this.el = new Audio(CONFIG.MUSIC.src);
      this.el.loop = true;
      this.el.volume = CONFIG.MUSIC.volume;
    }
  },

  start() {
    if (!this.on || this.playing) return;
    Sound.unlock();
    this.playing = true;
    if (this.el) { this.el.play().catch(() => {}); return; }
    const ctx = Sound.ctx;
    if (!ctx) return;
    this.gain = ctx.createGain();
    this.gain.gain.value = CONFIG.MUSIC.volume;
    this.gain.connect(ctx.destination);
    this.step = 0;
    this.nextTime = ctx.currentTime + 0.1;
    this.timer = setInterval(() => this.schedule(), 50);
  },

  stop() {
    this.playing = false;
    if (this.el) { this.el.pause(); return; }
    clearInterval(this.timer);
    this.timer = null;
    if (this.gain) {
      const g = this.gain;
      g.gain.setTargetAtTime(0, Sound.ctx.currentTime, 0.05);   // quick fade, no click
      setTimeout(() => g.disconnect(), 400);
      this.gain = null;
    }
  },

  toggle() {
    this.on = !this.on;
    try { localStorage.setItem('portfolio-music', this.on ? '1' : '0'); } catch (e) {}
    if (this.on) this.start(); else this.stop();
  },

  /* Quieter while a pop-up is open so it doesn't compete with reading. */
  duck(quiet) {
    const v = CONFIG.MUSIC.volume * (quiet ? 0.35 : 1);
    if (this.el) this.el.volume = v;
    if (this.gain) this.gain.gain.setTargetAtTime(v, Sound.ctx.currentTime, 0.2);
  },

  /* Schedule notes a little ahead of time so playback stays smooth. */
  schedule() {
    const ctx = Sound.ctx, eighth = 60 / CONFIG.MUSIC.bpm / 2;
    if (this.nextTime < ctx.currentTime - 0.1) this.nextTime = ctx.currentTime + 0.05;  // tab was in background
    while (this.nextTime < ctx.currentTime + 0.25) {
      const s = this.step, t = this.nextTime;
      const m = this.MELODY[s];
      if (m) this.note(t, m, eighth * 0.85, 'square', 0.05);
      const root = this.BASS_ROOTS[Math.floor(s / 8)];
      this.note(t, root + (s % 2 ? 12 : 0), eighth * 0.7, 'triangle', 0.12);
      this.nextTime += eighth;
      this.step = (s + 1) % this.MELODY.length;
    }
  },

  note(t, midi, dur, type, vol) {
    const ctx = Sound.ctx, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.value = 440 * Math.pow(2, (midi - 69) / 12);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.gain);
    o.start(t);
    o.stop(t + dur + 0.02);
  },
};
