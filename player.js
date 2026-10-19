/* =====================================================================
   player.js — THE MOTOCROSS RIDER
   ---------------------------------------------------------------------
   Physics (accelerate, brake, jump, ride over ramps), animation state
   (idle / ride / jump / wheelie / land), and drawing — either your
   sprite (see CONFIG.AVATAR) or a placeholder made of simple shapes.

   The player's (x, y) is the point where the bike touches the ground,
   centred between the wheels.
   ===================================================================== */

/* ---------- Sprite loading helpers (reads CONFIG.AVATAR) ---------- */
const Avatar = {
  anims: null,      // { idle: [frame, ...], ... } — frame = { img, sx, sy, sw, sh }

  /** Files the preloader should fetch. */
  manifest() {
    const A = CONFIG.AVATAR, list = [];
    if (A.mode === 'frames') {
      for (const [anim, files] of Object.entries(A.frames)) {
        files.forEach((src, i) => list.push({ key: `avatar:${anim}:${i}`, src }));
      }
    } else if (A.mode === 'sheet') {
      list.push({ key: 'avatar:sheet', src: A.sheet.src });
    }
    return list;
  },

  /** After loading: build frame lists. Missing frames → fall back to placeholder. */
  build() {
    const A = CONFIG.AVATAR;
    const anims = {};
    if (A.mode === 'frames') {
      for (const [anim, files] of Object.entries(A.frames)) {
        const frames = files.map((_, i) => Assets.get(`avatar:${anim}:${i}`)).filter(Boolean)
          .map(img => ({ img, sx: 0, sy: 0, sw: imgW(img), sh: imgH(img) }));
        if (frames.length) anims[anim] = frames;
      }
    } else if (A.mode === 'sheet') {
      const img = Assets.get('avatar:sheet');
      if (img) {
        const { frameWidth: fw, frameHeight: fh } = A.sheet;
        for (const [anim, { row, count }] of Object.entries(A.sheet.animations)) {
          anims[anim] = Array.from({ length: count }, (_, i) => ({ img, sx: i * fw, sy: row * fh, sw: fw, sh: fh }));
        }
      }
    }
    // Need at least idle or ride to use sprites; otherwise use the placeholder.
    if (!anims.idle && !anims.ride) {
      if (A.mode !== 'placeholder') console.info('[avatar] sprite files not found — using placeholder rider');
      this.anims = null;
      return;
    }
    // Fill gaps so every state has something to show.
    anims.idle = anims.idle || anims.ride;
    anims.ride = anims.ride || anims.idle;
    anims.jump = anims.jump || anims.ride;
    this.anims = anims;
  },

  frame(anim, time) {
    if (!this.anims) return null;
    const frames = this.anims[anim] || this.anims.ride;
    const fps = CONFIG.AVATAR.fps[anim] || 8;
    return frames[Math.floor(time * fps) % frames.length];
  },
};


class Player {
  constructor(level) {
    this.level = level;
    this.reset(CONFIG.LEVEL.startX);
  }

  reset(x) {
    this.x = x;
    this.y = this.level.groundAt(x);
    this.vx = 0;
    this.vy = 0;
    this.onGround = true;
    this.facing = 1;          // 1 = right, -1 = left
    this.lean = 0;            // current tilt in radians (smoothed)
    this.landTimer = 0;       // > 0 right after landing (squash + land frame)
    this.landStrength = 0;
    this.wheelieTimer = 0;
    this.coyote = 0;
    this.wheelSpin = 0;
    this.animTime = 0;
    this.dustTimer = 0;
  }

  get anim() {
    if (!this.onGround) return 'jump';
    if (this.landTimer > 0.08 && Avatar.anims && Avatar.anims.land) return 'land';
    if (this.wheelieTimer > 0 && Avatar.anims && Avatar.anims.wheelie) return 'wheelie';
    if (Math.abs(this.vx) > 20) return 'ride';
    return 'idle';
  }

