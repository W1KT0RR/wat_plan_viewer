# CLAUDE.md — WAT Plan Viewer

## Project Overview

**Plan Zajęć WAT** is a single-page Progressive Web App (PWA) that fetches and renders class schedules for students of the Military University of Technology (Wojskowa Akademia Techniczna) in Warsaw, Poland.

Live at: **https://wat-plan.xyz** (GitHub Pages)

---

## Architecture

This is a **zero-build, no-dependency** project. The entire application lives in a single HTML file.

| File | Role |
|------|------|
| `index.html` | The entire app (~3800 lines): CSS, HTML markup, and all JavaScript |
| `sw.js` | Service worker — cache-first PWA shell, passthrough for external requests |
| `manifest.json` | PWA manifest for home-screen install support |
| `CNAME` | GitHub Pages custom domain (`wat-plan.xyz`) |
| `icons/icon.svg` | App icon (SVG, works at any size) |
| `gifs/` | Decorative GIF assets used in humour ads |

There is **no build step, no bundler, no package manager, no test suite**. Everything runs directly in the browser.

---

## How the App Works

### 1. Schedule Fetching

WAT faculties host schedule files as `.htm` files served with Windows-1250 encoding. Direct browser fetch is blocked by CORS, so the app routes requests through a list of public CORS proxies defined in `CORS_PROXIES` (line ~1870):

```
codetabs.com → allorigins.win → cors.eu.org → corsfix.com → cors.lol → corsproxy.org → thingproxy.freeboard.io
```

`fetchPlanFromWAT()` fires all proxies in parallel via `Promise.any()` and takes the first success. It retries once with a 2-second delay on total failure.

### 2. Department Detection

Group names encode the faculty prefix (e.g., `WEL24EQ3S1` → WEL faculty). `detectDepartment()` checks the `DEPARTMENTS` map which contains base URLs for each faculty's winter (`zima`) and summer (`lato`) semester plans.

Supported faculties: `WEL`, `WLO`, `WML`, `IOE`, `WTC`, `WIM`.

### 3. HTML Parsing

WAT schedule files are HTML tables with `bgcolor` cells, `colspan`/`rowspan`, and Windows-1250 encoding.

Key parsing functions (all in `index.html`):

- **`buildVirtualGrid(table)`** — flattens a table's colspan/rowspan into a 2-D array (`grid[row][col]`) so every logical cell is addressable directly.
- **`extractCellClass(el)`** — reads a TD cell: checks `bgcolor` for subject color, walks child text nodes, and returns `{ code, type, room, color, halfGroup }`.
- **`extractInstructors(grid)`** — reads the instructor legend section (cells with `mergewith` attributes) to build a map of `code → type → [{ name, hours }]`.
- **`parseScheduleHTML(htmlString)`** — orchestrates the full parse: finds day header rows (cells with `rowspan=8`), iterates 7 time slots per day, calls `extractCellClass`, resolves dates, and returns a structured data object.

### 4. Data Model

`parseScheduleHTML` returns:
```js
{
  groupName: string,
  subjects: { [code]: { name, color } },
  instructors: { [code]: { [type]: [{ name, hours, type }] } },
  allClasses: [ClassEntry, ...],
  weeks: [{ monday: Date, classes: [ClassEntry] }, ...]
}
```

`ClassEntry` fields: `date, dayFull, dayIdx, slot, timeStart, timeEnd, timeStartMin, timeEndMin, code, name, type, typeName, typeShort, room, roomDisplay, roomShort, color, halfGroup, instructors, isLast, lastLabel`.

### 5. Time Slots

WAT uses 7 paired lesson slots per day:

| Slot | Start | End |
|------|-------|-----|
| 1-2  | 08:00 | 09:35 |
| 3-4  | 09:50 | 11:25 |
| 5-6  | 11:40 | 13:15 |
| 7-8  | 13:30 | 15:05 |
| 9-10 | 15:45 | 17:20 |
| 11-12| 17:35 | 19:10 |
| 13-14| 19:25 | 21:00 |

### 6. Views

Three schedule views, toggled via header buttons:

- **Week** (`renderWeek`) — 6-column grid (Mon–Sat), expands to 7 if Sunday classes exist.
- **List** (`renderList`) — day-grouped vertical list for the current week.
- **Month** (`renderMonth`) — calendar grid with class pips; clicking a date switches to list view for that week.

Keyboard navigation: `←` / `→` arrows. Touch navigation: swipe left/right (60px threshold).

