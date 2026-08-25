# Bathroom planner — handover

A single-file web app for laying out one specific bathroom: 1800 × 2700 main room with an
1800 × 800 shower recess across the top, offset 200mm to the right. 2D plan with draggable
fixtures, live clearance dimensions, and a 3D view. No build step, no package.json, no
dependencies beyond three.js r128 from cdnjs and two Google fonts.

`index.html` is the whole app. Everything below assumes you're editing that.

Published at <https://zeromusta.github.io/lon-bathy/> — GitHub Pages from the root of
`main`, so a push to `main` is a deploy.

---

## Share links

The whole layout rides in the hash fragment:

```
https://zeromusta.github.io/lon-bathy/#p1.<payload>
```

The fragment is never sent to the server, has no server-side length limit, and works on a
static host. A query string would get logged by every proxy in between and buy nothing.

### Pipeline

1. **Compact the items.** Positional tuples `[type, x, y, rot]`, with a trailing object
   only for fields that differ from the catalogue default in `DEF`. Most placed fixtures
   are unmodified, so this is where the bulk of the saving comes from — well before
   compression gets involved.
2. **Wrap as** `[schemaVersion, name, items, view?]` — no `saved` timestamp, no `room`
   block; both are re-derivable and the room is fixed. `view` is the 3D camera as six
   integers (see below) and is optional, so a link made before it existed still decodes.
3. **`CompressionStream('deflate-raw')`**, then base64url. Both are async, so the button
   handler is `async`. Where `CompressionStream` is missing the payload is marked `p1u.`
   (uncompressed) and the decoder takes the other path.
4. **Version prefix `p1.`** so a future format change is detectable rather than silently
   mis-decoded.

### Sizes — measured, not estimated

Numbers from `node test/share-codec.test.mjs`, which prints the table on every run:

| Layout | Export JSON | Compacted | Payload | Full link |
|---|---|---|---|---|
| Default, 9 items | 965 | 218 | **190** | 229 |
| Every fixture doubled, 44 items | 4260 | 1020 | **629** | 668 |

Against a conservative 2000-character budget the pathological case uses 33%. Plenty of
headroom; no need to get clever with bit-packing. Note the 44-item row uses catalogue
default sizes throughout, so almost none of those tuples carry a trailing object — a
layout that heavily resizes fixtures sits somewhere above this.

### On load

`location.hash` is decoded and loaded, and the panel switches to **Files** so the result
is visible — that matters as much for the error case as the happy one. Autosave is
**paused** until the user saves: landing on someone else's link must not quietly
overwrite the session they had open. Saving adopts the layout, resumes autosave, and
`replaceState`s the hash away so a reload shows their work rather than the link's.

The link is generated on demand only. The address bar is never live-updated as fixtures
move — that churns the URL and makes the back button useless.

### The camera rides along

The 3D viewing angle is part of the layout — in the link, in saved layouts, in exported
files and in the autosave, so a reload resumes the view you left and a link opens on the
angle you were looking at.

`cam` is `{theta, phi, r, tx, ty, tz}`. `viewTuple` stores angles as thousandths of a
radian and distances as whole mm, giving six small integers: about a tenth of a degree of
precision, and 21 characters on the payload. `theta` is wrapped to ±π first, because
orbiting accumulates it without bound and a long session would otherwise encode a camera
that had been round the houses a dozen times.

`viewFromTuple` clamps every field to the orbit controls' own limits and returns `null`
for anything it can't read — a camera outside those limits renders an empty pane, which
just looks like a broken app. `restore()` is where that validation happens, the same
single door the items go through; `decodeShare` passes the raw tuple straight on.

Camera movement autosaves (debounced) but deliberately does **not** mark the layout dirty
— `itemsJSON()` stays items-only, so nudging the view doesn't flash "Unsaved changes".
The same goes for the share link box's freshness check.

### Links are in live use — do not break them

Real links are out there in messages. **An old link must keep decoding to exactly what it
decoded to when it was made.** `node test/link-compat.test.mjs` holds a corpus of frozen
payloads captured from a shipped build; if one of them starts decoding differently, the
fix is the code, not the corpus. Never regenerate that file.

Safe: **adding** a fixture type. No existing link can contain a key that didn't exist.

Not safe, in ways that fail silently rather than loudly:

