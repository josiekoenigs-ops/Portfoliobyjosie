/* =====================================================================
   config.js — GAME SETTINGS
   ---------------------------------------------------------------------
   Everything you might want to tweak WITHOUT touching game logic lives
   here: your name, the contact form endpoint, art paths, physics feel,
   and the avatar sprite setup. Project content lives in data/projects.js.
   ===================================================================== */

const CONFIG = {

  /* ---------- About you ---------- */
  OWNER_NAME: 'Josie Koenigs',
  OWNER_TAGLINE: 'Interior Designer',
  OWNER_EMAIL: 'josiekoenigs@gmail.com',   // used only if Formspree is down (mailto: fallback)

  /* ---------- Contact form ----------------------------------------
     ▼▼▼  FORM_ENDPOINT  ▼▼▼
     1. Make a free form at https://formspree.io
     2. Paste its endpoint below, e.g. 'https://formspree.io/f/abcdwxyz'
     Leave it '' and the Send button opens the visitor's email app
     (mailto:) addressed to OWNER_EMAIL instead.                     */
  FORM_ENDPOINT: 'https://formspree.io/f/xaeqkayn',

  /* ---------- Rendering ---------- */
  VIEW_HEIGHT: 720,          // the game world is always 720 "units" tall
  MIN_ASPECT: 4 / 3,         // narrowest view (phones in portrait get letterboxed)
  MAX_ASPECT: 21 / 9,        // widest view (ultrawide monitors get letterboxed)
  PIXEL_ART: true,           // true = crisp pixels for sky/clouds/ground/avatar/flag.
                             // Set false if your avatar/background art is NOT pixel art.
  SMOOTH_STOPS: true,        // true = smooth scaling for building illustrations (recommended)

  /* ---------- Art (paths are relative to index.html) ---------- */
  ART: {
    sky:        'assets/background/sky.webp',
    clouds:     'assets/background/clouds.webp',
    farHills:   '',   // optional, e.g. 'assets/background/far-hills.png' — '' = draw simple hills in code
    nearHills:  '',   // optional, e.g. 'assets/background/near-hills.png' — '' = draw simple hills in code
    ground:     'assets/background/ground.png',     // cropped tight: just the grass + dirt strip
    flag:       'assets/ui/finish-flag.png',
    postOffice: 'assets/ui/post-office.png',
    buttons:    'assets/ui/buttons.webp',
  },
  SHOW_HILLS: true,          // false = no hill layers at all (just sky + clouds + ground)
  SKY_STYLE: 'pixel',        // 'pixel' = colour bands with dithering (matches the pixel art) · 'smooth' = your sky image as-is

  // How tall the background strips are drawn. Your sky/clouds/ground art
  // is 2000x286, so it is stretched to the 720-tall view (286 → 720).
  BACKGROUND_SOURCE_HEIGHT: 286,
  // How many pixel rows at the top of ground.png are grass (the rest is dirt).
  // The dirt jumps use the dirt part as their texture.
  GROUND_GRASS_ROWS: 8,

  /* ---------- Level layout (world units; the view is 720 tall) ----------
     REAL-WORLD SCALE: your building drawings are about 25 px per metre, and with
     stopScale 1.05 that's ≈ 26 world units per metre. Keep everything on that
     scale so it looks right: rider ≈ 2 m (≈ 58 units), a 2-storey house ≈ 9 m. */
  LEVEL: {
    startX: 260,             // where the rider starts
    firstStopX: 1000,        // left edge of the first stop (when projects use x: null)
    stopGap: 720,            // empty track between auto-placed stops (room for a jump)
    flagGap: 550,            // track between the last project and the finish flag
    postOfficeGap: 520,      // track between the flag and the post office
    endPadding: 420,         // track after the post office
    defaultStopScale: 1.05,  // building size if a project doesn't set stopScale
    postOfficeScale: 1.1,    // ≈ 9 m tall, same scale as the projects
    flagHeight: 110,         // finish banner ≈ 4 m tall
    ramps: true,             // dirt jumps between stops
    // Order the jumps appear in (repeats). Types: rollers, kicker, tabletop, double, big
    // (shapes are defined at the top of js/level.js). A type too long for a gap is skipped.
    jumpPattern: ['rollers', 'kicker', 'tabletop', 'double', 'big'],
  },

  /* ---------- Rider physics (units per second; ≈ 26 units = 1 m) ---------- */
  PHYSICS: {
    maxSpeed: 520,           // ≈ 20 m/s (70 km/h)
    accel: 1100,
    brake: 1900,             // pressing the opposite direction
    friction: 1000,          // slowing down with no input
    airControl: 0.6,
    gravity: 2200,
    jumpVelocity: 640,       // hop height ≈ 90 units (≈ 3.5 m — a bit heroic, it's a game!)
    coyoteTime: 0.1,         // grace period to jump just after leaving a ramp
  },

  /* ---------- Avatar (your motocross rider) ------------------------
     mode: 'placeholder' → drawn with shapes (works with no files)
           'frames'      → separate PNG per frame (lists below)
           'sheet'       → one sprite sheet image, one row per animation
     The game flips the sprite automatically when riding the other way. */
  AVATAR: {
    mode: 'frames',
    drawHeight: 62,          // sprite height in world units (54 = exactly true to scale; 62 is a touch bigger so details read)
    spriteFacesLeft: true,   // your photo faces left; set false if you swap in a right-facing image
    smooth: true,            // true for photos / smooth art (no jagged edges); false for pixel-art sprites
    rideBob: 0.8,            // tiny engine bounce while riding (units); 0 = off
    placeholderScale: 1.15,  // size of the shape-drawn placeholder rider (used if mode is 'placeholder')
    groundOffset: 0,         // nudge down (+) if your sprite floats above the track

    // One photo for now, used for every state. Add more frames later
    // (e.g. a jumping pose) by listing extra files here.
    frames: {
      idle:    ['assets/avatar/rider.png'],
      ride:    ['assets/avatar/rider.png'],
      jump:    ['assets/avatar/rider.png'],
    },

    sheet: {
      src: 'assets/avatar/rider-sheet.png',
      frameWidth: 64,
      frameHeight: 64,
      // row = which row of the sheet, count = frames in that row
      animations: {
        idle:    { row: 0, count: 1 },
        ride:    { row: 1, count: 4 },
        jump:    { row: 2, count: 1 },
        wheelie: { row: 3, count: 1 },          // optional — delete if you don't have it
        land:    { row: 4, count: 1 },          // optional — delete if you don't have it
      },
    },

    fps: { idle: 4, ride: 12, jump: 1, wheelie: 1, land: 1 },
  },

  /* ---------- Sounds ----------------------------------------------
     Leave '' to use the built-in retro synth sounds.
     Or point at your own short files, e.g. 'assets/sounds/blip.mp3'. */
  SOUNDS: {
    blip: '', open: '', jump: '', land: '', finish: '', send: '', coin: '',
  },

  /* ---------- Background music ------------------------------------
     src: '' = the built-in looping chiptune (made in code, no file needed).
          Or use your own track, e.g. 'assets/sounds/music.mp3' (it will loop).
     Starts when the visitor presses Start (browsers block sound before that),
     gets quieter while a pop-up is open, and has its own on/off button.     */
  MUSIC: {
    src: '',
    volume: 0.45,            // 0 – 1
    bpm: 132,                // speed of the built-in tune
  },
};