  /* ---------------------------------------------------------------
     UPDATE — called every frame with dt in seconds
     --------------------------------------------------------------- */
  update(dt) {
    const P = CONFIG.PHYSICS, L = this.level;
    const dir = (Input.right ? 1 : 0) - (Input.left ? 1 : 0);
    const control = this.onGround ? 1 : P.airControl;

    // --- horizontal ---
    if (dir !== 0) {
      // Starting from (almost) standstill → pop a little wheelie.
      if (this.onGround && Math.abs(this.vx) < 30 && this.wheelieTimer <= 0) this.wheelieTimer = 0.45;
      const braking = Math.sign(this.vx) === -dir && Math.abs(this.vx) > 10;
      this.vx += dir * (braking ? P.brake : P.accel) * control * dt;
      this.facing = dir;
    } else if (this.onGround) {
      const drop = P.friction * dt;
      this.vx = Math.abs(this.vx) <= drop ? 0 : this.vx - Math.sign(this.vx) * drop;
    }
    this.vx = Math.max(-P.maxSpeed, Math.min(P.maxSpeed, this.vx));

    // --- jump ---
    if (Input.consumeJump() && (this.onGround || this.coyote > 0)) {
      this.vy = -P.jumpVelocity;
      this.onGround = false;
      this.coyote = 0;
      this.wheelieTimer = 0;
      Sound.play('jump');
      Particles.landingPuff(this.x, this.y);
    }

    // --- move ---
    this.x += this.vx * dt;
    const minX = 60, maxX = L.width - 60;
    if (this.x < minX || this.x > maxX) { this.x = Math.max(minX, Math.min(maxX, this.x)); this.vx = 0; }

    // --- vertical ---
    const groundY = L.groundAt(this.x);
    if (this.onGround) {
      // Where would we be if we just followed gravity? If the ground drops away
      // faster than that (e.g. past a ramp lip) we launch into the air.
      const ballisticY = this.y + this.vy * dt + 0.5 * P.gravity * dt * dt;
      if (ballisticY < groundY - 0.5) {
        this.onGround = false;
        this.coyote = P.coyoteTime;
        this.y = ballisticY;
        this.vy += P.gravity * dt;
      } else {
        this.vy = (groundY - this.y) / dt;
        this.y = groundY;
      }
    } else {
      this.vy += P.gravity * dt;
      this.y += this.vy * dt;
      this.coyote -= dt;
      if (this.y >= groundY) {
        const impact = this.vy;
        this.y = groundY;
        this.onGround = true;
        this.vy = L.slopeAt(this.x) * this.vx;
        if (impact > 250) {
          this.landTimer = 0.28;
          this.landStrength = Math.min(1, impact / 1000);
          Particles.landingPuff(this.x, this.y);
          Sound.play('land');
        }
      }
    }

    // --- timers & polish ---
    this.landTimer = Math.max(0, this.landTimer - dt);
    this.wheelieTimer = Math.max(0, this.wheelieTimer - dt);
    this.wheelSpin += (this.vx * dt) / 18;            // radians (wheel radius ≈ 18)
    const speedRatio = Math.abs(this.vx) / P.maxSpeed;
    this.animTime += dt * (this.anim === 'ride' ? 0.4 + speedRatio : 1);

    // Tilt: follow the slope, lean back when accelerating, nose up/down in the air.
    let target;
    if (this.onGround) {
      target = Math.atan(L.slopeAt(this.x));
      if (dir === this.facing && dir !== 0 && speedRatio < 0.95) target += -0.07 * this.facing;
      if (this.wheelieTimer > 0) target += -0.32 * this.facing * Math.sin((this.wheelieTimer / 0.45) * Math.PI);
    } else {
      target = Math.max(-0.4, Math.min(0.4, this.vy * 0.0005)) * this.facing;
    }
    this.lean += (target - this.lean) * Math.min(1, dt * 10);

    // Dust from the rear wheel.
    if (this.onGround && Math.abs(this.vx) > 70) {
      this.dustTimer -= dt;
      if (this.dustTimer <= 0) {
        this.dustTimer = 0.035;
        const rearWheel = this.rearWheelOffset();                 // distance from centre to rear wheel
        Particles.dust(this.x - this.facing * rearWheel, this.y, Math.sign(this.vx), speedRatio > 0.7 ? 2 : 1);
      }
    }
  }

  /* Where the back wheel is, so dust comes from the right spot.
     On a side-view dirt bike photo the wheels sit ≈ 37% of the width from the centre. */
  rearWheelOffset() {
    const f = Avatar.frame('ride', 0);
    if (!f) return 14 * CONFIG.AVATAR.placeholderScale;
    return CONFIG.AVATAR.drawHeight * (f.sw / f.sh) * 0.37;
  }

