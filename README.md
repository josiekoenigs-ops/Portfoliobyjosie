# Ride-Through Portfolio 🏍️

An interior design thesis portfolio built as a 2D side-scrolling game. You ride a motocross bike to the right past one building per project, open each one in a retro pop-up, cross the checkered finish flag, and end at a post office where visitors can mail you a letter (your contact form).

Plain HTML + CSS + JavaScript (HTML5 Canvas). No build step, no framework.

---

## 1. Run it

1. Open this folder in **VS Code**.
2. Install the **Live Server** extension (by Ritwick Dey) if you don't have it.
3. Right-click `index.html` → **Open with Live Server**.

> **Live Server is recommended.** Double-clicking `index.html` also works with the included art, because those images are already cropped tight. But when the page is opened straight from disk (the address bar starts with `file://`), the browser blocks the game's automatic trimming of empty space. So if you later add a building image with lots of transparent space around it, it will only sit correctly on the track under Live Server, unless you crop it tight first.

### Put it online with GitHub Pages (free)
1. Make a free account at <https://github.com>.
2. Click **+ → New repository**. Name it e.g. `portfolio`, set it to **Public**, and click **Create repository**.
3. On the new repo page, click **uploading an existing file**. Drag **everything inside** this folder into the browser window: `index.html`, `css`, `js`, `data`, `assets`, `README.md`. Then click **Commit changes**.
4. Go to **Settings → Pages**. Under *Branch*, pick **main** and **/ (root)**, then click **Save**.
5. Wait a minute or two, then refresh the page. Your link appears at the top: `https://YOUR-USERNAME.github.io/portfolio/`.
6. To update the site later, upload the changed files the same way. Same names overwrite the old ones.
7. **Bump the version tag every time you change code or text.** Browsers keep old copies of `.js` and `.css` files, so visitors (and you) might not see your changes. In `index.html`, every file link ends in `?v=2`. Change them all to `?v=3`, then `?v=4` next time, and so on. In VS Code: **Ctrl+H**, find `?v=2`, replace with `?v=3`, **Replace All**. Then upload `index.html` along with your changed files. (Images don't need this; give a changed image a new file name instead.)

> File names on GitHub Pages are **case-sensitive**: `Project-1.PNG` and `project-1.png` are different files there, even though they're the same on Windows. Keep paths in `projects.js` matching the real file names exactly.

---

## 2. Folder map

```
index.html            page structure (canvas, HUD, pop-up, title screen)
css/style.css         all styling (colours at the top)
data/projects.js      ★ YOUR CONTENT: edit this to change projects
js/config.js          ★ settings: your name, email, form endpoint, art paths, physics, avatar
js/game.js            main loop, camera, game states, prompts, finish celebration
js/level.js           the track: parallax layers, buildings, ramps, flag, post office
js/player.js          rider physics, animation, placeholder rider, sprite support
js/ui.js              pop-ups, gallery, letter form, HUD, list view, title screen
js/input.js           keyboard + touch buttons
js/audio.js           retro sound effects + background music (synthesized, or your own files)
js/particles.js       dust, confetti, coin sparkles
js/coins.js           collectible coins + the fun-fact banner in the sky
js/resume.js          the resume that flies in and unfolds at the post office
js/assets.js          image preloader (+ auto-trims transparent borders)
assets/               all images and sounds (see section 5)
assets/originals/     untouched copies of art I edited (rider photo, Healing Hive image)
```

---

## 3. First things to edit (`js/config.js`)

```js
OWNER_NAME: 'Josie Koenigs',
OWNER_TAGLINE: 'Interior Designer',
OWNER_EMAIL: 'josiekoenigs@gmail.com',   // backup email link
FORM_ENDPOINT: 'https://formspree.io/f/xaeqkayn',
```

### Contact form (Formspree)
1. Sign up at <https://formspree.io> (the free plan is plenty) with the email you want letters sent to, and confirm that email.
2. Click **+ New Form**, name it "Portfolio letters", and create it.
3. Copy the form's endpoint. It looks like `https://formspree.io/f/abcdwxyz`.
4. Paste it into `FORM_ENDPOINT` in `js/config.js`:
   ```js
   FORM_ENDPOINT: 'https://formspree.io/f/abcdwxyz',
   ```
5. Send yourself a test letter from the post office. The first submission may ask you (in your inbox) to confirm the form; after that, letters arrive by email with the visitor's name, email and message. Hit Reply to write back.

While `FORM_ENDPOINT` is empty, **Send** opens the visitor's own email app with the letter already filled in and addressed to `OWNER_EMAIL` (a `mailto:` link). If Formspree ever fails, visitors get the same email-app option.

---

## 4. Add / edit projects (`data/projects.js`)

Each `{ ... }` block is one stop, in riding order:

```js
{
  id: 'project-1',                       // unique, no spaces
  title: 'The Healing Hive',
  subtitle: 'IDES 1000 · Year 1',        // small line under the title ('' to hide)
  concept: 'To heal, grow, learn and flourish together.',   // shown as a quote ('' to hide)
  x: null,                               // null = auto-spaced; or a number like 2400
  stopImage: 'assets/stops/project-1-cabins.webp',
  stopScale: 1.05,                       // building size (1 = image's real pixel size)
  description: 'First paragraph.\n\nSecond paragraph.',
  gallery: [
    { src: 'assets/projects/project-1/01.jpg', caption: 'Concept render' },
    { src: 'assets/projects/project-1/02.jpg', caption: 'Floor plan' },
  ],
  links: [
    { label: 'View PDF', url: 'assets/projects/project-1/booklet.pdf' },
    { label: '3D Model', url: 'https://sketchfab.com/...' },
  ],
},
```

- **Add a project:** copy a whole block, paste it where you want it in the order, and change the text. The level, mini-map and list view update automatically.
- **Remove one:** delete its block, including the comma after it.
- **Spacing:** with `x: null` stops are placed one after another with `stopGap` units between them (`LEVEL` in `config.js`).
- **Realistic scale:** your building drawings are about 25 px per metre, so every project uses `stopScale: 1.05` (≈ 26 world units per metre) and the rider is about 2 m tall. Keep all buildings on the same `stopScale` so they stay in proportion to each other and to the rider. Only change one if its drawing was made at a different scale.
- The post office text ("You made it!...") is at the bottom of the same file in `POST_OFFICE`.

### Coins + fun facts
`FUN_FACTS` (also in `data/projects.js`) is a list of sentences. The game places **one coin per fact** along the track, and collecting a coin pops that fact up in the sky for 7 seconds. The coin counter in the HUD shows how many you've found. Add, remove or reorder facts freely and the coins update automatically. Coins are placed for you: some float over jumps, some sit at bike height (just ride through), and some are up high (jump for them). All facts also appear in the list view under "Fun facts about me".

### Resume at the finish
After the rider crosses the finish line and reaches the post office, a folded letter flies onto the screen, unfolds, and shows your resume on old, wrinkled paper. The bottom of the sheet has **Mail me a letter** and **Back to the track** buttons, plus a **Download PDF** link. Visitors can reopen it by pressing E at the post office, or with **View my résumé** in the list view.

Settings are in `RESUME` in `js/config.js`:
- `image`: the resume as one tall image (`assets/resume/resume.webp`). Its white background blends into the paper automatically.
- `pdf`: the file for the Download link (`assets/resume/JKoenigs-Resume.pdf`). Set it to `''` to hide the link.
- `autoOpen`: set to `false` so it only opens when visitors press E at the post office.

**Updating your resume:**
1. Replace `JKoenigs-Resume.pdf` with your new PDF.
2. Export the resume as one tall PNG or JPG, about 1600px wide (in Canva or Word, export each page as an image and stack them).
3. Save it as `assets/resume/resume.webp`, or point `RESUME.image` at your new file.

The paper look (colour, stains, creases, scorched edges) is in the "RESUME" section at the bottom of `css/style.css`. The crumpled shading and ragged edges are generated in `js/resume.js`.

### Jumps
Five dirt-jump types are defined at the top of `js/level.js`: **rollers**, **kicker**, **tabletop**, **double** and **big**. `LEVEL.jumpPattern` in `config.js` sets the order they appear in; a type too long for a gap is skipped. Copy one of the shapes in `JUMPS` to invent your own.

---

## 5. Assets: sizes, formats, and how to swap them

Transparent **PNG** or **WebP** both work. To swap any image, either save your file over the old one with the same name, or point the path in `config.js` / `projects.js` at your new file.

The game world is **720 units tall**: the track surface sits at about y = 640, so roughly **640 units of sky** sit above it.

| Folder / file | What it is | Recommended size & format | Notes |
|---|---|---|---|
| `assets/background/sky.webp` | Sky gradient (doesn't scroll) | 2000 × 286, opaque | Stretched to fill the screen. |
| `assets/background/clouds.webp` | Clouds (slow parallax) | 2000 × 286, transparent | Repeats sideways; left and right edges should line up. |
| `assets/background/ground.png` | Grass + dirt track | 2000 × 32, cropped tight to the grass + dirt | Repeats sideways. Its height sets how thick the track is, so crop away any empty space above the grass. The top 8 rows are grass: the dirt jumps reuse the rows below as their texture. If your grass is thicker or thinner, change `GROUND_GRASS_ROWS` in `config.js`. |
| `assets/background/far-hills.png` / `near-hills.png` | *Optional* hill layers | Any width × 720 tall, transparent, hills at the bottom | Set the paths in `CONFIG.ART`. Until then simple hills are drawn in code. `SHOW_HILLS: false` hides them. |
| `assets/stops/*` | One building per project | Any size, transparent, **cropped tight** to the building | Under Live Server empty space is trimmed automatically; opened from disk it is not, so cropping tight is safest. Size it with `stopScale`. |
| `assets/projects/project-N/*` | Pop-up gallery images | ~1600 × 1000 (16:10) JPG/PNG/WebP, under ~500 KB each | Other shapes are letterboxed. Current files are SVG placeholders. |
| `assets/ui/finish-flag.png` | Checkered flag | Transparent | Drawn `flagHeight` (110 units ≈ 4 m) tall and waves gently. |
| `assets/ui/post-office.png` | Final stop | Transparent, cropped tight | Size with `postOfficeScale`. |
| `assets/ui/buttons.webp` | Pixel button sheet | 2000 × 1545 | Buttons are cut out by coordinates in `SPRITES` at the top of `js/ui.js`. If you replace the sheet, update those numbers. |
| `assets/avatar/*` | Your rider | See below | |
| `assets/sounds/*` | *Optional* sound files | Short `.mp3`/`.wav` | Set paths in `CONFIG.SOUNDS`. Empty = built-in chiptune sounds. |

### Your rider sprite (`assets/avatar/`)
**Currently in use:** `assets/avatar/rider.png`, made from your photo (`assets/originals/rider-original.webp`): drop shadow removed, helmet tilted up about 10° so she looks ahead, brightened and sharpened, a thin dark outline added, and resized to about 360px tall. It's used for every state (idle/ride/jump), with a small engine bounce added in code (`rideBob`). Because the photo faces left, `spriteFacesLeft: true` mirrors it when riding right, so logos read backwards then. A right-facing photo avoids that: set `spriteFacesLeft: false`. `smooth: true` keeps a photo from looking jagged when scaled down.

**Making your own sprite instead:**
Draw the rider **facing right**. The game flips the sprite when riding left. Put the wheels at the bottom edge of the image, centred.

**Option A: separate frames** (simplest)
```
assets/avatar/idle.png
assets/avatar/ride-1.png  ride-2.png  ride-3.png  ride-4.png
assets/avatar/jump.png
assets/avatar/wheelie.png   (optional)
assets/avatar/land.png      (optional)
```
Then in `js/config.js` set `AVATAR.mode: 'frames'`. Use any number of ride frames: just list them in `AVATAR.frames.ride`.

**Option B: one sprite sheet**
Every frame is the same size, with one row per animation (row 0 = idle, row 1 = ride...). Set `AVATAR.mode: 'sheet'` and fill in `sheet.src`, `frameWidth`, `frameHeight`, and the `row`/`count` for each animation.

**Tuning:**
- `drawHeight` sets the rider's size in world units. 58 ≈ 2 m, true to scale with the buildings.
- `groundOffset` nudges it down if it floats.
- `fps` sets the animation speed. Ride speed also scales with how fast you're going.
- If the files can't be found, the shape-drawn placeholder rider is used, so nothing breaks.

### Pixel art vs. smooth art
`CONFIG.PIXEL_ART: true` keeps sky, clouds, ground, flag and rider crisp (no blurring). Set it to `false` if your rider/background art is smooth illustration rather than pixel art. Buildings use `SMOOTH_STOPS` separately (on by default, because they're illustrations).

---

## 6. Controls

| Action | Keyboard | Phone |
|---|---|---|
| Ride forward / back | → / ← or D / A | ▶ / ◀ buttons |
| Jump | Space, ↑ or W | ▲ button |
| Enter a stop | E or Enter (when the bubble shows) | Tap the bubble/building, or ENTER |
| Close pop-up | Esc, the X, or click outside | X or *Back to the track* |
| Gallery | ← / → arrows | Arrows or swipe |

The game freezes while a pop-up is open.
- **List view:** the menu button (top-right), the *Skip the game* link on the title screen, or a hidden skip link that keyboard users reach with Shift+Tab.
- **Music / sound effects:** the music-note button turns the background music on/off, and the speaker button mutes sound effects. Both choices are remembered.
- **Start:** press **Space** (or Enter) on the title screen. No mouse needed.

---

## 7. Background music

A short looping chiptune is generated in code (`Music` in `js/audio.js`), so there is no file to load. It starts when the visitor presses Start and gets quieter while a pop-up is open.

- **Your own track:** put an `.mp3` in `assets/sounds/` and set `MUSIC.src` in `config.js`, e.g. `'assets/sounds/music.mp3'`. It loops automatically. Use music you have the rights to (royalty-free or your own).
- **Volume / speed:** `MUSIC.volume` (0–1) and `MUSIC.bpm`.
- **Change the tune:** edit the `MELODY` list in `js/audio.js`. Each number is one eighth-note (60 = middle C, 0 = rest).

---

## 8. Tweaking the feel

All in `js/config.js`:
- **`PHYSICS`:** speed, acceleration, jump height, gravity.
- **`LEVEL`:** gaps between stops, flag/post office distances, `ramps: false` to remove dirt jumps.
- **Window shape:** `MIN_ASPECT` / `MAX_ASPECT` control how wide or narrow the view can get before black bars appear.
- **Colours:** at the top of `css/style.css` (`--ink`, `--stone`, `--accent`...).
- **Sky:** `SKY_STYLE: 'pixel'` draws the sky as colour bands with pixel dithering to match the pixel art; `'smooth'` uses your sky image exactly as it is. The hills are drawn in code using your ground's grass colours, so they always match the track.

---

## 9. Notes

- The button sheet you provided has faint stock watermarks. Use the licensed/unwatermarked version before publishing, or replace it with your own.
- The hospital building shows a real hospital's logo. That's fine for a student project about that building, but worth knowing if the portfolio goes public.