- **Renaming or removing a type key.** `restore()` filters unknown types, so the fixture
  just disappears from every link that had one.
- **Changing an existing type's default `w`/`d`/`h`/`mount`/`n`.** This is the subtle one.
  `compactItems` omits any field that matches the catalogue default, so a link written
  when `bath` was 1500 wide carries no width at all — change the default to 1600 and that
  link now decodes to a wider bath than the person laid out. If a default really must
  change, add a new type instead and leave the old one in the catalogue.
- Reordering the item tuple, renaming an extras key (`n`/`w`/`d`/`h`/`mount`/`nc`), or
  bumping `SHARE_V`.
- Changing the view tuple's order or its thousandths-of-a-radian scaling.

### Decoding is the untrusted path

- It routes through the existing `restore()`, so unknown fixture types are still filtered
  out. A share link doesn't get a second, laxer way into `items[]`.
- The encoded payload is length-capped (`SHARE_MAX`) before anything parses it, the
  inflate is capped mid-stream (`SHARE_CAP`) so a small payload can't expand into a large
  one, and the item count is capped (`SHARE_ITEMS`).
- Every failure produces a readable message and falls back to the autosaved session —
  never a blank room.

File export was kept as a small secondary. It's the only backup that survives clearing
browser data, whereas a link in a chat message is easy to lose. The old
copy/paste-as-text box went; links make it redundant.

---

## Orientation

Everything is in **millimetres**, origin at the outer corner of the shower recess.

- `R`, `POLY` — room definition and the interior outline polygon.
- `OUTER` — `POLY` offset outward by `WALL_T` with **mitred corners**.
- `BANDS` — one axis-aligned rect per wall, derived from `POLY` + `OUTER`. Both the 2D
  walls and the 3D wall boxes come from this.
- `CAT` / `DEF` — fixture catalogue: default sizes, heights, `mount` (height off floor),
  which 2D `glyph` to draw, and optionally a `mesh` naming a different 3D case. The two
  WCs share `glyph:"wc"` so their plan outline is identical, and differ only in `mesh`.
- `items[]` — everything placed. `{id, t, n, x, y, w, d, h, rot, mount, noclash}`,
  `x`/`y` are the centre. `noclash` exempts an item from clash detection in both
  directions — for deliberate overlaps like a pot plant sitting in a corner shelf.
- `inert(i)` — `PHANTOM` type or `noclash` set. The single test `clashes()` uses.
- `itemsAt(x,y)` / `currentStack()` / `pickBehind()` — the overlap stack under the last
  click, topmost first, which the **Behind** button and the `B` key walk down. Needed
  because the mirror cabinet sits inside the vanity's footprint and SVG hit-testing only
  ever returns the top one. `zRank` mirrors `renderPlan`'s `zOrder`, so the stack is
  numbered the way the plan is painted; change one and you must change the other.
- `deepPickId` — the item `pickBehind()` last dug out. While it is both selected and under
  the cursor it keeps the drag; any other selection clears it, so it self-cleans.
- `taperBox(w,h,d,k,…)` — a box narrowed towards the bottom, built from a 4-segment
  cylinder turned 45°. Exact `w × h × d` bounds, so 3D footprints still match 2D.
- `makeRenderer()` — WebGL context with a step-down ladder; see the Firefox note below.
- `VIEW_DEF` / `cam` / `viewTuple` / `viewFromTuple` — the 3D camera and its codec. `cam`
  is spread from `VIEW_DEF` so the starting angle has one definition.
- `store` — localStorage with an in-memory fallback, probed at init.
- `restore(snap)` — the single validated entry point from saved data into `items`.
- `compactItems` / `expandItems` / `encodeShare` / `decodeShare` — the share codec.

## Tests

```bash
node test/share-codec.test.mjs     # the codec's behaviour
node test/link-compat.test.mjs     # frozen payloads from live links still decode
```

Run **both** before pushing anything that touches the catalogue or the codec.

The share codec is covered properly: round trips, items modified away from the defaults,
non-ASCII and HTML-ish names, the uncompressed path, and every corruption case. It slices
the regions between the `==CATALOGUE-START==` / `==SHARE-CODEC-START==` marker comments
out of `index.html` and evaluates them, so the app stays one file with no build step. The
markers are what makes that safe — no line numbers, and a rename fails the test loudly
rather than silently testing nothing.

