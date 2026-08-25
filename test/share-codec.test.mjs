/* Round-trip and robustness tests for the share-link codec.
   The app is one file with no build step, so this slices the two marked
   regions out of index.html and evaluates them. The markers are what make
   that safe — no line numbers, and a rename breaks the test loudly. */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import assert from "node:assert/strict";

const here = dirname(fileURLToPath(import.meta.url));
const src  = readFileSync(join(here, "..", "index.html"), "utf8");

function region(name){
  const re = new RegExp(`==${name}-START==[\\s=]*\\*/([\\s\\S]*?)/\\*\\s*==${name}-END==`);
  const m = re.exec(src);
  if(!m) throw new Error(`Couldn't find the ${name} region in index.html — did the markers move?`);
  return m[1];
}

const FORMAT = /const FORMAT\s*=\s*"([^"]*)"/.exec(src)?.[1];
assert.ok(FORMAT, "couldn't read FORMAT out of index.html");

const mod = await import("data:text/javascript;base64," + Buffer.from(
  `const FORMAT = ${JSON.stringify(FORMAT)};\n` +
  region("CATALOGUE") + "\n" + region("SHARE-CODEC") + "\n" +
  `export {CAT, DEF, SHARE_V, SHARE_MAX, compactItems, expandItems, encodeShare, decodeShare};`
).toString("base64"));

const {CAT, DEF, compactItems, expandItems, encodeShare, decodeShare} = mod;

/* itemData()'s shape: what the app actually hands the encoder. */
const norm = i => ({t:i.t, n:i.n, x:Math.round(i.x), y:Math.round(i.y),
                    w:i.w, d:i.d, h:i.h, rot:i.rot, mount:i.mount||0, noclash:i.noclash?1:0});
const mk = (t, x, y, rot, name) => norm({t, n:name||DEF[t].n, x, y,
                                         w:DEF[t].w, d:DEF[t].d, h:DEF[t].h,
                                         rot:rot||0, mount:DEF[t].mount||0});

const DEFAULT_LAYOUT = [
  mk("glass", 1400, 800, 0), mk("head", 1875, 400, 0), mk("gully", 1400, 120, 0),
  mk("vanity", 225, 1800, 270), mk("mircab", 75, 1800, 270), mk("wc", 1530, 1200, 90),
  mk("bath", 1425, 2750, 90), mk("rail", 55, 2900, 90), mk("planttall", 1600, 1750, 0)
];

const ALL_TYPES = CAT.flatMap(g => g.items.map(i => i.t));
const DOUBLED = [...ALL_TYPES, ...ALL_TYPES].map((t,k) => mk(t, 200 + k*37, 300 + k*53, (k%4)*90));

const MODIFIED = [
  {...mk("bath", 1425, 2750, 90), w:1700, d:800, n:'Bath "the big one" <&>'},
  {...mk("mirror", 100, 900, 90), h:1200, mount:1000},
  {...mk("duct", 1600, 1100, 0), w:900, h:2400},
  {...mk("wc", 1530, 1200, 90), mount:0},
  {...mk("planttall", 300, 400, 0), noclash:1},
  {...mk("cornersh", 320, 420, 0), noclash:1, w:260},
];

let pass = 0, fail = 0;
async function t(name, fn){
  try{ await fn(); pass++; console.log(`  ok   ${name}`); }
  catch(e){ fail++; console.log(`  FAIL ${name}\n       ${e.message}`); }
}

console.log("\nshare codec\n");

/* --- the test that matters --------------------------------------------- */
await t("compact/expand round-trips the default layout", () => {
  assert.deepStrictEqual(expandItems(compactItems(DEFAULT_LAYOUT)), DEFAULT_LAYOUT);
});
await t("compact/expand round-trips every fixture type, doubled", () => {
  assert.deepStrictEqual(expandItems(compactItems(DOUBLED)), DOUBLED);
});
await t("compact/expand round-trips items modified away from the defaults", () => {
  assert.deepStrictEqual(expandItems(compactItems(MODIFIED)), MODIFIED);
});
await t("the ignore-clashes flag survives a round trip, and costs nothing when off", async () => {
  const flagged = await decodeShare(await encodeShare("Flagged", MODIFIED));
  assert.deepStrictEqual(flagged.items.map(i => i.noclash), [0,0,0,0,1,1]);
  const clean = compactItems(DEFAULT_LAYOUT);
  assert.ok(clean.every(t => t.length === 4), "unflagged items should stay bare 4-tuples");
});
await t("every catalogue fixture has a 2D glyph, and a 3D case if it names one", () => {
  const all = CAT.flatMap(g => g.items);
  assert.ok(all.length >= 26, `only ${all.length} fixtures in the catalogue`);
  for(const i of all) assert.ok(i.glyph, `${i.t} has no glyph`);
  for(const t of ["wcfloor","gullyrnd","floatshelf","chute"])
    assert.ok(DEF[t], `${t} missing from the catalogue`);
  assert.equal(DEF.wcfloor.glyph, DEF.wc.glyph, "both WCs should share the 2D outline");
  assert.notEqual(DEF.wcfloor.mesh, undefined, "the floor WC needs its own 3D mesh");
});
await t("encode/decode round-trips through compression", async () => {
  const snap = await decodeShare(await encodeShare("Bathroom plan", DEFAULT_LAYOUT));
  assert.deepStrictEqual(snap.items, DEFAULT_LAYOUT);
  assert.equal(snap.name, "Bathroom plan");
  assert.equal(snap.format, FORMAT);
});
await t("encode/decode round-trips the 44-item layout", async () => {
  const snap = await decodeShare(await encodeShare("Everything", DOUBLED));
  assert.deepStrictEqual(snap.items, DOUBLED);
});
await t("names survive verbatim, quotes and angle brackets included", async () => {
  const snap = await decodeShare(await encodeShare('A <b>"name"</b> & co', MODIFIED));
  assert.equal(snap.name, 'A <b>"name"</b> & co');
  assert.deepStrictEqual(snap.items, MODIFIED);
});
await t("an empty layout round-trips", async () => {
  const snap = await decodeShare(await encodeShare("Empty", []));
  assert.deepStrictEqual(snap.items, []);
});
await t("a leading # is tolerated", async () => {
  const snap = await decodeShare("#" + await encodeShare("Hashed", DEFAULT_LAYOUT));
  assert.deepStrictEqual(snap.items, DEFAULT_LAYOUT);
});