### 7. Real-Time Tracking

`getNowInfo()` runs every 60 seconds (and every 1 second for the ending-soon countdown). It:
- Finds the currently active class (`.is-now` CSS class, cyan border, progress bar).
- Detects "ending soon" state (≤1 minute) and triggers a pulsing red animation with a second countdown.
- Computes the next upcoming class and break status.
- Displays a summary string in the header's `#nowInfo` element.

### 8. Autocomplete

`fetchPlanList()` fetches the faculty index page (tries `index.xml` first, then `/`) via the same CORS proxy race. Results are cached in `localStorage` with a 12-hour TTL under the key `planList_<dept>_<semester>`.

Two search modes (toggled by the Grupa/Nauczyciel toggle):
- **Group mode** — fetches the detected faculty's group list and filters it.
- **Professor mode** — fetches all faculties in parallel and searches across all professor lists.

### 9. Paywall / Access Control

Not all groups are free. Access is controlled by:
- `FREE_GROUPS` array — whitelisted groups (currently `['WEL24EQ3S1']`).
- `localStorage` — groups unlocked via a 5-digit access code.
- `verifyCode()` — SHA-256 of `UNLOCK_SALT + code` compared against `UNLOCK_HASH`.

When a non-free, non-unlocked group is fetched: `showPaywall()` is called. This activates **Cursed Mode** — Comic Sans font, rainbow header animation, and wobbling class cards — as a humorous anti-paywall measure.

### 10. Demo Mode

Selecting "Tryb demo" in the paywall restricts the data (`applyDemoRestrictions`):
- Only Mon/Tue/Wed classes are shown.
- Subject names, rooms, and instructors are censored with `***`.
- Fake pop-up ads spawn every 8 seconds (`spawnFakeAd()`), with close buttons that evade the cursor before finally closing.
- A watermark, marquee, and bottom banner appear.

### 11. GIF Ads (Loader Page)

On the loader page, humorous fake ads spawn from `GIF_FILES` and `GIF_AD_TEXTS`. Two variants:
- **Standard gif ads** — close after 12–20s; close button evades 2–3 times before working.
- **"Mamuśki" ads** — variant with a fake GPS distance countdown that approaches zero.

Ads stop and are cleared when `init()` is called (schedule loaded).

### 12. Fun Ads (In-Schedule)

An "in-schedule" ad system toggled by the "Reklamy" button. When enabled, `inlineGifAdHtml()` injects small inline ad cards between class cards. Controlled by `showFunAds` boolean and the `FUN_ADS_POOL` array.

### 13. PWA / Service Worker

`sw.js` caches the app shell (`/`, `/index.html`, `/manifest.json`, `/icons/icon.svg`) using cache-first strategy. External requests (CORS proxy calls) are deliberately not intercepted to avoid altering Origin headers.

### 14. URL Parameters

Shareable links: `?group=WEL24EQ3S1&sem=lato` (or `?g=...&s=...`). Auto-loaded on page open.
Browser back/forward is supported via `history.pushState`.

---

## Key Constants (all in `index.html`)

| Constant | Purpose |
|----------|---------|
| `TIME_SLOTS` | Object mapping slot keys to start/end times in both string and minute form |
| `SLOT_KEYS` | Ordered array `['1-2', '3-4', ...]` for sort order |
| `DAY_NAMES` / `DAY_SHORT` | Polish weekday names |
| `MONTH_MAP` / `MONTH_NAMES` | Roman numeral → month number, and Polish month names |
| `DEPARTMENTS` | Faculty code → `{ name, lato, zima }` with base URLs |
| `CORS_PROXIES` | Array of proxy URL builder functions |
| `FREE_GROUPS` | Groups with free access |
| `UNLOCK_SALT` / `UNLOCK_HASH` | Access code verification |
| `GIF_FILES` | Paths to GIF assets |
| `GIF_AD_TEXTS` / `FUN_ADS_POOL` | Humour ad content arrays |

---

## CSS Architecture

All styles are in a single `<style>` block in `index.html`. The design uses CSS custom properties (`--bg`, `--card`, `--accent`, `--now-color`, etc.) defined on `:root` for theming. Dark theme only. No external CSS frameworks.