Geometry, the 3D mesh builders and the storage layer are **not** covered. Those were each
verified with throwaway node harnesses that sliced pure functions out of the file; that
worked but is gone. If you want them tested, the same marker trick will work.

## Don't regress these

Each of these was a real bug, found and fixed:

- **Walls come from `BANDS`.** The earlier approach drew each wall as its own rect
  stretched `WALL_T` past both ends. That closes outside corners but overshoots at the
  two inside corners (top-left nib, and the recess return on the right), producing a
  visible cross of wall poking into the room. If you touch wall rendering, check both
  inside corners.
- **Clash detection is footprint AND height.** `vOv()` compares `[mount, mount+h]`.
  Without it a mirror at 1100 falsely clashes with the vanity at 850. `PHANTOM` is only
  for genuinely non-physical things (recessed niche, floor drain).
- **Rotation conventions.** `rot` is degrees clockwise in plan. 3D uses
  `rotation.y = -rad(rot)`, and plan `y` maps to world `z`. Getting this wrong points
  every fixture's back at the wrong wall.
- **Drawing type sizes are in mm**, tuned to stay legible when the plan pane is ~600px
  wide. They look absurdly large in the source. Leave them.
- **`esc()` any user string** before it goes into `innerHTML` — layout names reach the
  DOM in three places. The share link box is set via `.value`, not interpolated, which is
  why it needs no escaping; keep it that way.
- **Typing in a dimension field must not re-render the inspector**, or focus is lost
  mid-keystroke. Only the plan, chips, clearances and 3D update. The Ignore-clashes
  checkbox follows the same rule.
- **3D footprints must match the 2D outline.** The wall-hung WC was built `D*0.75` deep,
  which at its default 400 × 540 came out 400 × 405 — square from above, and nothing like
  the plan. If you add a fixture, check its `Box3` against `w` × `d` rather than eyeballing
  it; the two toilets are the easy regression to re-run.
- **A `noclash` item is inert on both sides.** Flagging the plant has to stop the *shelf*
  reporting a clash too, which is why `clashes()` filters `inert` inside the `.some()` as
  well as at the top.
- **The GO block's order is load-bearing.** `setNav()` and `setView()` both call
  `resize3D()`, which reads `renderer` — declared with `let` further down the file. Calling
  either at definition time throws on the temporal dead zone and kills the rest of the
  script, which presents as a completely blank plan. They are applied at the very end,
  after `init3D()`, which also keeps the WebGL context from ever being requested on a
  `display:none` canvas.
- **Digging an item out with Behind has to survive the next `pointerdown`.** Anything
  Behind reaches is by definition not topmost, so `closest(".item")` hands the selection
  straight back to whatever covers it and the item can be selected but never dragged.
  `deepPickId` is what holds it. Don't widen that to "keep whatever is selected": an item
  can be selected while something painted *over* it is what the user just clicked, and
  they should get the thing they clicked.
- **Link loading hangs off `hashchange` as well as startup.** Pasting a link into a tab
  that already has the planner open changes the hash without reloading, so a startup-only
  hook silently does nothing. `replaceState` on save doesn't fire it, which is what makes
  clearing the hash there safe.
- **`zipPipe`'s writer needs `.catch()` on the whole chain**, not a rejection handler on
  `write()` alone. `w.close()` returns its own promise, and a corrupt payload rejects it —
  which crashes the tab as an unhandled rejection instead of surfacing as a caught error
  on the read side.

## The 3D view only draws when something changes

Nothing in the scene animates, so the old `requestAnimationFrame` loop spent a core and a
GPU process redrawing an identical image forever — Mark saw Edge sitting at ~23% CPU and
~21% GPU on an idle tab.

`invalidate()` marks the view dirty and schedules **at most one** frame; `animate()` clears
`rafId`, draws once, and schedules nothing. The loop falls idle on its own. Measured at
zero draws over 16 seconds idle, against ~985 before.

Everything that changes what the camera would see has to call it: `build3DItems`,
`move3D`, `resize3D`, the orbit `pointermove`, the wheel handler, and `restore()` when a
saved view lands. **If you add anything that moves a mesh or the camera and skip
`invalidate()`, the change silently will not appear** — that's the trap this design sets,
and it's the thing to check first if the 3D view ever looks stale.