  /* ---------------------------------------------------------------
     DRAW
     --------------------------------------------------------------- */
  draw(ctx, camX) {
    const A = CONFIG.AVATAR;
    // Landing bounce: squash down, then spring back.
    const t = this.landTimer / 0.28;
    const squash = Math.sin(t * Math.PI) * 0.16 * this.landStrength;
    const sx = 1 + squash * 0.6, sy = 1 - squash;

    const f = Avatar.frame(this.anim, this.animTime);
    // Tiny engine bounce while riding on the ground (single-photo sprites look alive).
    const bob = f && this.onGround && Math.abs(this.vx) > 20 ? Math.sin(this.animTime * 28) * (A.rideBob || 0) : 0;

    ctx.save();
    ctx.translate(this.x - camX, this.y + A.groundOffset + bob);
    ctx.rotate(this.lean);
    // Negative x-scale mirrors the sprite. If the art itself faces left, mirror the other way.
    const mirror = f && A.spriteFacesLeft ? -1 : 1;
    ctx.scale(sx * this.facing * mirror, sy);

    if (f) {
      ctx.imageSmoothingEnabled = A.smooth != null ? A.smooth : !CONFIG.PIXEL_ART;
      ctx.imageSmoothingQuality = 'high';
      const h = A.drawHeight, w = h * f.sw / f.sh;
      ctx.drawImage(f.img, f.sx, f.sy, f.sw, f.sh, -w / 2, -h, w, h);
    } else {
      this.drawPlaceholder(ctx);
    }
    ctx.restore();
  }

  /* A simple dirt bike + rider made of shapes (about 2 m tall at placeholderScale 1.15).
     (0, 0) is where the wheels touch the ground; the bike faces right. */
  drawPlaceholder(ctx) {
    const S = CONFIG.AVATAR.placeholderScale, g = ctx;
    g.save();
    g.scale(S, S);
    g.lineCap = 'round'; g.lineJoin = 'round';

    const airborne = !this.onGround;
    const bob = this.onGround && Math.abs(this.vx) > 20 ? Math.round(Math.sin(this.animTime * 30) * 0.5) : 0;

    // Wheels
    const wheel = (cx) => {
      g.fillStyle = '#1b1b1f'; g.beginPath(); g.arc(cx, -7, 7, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#8b96a3'; g.beginPath(); g.arc(cx, -7, 4, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#1b1b1f'; g.lineWidth = 1;
      for (let k = 0; k < 2; k++) {
        const a = this.wheelSpin + k * Math.PI / 2;
        g.beginPath(); g.moveTo(cx - Math.cos(a) * 4, -7 - Math.sin(a) * 4); g.lineTo(cx + Math.cos(a) * 4, -7 + Math.sin(a) * 4); g.stroke();
      }
    };
    wheel(-14); wheel(14);

    g.translate(0, bob);
    // Swingarm + fork
    g.strokeStyle = '#3a3f47'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(-14, -7); g.lineTo(-2, -14); g.stroke();
    g.strokeStyle = '#c9ced6';
    g.beginPath(); g.moveTo(14, -7); g.lineTo(9, -24); g.stroke();
    // Body: rear fender, seat, tank, front number plate
    g.fillStyle = '#ff5a1f';
    g.beginPath(); g.moveTo(-22, -17); g.lineTo(-6, -20); g.lineTo(6, -24); g.lineTo(10, -20); g.lineTo(-2, -15); g.closePath(); g.fill();
    g.fillStyle = '#1e2a38'; g.fillRect(-12, -21, 10, 2);            // seat
    g.fillStyle = '#ffffff'; g.fillRect(-3, -17, 7, 6);              // engine side panel
    g.fillStyle = '#3a3f47'; g.fillRect(-4, -13, 6, 4);              // engine
    g.fillStyle = '#ff5a1f'; g.beginPath(); g.moveTo(14, -17); g.lineTo(20, -16); g.lineTo(13, -14); g.fill(); // front fender
    g.fillStyle = '#ffffff'; g.fillRect(9, -28, 4, 5);               // number plate
    g.fillStyle = '#1e2a38'; g.fillRect(6, -29, 6, 1);               // handlebar

    // Rider — standing on the pegs, crouched forward (stands taller in the air)
    const lift = airborne ? -2 : 0;
    g.strokeStyle = '#1e2a38'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(-1, -14); g.lineTo(4, -21 + lift); g.lineTo(-5, -27 + lift); g.stroke();   // leg
    g.fillStyle = '#1e2a38'; g.fillRect(-3, -15, 5, 2);                                                 // boot
    g.strokeStyle = '#2f80ed'; g.lineWidth = 5;
    g.beginPath(); g.moveTo(-5, -27 + lift); g.lineTo(1, -38 + lift); g.stroke();                       // torso (jersey)
    g.strokeStyle = '#2f80ed'; g.lineWidth = 2.5;
    g.beginPath(); g.moveTo(1, -36 + lift); g.lineTo(6, -31 + lift); g.lineTo(9, -29); g.stroke();      // arm to bar
    // Helmet + goggles + peak
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(3, -43 + lift, 5, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#ff5a1f'; g.fillRect(-2, -45 + lift, 10, 2);
    g.fillStyle = '#1e2a38'; g.fillRect(5, -43 + lift, 4, 3);
    g.fillStyle = '#ffffff'; g.fillRect(4, -49 + lift, 7, 2);
    g.restore();
  }
}
