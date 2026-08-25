# Bathroom planner

A single-file plan-and-3D layout tool for one specific bathroom: 1800 × 2700 main room
with an 1800 × 800 shower recess across the top, offset 200mm to the right.

**[Open the planner →](https://zeromusta.github.io/lon-bathy/)**

Drag fixtures around a 2D plan, watch clearances update live, and check the result in 3D.
Everything is in millimetres, origin at the outer corner of the shower recess.

## Sharing a layout

**Copy share link** puts the entire layout into the URL's hash fragment — compacted to
positional tuples, deflated, then base64url'd. A typical plan comes to about 230
characters; a pathological one with every fixture doubled is still under 700.

The 3D viewing angle goes in too, so a link opens on the view you were looking at. That
costs 21 characters. The angle is also kept in saved layouts and the autosave, so a reload
resumes where you left off.

Nothing is uploaded. The fragment never leaves the browser, so anyone opening the link
reconstructs the plan locally from the link itself. Opening a link doesn't overwrite
whatever you had going — autosave pauses until you hit **Save**, at which point the
layout becomes yours and the link drops out of the address bar.

Saved layouts live in this browser's `localStorage` only. **Export file** is the backup
that survives clearing browser data.

## Running it locally

No build step, no dependencies to install. Serve the directory over HTTP — `file://`
works too, but `localStorage` and the clipboard are unreliable there:

```bash
python3 -m http.server 8765
```

Then open http://localhost:8765.

The only external dependencies are three.js r128 from cdnjs and two Google fonts, both
over https.

## Tests

```bash
node test/share-codec.test.mjs && node test/link-compat.test.mjs
```

Covers the share codec: round-tripping every fixture type, items modified away from the
catalogue defaults, non-ASCII and HTML-ish layout names, the uncompressed fallback path,
and that truncated, corrupted, over-long and wrong-version payloads all produce a
readable error rather than a blank room. It slices the marked regions out of
`index.html`, so the single-file app stays a single file.

`link-compat` is the one that matters once links are out in the world: it holds payloads
captured from shipped builds and checks they still decode to exactly what they decoded to
when they were made. Those payloads are frozen — if one fails, fix the code, not the test.

## Orientation

`index.html` is the whole app. See [HANDOVER.md](HANDOVER.md) for how the geometry,
catalogue and storage layers fit together, and for the list of bugs not to reintroduce.
