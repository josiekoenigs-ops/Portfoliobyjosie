/* =====================================================================
   particles.js — DUST + CONFETTI
   ---------------------------------------------------------------------
   Tiny square particles in world coordinates. Dust kicks up behind the
   rear wheel; confetti rains at the finish flag.
   ===================================================================== */

const Particles = {
  list: [],

  dust(x, y, dir, amount = 1) {
    for (let i = 0; i < amount; i++) {
      this.list.push({
        x: x + (Math.random() - 0.5) * 5, y: y - Math.random() * 3,
        vx: -dir * (25 + Math.random() * 50), vy: -15 - Math.random() * 40,
        g: 120, life: 0.5 + Math.random() * 0.4, age: 0,
        size: 2.5 + Math.random() * 3,
        color: Math.random() < 0.5 ? '#c79a6b' : '#a87b52',
        shrink: true,
      });
    }
  },

  landingPuff(x, y) {
    for (let i = 0; i < 14; i++) {
      const dir = i % 2 ? 1 : -1;
      this.list.push({
        x, y, vx: dir * (35 + Math.random() * 80), vy: -10 - Math.random() * 50,
        g: 200, life: 0.45 + Math.random() * 0.3, age: 0,
        size: 3 + Math.random() * 3, color: '#c79a6b', shrink: true,
      });
    }
  },

  confetti(x, y, count = 140) {
    const colors = ['#ff004d', '#ffa300', '#ffec27', '#00e436', '#29adff', '#ff77a8', '#ffffff'];
    for (let i = 0; i < count; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.6;
      const sp = 350 + Math.random() * 550;
      this.list.push({
        x: x + (Math.random() - 0.5) * 60, y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        g: 700, drag: 1.6, life: 2.2 + Math.random() * 1.2, age: 0,
        size: 6 + Math.random() * 5, color: colors[i % colors.length],
        spin: Math.random() * 10, flutter: true,
      });
    }
  },

  /* Little gold sparkles when a coin is collected. */
  sparkle(x, y) {
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2, sp = 90 + Math.random() * 90;
      this.list.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40,
        g: 160, life: 0.45 + Math.random() * 0.25, age: 0,
        size: 3 + Math.random() * 3, color: i % 3 ? '#ffe066' : '#ffffff', shrink: true,
      });
    }
  },

  update(dt) {
    for (const p of this.list) {
      p.age += dt;
      if (p.drag) { p.vx -= p.vx * p.drag * dt; p.vy -= p.vy * p.drag * dt * 0.5; }
      p.vy += p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.flutter) p.x += Math.sin(p.age * 8 + p.spin) * 40 * dt;
    }
    this.list = this.list.filter(p => p.age < p.life);
  },

  draw(ctx, camX) {
    for (const p of this.list) {
      const t = p.age / p.life;
      ctx.globalAlpha = 1 - t * t;
      ctx.fillStyle = p.color;
      const s = p.shrink ? p.size * (1 - t * 0.6) : p.size;
      if (p.flutter) {
        // confetti flips: squash the width over time
        const w = s * Math.abs(Math.cos(p.age * 6 + p.spin));
        ctx.fillRect(Math.round(p.x - camX - w / 2), Math.round(p.y - s / 2), Math.max(1, w), s * 0.6);
      } else {
        ctx.fillRect(Math.round(p.x - camX - s / 2), Math.round(p.y - s / 2), s, s);
      }
    }
    ctx.globalAlpha = 1;
  },

  clear() { this.list = []; },
};