Key CSS classes:
- `.week-grid`, `.day-column`, `.day-slots` — week view layout
- `.class-card` — individual class card (week/month views)
- `.list-card` — list view class card
- `.is-now` / `.is-last` / `.is-ending-soon` — real-time state classes
- `.legend-chip` — subject legend bar items
- `.modal-overlay` / `.modal` — subject detail modal
- `.paywall-overlay` / `.paywall-box` — paywall modal
- `body.cursed` — humorous "cursed mode" overrides

Breakpoints: `max-width: 1100px` (3-column week grid), `max-width: 750px` (single column, mobile).

---

## Development Workflow

### Local Development

No install needed. Serve the files with any static HTTP server:

```bash
python3 -m http.server 8080
# then open http://localhost:8080
```

`IS_LOCAL` is `true` when running on `localhost`/`127.0.0.1`. On localhost, the app also tries to auto-load a `.htm` plan file from the same directory before showing the loader form.

### Making Changes

All code is in `index.html`. Sections are clearly commented with banners like:
```
// ============================================================
// SECTION NAME
// ============================================================
```

Major sections in order:
1. CSS styles (lines ~15–1724)
2. HTML structure (lines ~1727–1836)
3. JavaScript: CONSTANTS → PAYWALL → PLAN LIST/AUTOCOMPLETE → FUN ADS → PARSER → TIME TRACKING → RENDERER → NAVIGATION → UTILS → PAYWALL UI → FILE LOADING → FETCH → GIF ADS

### Deployment

Push to `master` branch — GitHub Pages auto-deploys to `wat-plan.xyz`.

The service worker cache key is `'wat-plan-v2'`. If making changes that require cache busting, increment this version in `sw.js`.

---

## Important Conventions

1. **Polish UI strings** — all user-facing text is in Polish (the target audience is Polish university students). Comments in JS are in Polish or English mixed.
2. **Windows-1250 decoding** — WAT schedule files are encoded in Windows-1250, not UTF-8. Always use `new TextDecoder('windows-1250').decode(buf)` when reading schedule `.htm` files.
3. **No async/await in critical paths without fallback** — CORS proxies are unreliable; always use `Promise.any()` for parallel racing and include retry logic.
4. **Academic year logic** — the academic year starts in September. Month ≥ 8 (August) means use current calendar year; otherwise use `currentYear - 1`. This is computed once as `_acadYear`.
5. **Semester values** — `'lato'` (summer, Feb–Aug) and `'zima'` (winter, Sep–Jan). Default is detected by current month.
6. **localStorage keys** — `planList_<dept>_<sem>` for autocomplete cache; `wat_plan_unlocked` for unlock status.
7. **No external JS dependencies** — keep it that way. The zero-dependency nature is intentional.
8. **Color handling** — subject colors come directly from `bgcolor` HTML attributes in WAT files (e.g., `#FFCC99`). Use `hex2rgba(color, alpha)` to apply transparency.
9. **Inline HTML generation** — views are rendered by building HTML strings and setting `innerHTML`. This is intentional for performance in this no-framework context. Do not introduce a virtual DOM or framework.
10. **No TypeScript, no linting config** — the project intentionally has no tooling. Keep it that way unless specifically asked to add it.

---

## Common Tasks

### Adding a New CORS Proxy

Add a new function to the `CORS_PROXIES` array:
```js
url => 'https://new-proxy.example.com/?url=' + encodeURIComponent(url),
```

### Adding a New Faculty

Add an entry to the `DEPARTMENTS` object:
```js
WXX: { name: 'Wydz. Nowy', lato: 'https://wxx.wat.edu.pl/plany/lato', zima: 'https://wxx.wat.edu.pl/plany/zima' }
```

### Adding a Free Group

Add the group name (uppercase) to `FREE_GROUPS`:
```js
const FREE_GROUPS = ['WEL24EQ3S1', 'NEW24XX1S1'];
```

### Changing the Unlock Code

1. Choose a new 5-digit numeric code.
2. Compute: `SHA-256('wat_plan_' + code)` (use any SHA-256 tool).
3. Update `UNLOCK_HASH` with the hex digest.
4. The salt `UNLOCK_SALT` can also be changed if needed.

### Cache Busting After Major Updates

Increment the cache version in `sw.js`:
```js
const CACHE = 'wat-plan-v3'; // was v2
```

---

## Git & Deployment Notes

- Main branch: `master` → auto-deploys to GitHub Pages.
- Feature branches should be named `claude/<description>-<id>` when created by AI assistants.
- There is no CI/CD pipeline beyond GitHub Pages auto-deploy.
- No automated tests exist. Manual browser testing is the QA process.