/* --- the uncompressed fallback path ------------------------------------ */
await t("the p1u. fallback round-trips", async () => {
  const payload = await encodeShare("No compression", DEFAULT_LAYOUT, {compress:false});
  assert.ok(payload.startsWith("p1u."), `expected a p1u. payload, got ${payload.slice(0,6)}`);
  assert.deepStrictEqual((await decodeShare(payload)).items, DEFAULT_LAYOUT);
});

/* --- bad input gives a readable error, never a blank room -------------- */
const rejects = async (payload, label) => {
  await assert.rejects(() => decodeShare(payload), err => {
    assert.ok(err instanceof Error, `${label}: threw a non-Error`);
    assert.ok(/[a-z]{3}/.test(err.message) && err.message.length > 15,
              `${label}: message isn't readable — ${JSON.stringify(err.message)}`);
    return true;
  }, `${label}: should have been rejected`);
};

await t("a truncated payload is rejected", async () => {
  const full = await encodeShare("Bathroom plan", DEFAULT_LAYOUT);
  for(const frac of [0.9, 0.6, 0.3]) await rejects(full.slice(0, Math.floor(full.length*frac)), `cut to ${frac}`);
});
await t("a corrupted payload is rejected", async () => {
  const full = await encodeShare("Bathroom plan", DEFAULT_LAYOUT);
  const mid = Math.floor(full.length/2);
  await rejects(full.slice(0, mid) + (full[mid] === "Q" ? "Z" : "Q") + full.slice(mid+1), "byte flipped");
});
await t("junk, empty and wrong-prefix payloads are rejected", async () => {
  for(const p of ["", "#", "not-a-payload", "p2.AAAA", "p1.", "p1.!!!!", "p9u.AAAA", "AAAA"])
    await rejects(p, JSON.stringify(p));
});
await t("an over-long payload is rejected before it is parsed", async () => {
  await rejects("p1." + "A".repeat(mod.SHARE_MAX + 1), "over the cap");
});
await t("valid base64 that isn't a layout is rejected", async () => {
  await rejects("p1u." + Buffer.from('{"nope":true}').toString("base64url"), "an object");
  await rejects("p1u." + Buffer.from('[99,"x",[]]').toString("base64url"), "a future version");
  await rejects("p1u." + Buffer.from('[1,"x","not-an-array"]').toString("base64url"), "items not an array");
  await rejects("p1u." + Buffer.from('[1,"x",[["bath",1,2,0],"junk"]]').toString("base64url"), "a junk item");
});
await t("unknown fixture types decode to something restore() will filter", async () => {
  const payload = "p1u." + Buffer.from(JSON.stringify([1,"Mixed",[["bath",100,200,0],["jacuzzi",1,2,0]]])).toString("base64url");
  const snap = await decodeShare(payload);
  assert.equal(snap.items.length, 2, "decode keeps them; restore() is what drops them");
  assert.deepStrictEqual(snap.items.filter(i => DEF[i.t]).map(i => i.t), ["bath"]);
});

/* --- size budget -------------------------------------------------------- */
await t("links stay well inside a 2000-character budget", async () => {
  const base = "https://zeromusta.github.io/lon-bathy/#".length;
  const rows = [["Default, 9 items", DEFAULT_LAYOUT], [`Doubled, ${DOUBLED.length} items`, DOUBLED]];
  console.log("");
  for(const [label, list] of rows){
    const json = JSON.stringify({format:FORMAT, version:1, name:"Bathroom plan",
                                 saved:new Date().toISOString(), room:{}, items:list}).length;
    const compact = JSON.stringify([1, "Bathroom plan", compactItems(list)]).length;
    const payload = (await encodeShare("Bathroom plan", list)).length;
    console.log(`       ${label.padEnd(20)} json ${String(json).padStart(5)}  compact ${String(compact).padStart(5)}  payload ${String(payload).padStart(5)}  link ${base + payload}`);
    assert.ok(base + payload < 2000, `${label}: link is ${base+payload} chars`);
  }
  console.log("");
});

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
