/* =====================================================================
   input.js — KEYBOARD + TOUCH CONTROLS
   ---------------------------------------------------------------------
   Other files just read Input.left / Input.right, and call
   Input.consumeJump() / Input.consumeInteract() to handle a press once.
   ===================================================================== */

const Input = {
  left: false,
  right: false,
  jumpHeld: false,
  _jumpQueued: false,
  _interactQueued: false,

  KEYS: {
    left:     ['ArrowLeft', 'KeyA'],
    right:    ['ArrowRight', 'KeyD'],
    jump:     ['Space', 'ArrowUp', 'KeyW'],
    interact: ['Enter', 'KeyE'],
  },

  init() {
    window.addEventListener('keydown', e => this._onKey(e, true));
    window.addEventListener('keyup', e => this._onKey(e, false));
    window.addEventListener('blur', () => this.reset());
    this._bindTouchButtons();
  },

  _onKey(e, down) {
    // Let people type in the contact form without moving the rider.
    const tag = (e.target && e.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;

    const code = e.code;
    const is = name => this.KEYS[name].includes(code);
    if (is('left'))  { this.left = down; e.preventDefault(); }
    if (is('right')) { this.right = down; e.preventDefault(); }
    if (is('jump')) {
      if (down && !this.jumpHeld && !e.repeat) this._jumpQueued = true;
      this.jumpHeld = down;
      e.preventDefault();
    }
    if (is('interact') && down && !e.repeat) {
      this._interactQueued = true;
    }
  },

  /* On-screen buttons: any element with data-control="left|right|jump|interact" */
  _bindTouchButtons() {
    document.querySelectorAll('[data-control]').forEach(btn => {
      const name = btn.dataset.control;
      const press = e => {
        e.preventDefault();
        btn.classList.add('pressed');
        if (name === 'left') this.left = true;
        if (name === 'right') this.right = true;
        if (name === 'jump') { this._jumpQueued = true; this.jumpHeld = true; }
        if (name === 'interact') this._interactQueued = true;
      };
      const release = e => {
        e.preventDefault();
        btn.classList.remove('pressed');
        if (name === 'left') this.left = false;
        if (name === 'right') this.right = false;
        if (name === 'jump') this.jumpHeld = false;
      };
      btn.addEventListener('pointerdown', press);
      btn.addEventListener('pointerup', release);
      btn.addEventListener('pointercancel', release);
      btn.addEventListener('pointerleave', release);
      btn.addEventListener('contextmenu', e => e.preventDefault());
    });
  },

  consumeJump()     { const j = this._jumpQueued; this._jumpQueued = false; return j; },
  consumeInteract() { const i = this._interactQueued; this._interactQueued = false; return i; },
  queueInteract()   { this._interactQueued = true; },

  reset() {
    this.left = this.right = this.jumpHeld = false;
    this._jumpQueued = this._interactQueued = false;
    document.querySelectorAll('[data-control].pressed').forEach(b => b.classList.remove('pressed'));
  },
};