A hidden tab suspends rAF, which is the browser saving the work for us; the
`visibilitychange` handler redraws once on the way back, since a backgrounded tab can lose
its drawing buffer.

## 3D and Firefox

Mark hit `THREE.WebGLRenderer: Error creating WebGL context` in Firefox, which used to
throw straight out of the top-level `init3D()` call and leave a dead pane with no
explanation. Now:

- `makeRenderer()` steps down through weaker context requests — MSAA off, then
  `low-power`, then `failIfMajorPerformanceCaveat:false` — on a **fresh canvas each time**,
  because a canvas that has already failed `getContext` will not hand one over on a retry.
- If every attempt fails, the pane explains that it's almost certainly hardware
  acceleration being off in Firefox, gives the settings path, and prints the raw error.
  The 2D plan, clearances and sharing are untouched.
- `webglcontextlost` and a throwing `renderer.render` both stop the loop and show the same
  panel, rather than spewing an error every frame.

This was not reproducible here — the step-down ladder is a reasonable guess at a
recoverable cause, not a verified fix for Mark's machine. If it still fails, the message
now carries the real error, which is the thing to go on. three.js is pinned at r128
(2021); a newer build is a plausible next thing to try, but the post-r128 API changes make
it more than a version bump.

## Phones

Two breakpoints. **≤900px** stacks the two panes vertically and narrows the sidebar.
**≤700px** is the phone layout:

- The sidebar **slides over** the stage as a 320px drawer with a tappable scrim, rather
  than squeezing it — at 288px it was taking two thirds of a 375px screen. It collapses at
  every width, though; on desktop it stays in flow and just goes to zero, handing the
  space to the panes.
- The header must never wrap. `h1` is `nowrap` + ellipsis, the room dimensions in the
  `<span>` are hidden (they are dimensioned on the plan anyway), **Split** is hidden since
  two slivers on a phone helps nobody, and Reset lost the word "layout". Three wrapped
  lines of title were what pushed the whole app down the screen.
- The phone opens on **Plan**, not Split.
- `.hint` and `.pane-hd` are hidden — the hints talk about right-drag and arrow keys, and
  the pane label collided with the chips.
- Every focusable input is **≥16px** on phones, below which iOS zooms the page on focus.
- `#c3d` needs `touch-action:none` the same as `#plan`, or orbiting scrolls the page.
- `height:100dvh` so the phone browser's chrome stops covering the bottom of the app.

## The Files panel

- **`currentId` is the slot the layout is bound to** — set on save, on load, on import;
  cleared by `saveAsNew()` so `saveCurrent()` mints a fresh one. The panel says which slot
  is being edited, and the row carries a `current` badge.
- **Save overwrites that slot** (renaming it if the name box changed); **Save as new**
  always creates another, stepping the name via `uniqueName()` so you don't end up with
  two identically-named slots and no way to tell them apart. Save as new only appears when
  there is a slot to fork from — with nothing saved yet the two would do the same thing.
- **One share link exists at a time**, held in `shareUrl` under a `shareUrlFor` key:
  `cur:<itemsJSON>` for the working layout, `row:<id>:<saved>` for a saved slot. The box
  renders wherever the key matches, so it always appears next to the thing it is a link
  to, and a row's link stops being offered the moment that row is re-saved.
- A row's **Link** encodes that row's own items and its own saved camera — not whatever
  happens to be loaded. Worth re-testing if you touch `makeShareLink`; it is an easy thing
  to get subtly wrong and never notice.

## Open questions for Mark

- **Bath taps** are on the right-hand wall at the end nearest the WC. Best guess from
  "same wall as the toilet"; could be a wall spout over the long side instead.
- **No window** — nothing was on the original sketch.
- **Wet room floor** assumed: level throughout, linear drain, no tray or kerb.
- **Wall-hung WC** needs a duct roughly 200 deep that isn't in the default layout. It
  eats into the 810mm gangway. There's a "Duct / boxing" item in the palette to model it.
- Sizes are bare structure — no allowance for tiling or boarding.
- **Laundry chute** is 400 wide × 400 high as asked, with a 200 depth guessed for the
  hatch and a 900 mount. It's `PHANTOM`, on the grounds that it's an opening in the wall
  rather than something standing in the room — say if it should take up floor space.
- **Floor WC** is 400 × 700 × 800, the usual close-coupled envelope, and now the default.
  The wall-hung one is still in the palette.
