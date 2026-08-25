/* Wire-format compatibility. Real share links are in use, so these payloads
   are FROZEN — captured from a shipped build and never regenerated. If a change
   makes one of them decode differently, that change silently rewrites somebody's
   saved plan, and the fix is to change the code, not this file.

   Adding a NEW fixture type is always safe: old links cannot contain it.
   What is not safe, and what these tests exist to catch:
     - renaming or removing a type key  -> restore() drops it, fixtures vanish
     - changing a type's default w/d/h/mount/name -> compactItems omits fields that
       match the default, so an old link that omitted one now expands to the new
       value, quietly resizing or renaming a fixture
     - reordering the tuple, renaming an extras key, or changing SHARE_V
     - changing the view tuple's order or its thousandths-of-a-radian scaling
*/
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

const mod = await import("data:text/javascript;base64," + Buffer.from(
  `const FORMAT = ${JSON.stringify(FORMAT)};\n` +
  region("CATALOGUE") + "\n" + region("SHARE-CODEC") + "\n" +
  `export {CAT, DEF, decodeShare, viewFromTuple};`
).toString("base64"));
const {CAT, DEF, decodeShare, viewFromTuple} = mod;

/* Captured from a shipped build. Do not regenerate. */
const FROZEN_DEFAULTS = {
  "bath": {
    "n": "Bath",
    "w": 1500,
    "d": 750,
    "h": 550,
    "mount": 0
  },
  "wc": {
    "n": "WC (wall hung)",
    "w": 400,
    "d": 540,
    "h": 400,
    "mount": 400
  },
  "wcfloor": {
    "n": "WC (floor)",
    "w": 400,
    "d": 700,
    "h": 800,
    "mount": 0
  },
  "duct": {
    "n": "Duct / boxing",
    "w": 1200,
    "d": 200,
    "h": 2700,
    "mount": 0
  },
  "vanity": {
    "n": "Vanity, 1 basin",
    "w": 1200,
    "d": 450,
    "h": 850,
    "mount": 0
  },
  "basin": {
    "n": "Basin only",
    "w": 550,
    "d": 400,
    "h": 200,
    "mount": 800
  },
  "glass": {
    "n": "Shower glass",
    "w": 800,
    "d": 20,
    "h": 2000,
    "mount": 0
  },
  "head": {
    "n": "Shower head",
    "w": 250,
    "d": 120,
    "h": 120,
    "mount": 2050
  },
  "gully": {
    "n": "Linear drain",
    "w": 800,
    "d": 80,
    "h": 10,
    "mount": 0
  },
  "gullyrnd": {
    "n": "Round drain",
    "w": 120,
    "d": 120,
    "h": 10,
    "mount": 0
  },
  "mirror": {
    "n": "Mirror",
    "w": 800,
    "d": 30,
    "h": 900,
    "mount": 1050
  },
  "mircab": {
    "n": "Mirror cabinet",
    "w": 800,
    "d": 150,
    "h": 700,
    "mount": 1150
  },
  "cornersh": {
    "n": "Corner shelf",
    "w": 200,
    "d": 200,
    "h": 1200,
    "mount": 0
  },
  "shelf": {
    "n": "Open shelf",
    "w": 600,
    "d": 150,
    "h": 900,
    "mount": 1200
  },
  "floatshelf": {
    "n": "Floating shelf",
    "w": 600,
    "d": 200,
    "h": 40,
    "mount": 1200
  },
  "cab": {
    "n": "Tall cupboard",
    "w": 400,
    "d": 350,
    "h": 1800,
    "mount": 0
  },
  "niche": {
    "n": "Recessed niche",
    "w": 400,
    "d": 100,
    "h": 600,
    "mount": 1100
  },
  "rail": {
    "n": "Towel rail",
    "w": 600,
    "d": 110,
    "h": 900,
    "mount": 900
  },
  "radrail": {
    "n": "Heated rail",
    "w": 500,
    "d": 120,
    "h": 1200,
    "mount": 400
  },
  "hook": {
    "n": "Towel hook",
    "w": 120,
    "d": 80,
    "h": 80,
    "mount": 1600
  },
  "planttall": {
    "n": "Pot plant, tall",
    "w": 400,
    "d": 400,
    "h": 1500,
    "mount": 0
  },
  "plantshort": {
    "n": "Pot plant, short",
    "w": 300,
    "d": 300,
    "h": 600,
    "mount": 0
  },
  "stool": {
    "n": "Stool",
    "w": 350,
    "d": 350,
    "h": 450,
    "mount": 0
  },
  "basket": {
    "n": "Laundry basket",
    "w": 400,
    "d": 400,
    "h": 600,
    "mount": 0
  },
  "bin": {
    "n": "Bin",
    "w": 250,
    "d": 250,
    "h": 400,
    "mount": 0
  },
  "chute": {
    "n": "Laundry chute",
    "w": 400,
    "d": 200,
    "h": 400,
    "mount": 900
  }
};

const FROZEN_LINKS = [
  {
    "label": "the default layout as shipped",
    "payload": "p1.VY9BDoIwEEWvYmY9Jm1DKWy9RtPFgAokhZpSNN7eaQUTF7N5_-Xnj5UIF0pjDGE-PTwtgNbC4GldAWUlBDZ8wqGF8UZXZo3RWB1s2Lx_76JUO3zSMiWmSmnWOVGm8HmKPXWA5h-_-rsPIeYWXVoEtiXoeFemXKOMPmikyQNqZu3PzMNTIs-BrPOUrAvH0VkKJbHlaXXZKPJH-ms49wE",
    "name": "Bathroom plan",
    "items": [
      {
        "t": "glass",
        "n": "Shower glass",
        "x": 1400,
        "y": 800,
        "w": 800,
        "d": 20,
        "h": 2000,
        "rot": 0,
        "mount": 0,
        "noclash": 0
      },
      {
        "t": "head",
        "n": "Shower head",
        "x": 1875,
        "y": 400,
        "w": 250,
        "d": 120,
        "h": 120,
        "rot": 0,
        "mount": 2050,
        "noclash": 0
      },
      {
        "t": "gully",
        "n": "Linear drain",
        "x": 1400,
        "y": 120,
        "w": 800,
        "d": 80,
        "h": 10,
        "rot": 0,
        "mount": 0,
        "noclash": 0
      },
      {
        "t": "vanity",
        "n": "Vanity, 1 basin",
        "x": 225,
        "y": 1800,
        "w": 1200,
        "d": 450,
        "h": 850,
        "rot": 270,
        "mount": 0,
        "noclash": 0
      },
      {
        "t": "mircab",
        "n": "Mirror cabinet",
        "x": 75,
        "y": 1800,
        "w": 800,
        "d": 150,
        "h": 700,
        "rot": 270,
        "mount": 1150,
        "noclash": 0
      },
      {
        "t": "wcfloor",
        "n": "WC (floor)",
        "x": 1450,
        "y": 1200,
        "w": 400,
        "d": 700,
        "h": 800,
        "rot": 90,
        "mount": 0,
        "noclash": 0
      },
      {
        "t": "bath",
        "n": "Bath",
        "x": 1425,
        "y": 2750,
        "w": 1500,
        "d": 750,
        "h": 550,
        "rot": 90,
        "mount": 0,
        "noclash": 0
      },
      {
        "t": "rail",
        "n": "Towel rail",
        "x": 55,
        "y": 2900,
        "w": 600,
        "d": 110,
        "h": 900,
        "rot": 90,
        "mount": 900,
        "noclash": 0
      },
      {
        "t": "planttall",
        "n": "Pot plant, tall",
        "x": 1600,
        "y": 1750,
        "w": 400,
        "d": 400,
        "h": 1500,
        "rot": 0,
        "mount": 0,
        "noclash": 0
      }
    ],
    "view": [
      -1021,
      920,
      6400,
      1000,
      850,
      1750
    ]
  },
  {
    "label": "resized and renamed fixtures, a clash exemption, an odd camera",
    "payload": "p1.VY9BDsIgEEWvQmbhCpMptFW7dO8JqIuKjTRaMJTahTHxGl7Pkzi0bNxMwvz5739UxuHQ-Ov3_RnY_dZYVsND1MBWTDvgSsGpCQZ4JhC5KGnskD_BQgX77sIWESaosg1pcIZqi_g6cgV9573z5Jw9yWfoMJKgd6MN9MB0rZ23rR9iUllQEu05RiF2CoNxPvxJsYMm_2yeNGmFxKXlHJT4CW7G0EJqEbm0XAtJMJkTMO4ySSN-T-RI-g8",
    "name": "Mark’s plan \"v2\" & co",
    "items": [
      {
        "t": "bath",
        "n": "Big bath",
        "x": 1200,
        "y": 2600,
        "w": 1700,
        "d": 800,
        "h": 550,
        "rot": 90,
        "mount": 0,
        "noclash": 0
      },
      {
        "t": "mirror",
        "n": "Mirror",
        "x": 100,
        "y": 900,
        "w": 800,
        "d": 30,
        "h": 1200,
        "rot": 90,
        "mount": 1000,
        "noclash": 0
      },
      {
        "t": "cornersh",
        "n": "Corner shelf",
        "x": 1650,
        "y": 2000,
        "w": 200,
        "d": 200,
        "h": 1200,
        "rot": 0,
        "mount": 0,
        "noclash": 0
      },
      {
        "t": "plantshort",
        "n": "Pot plant, short",
        "x": 1650,
        "y": 2000,
        "w": 300,
        "d": 300,
        "h": 600,
        "rot": 0,
        "mount": 0,
        "noclash": 1
      },
      {
        "t": "wc",
        "n": "WC (wall hung)",
        "x": 1530,
        "y": 1200,
        "w": 400,
        "d": 540,
        "h": 400,
        "rot": 90,
        "mount": 0,
        "noclash": 0
      },
      {
        "t": "chute",
        "n": "Laundry chute",
        "x": 900,
        "y": 900,
        "w": 400,
        "d": 200,
        "h": 400,
        "rot": 0,
        "mount": 900,
        "noclash": 0
      }
    ],
    "view": [
      -2350,
      340,
      2900,
      1300,
      600,
      2400
    ]
  },
  {
    "label": "every catalogue type at once",
    "payload": "p1.RZE5csMwDEWvkmGNgvtS5hwaF5QsWxozYoaistw-XzLlFGwewDcAfieIvaf0dpt_6lbGlVHXsT7WiZHknBQev1DHvgcAJUhpR6GRW8q5AFtJKmgS_uDXbaiAQZHWgqQ74Fdc5vrLSElN2vuns4_rvIAZQ0aZpr2nuGIK5S0ZL0_pNMYrIy0cWRlO6X1LCU6tPVln6Z-VZW92gZxUTfsxl7IPawQn5_jpBR5iD4xRPezNPOSyjGXFEYyT5K1-ytdpTDdGlsMqRDPjCrGeFaUpGH_aD7W1hgTn5nQv8zCNwMECG_k0lzgnhnEdWAjNXOK18V0ptH1dI-cHqA-guHMTf6a41BoTPniJDaVu2R2FdcoFuXgjUPFniGvNee_fL63UK0Mk8xjRHYQC968Y-z2voNGnZQtxmLaKdYLDltodKV4ufw",
    "name": "All fixtures",
    "items": [
      {
        "t": "bath",
        "n": "Bath",
        "x": 200,
        "y": 300,
        "w": 1500,
        "d": 750,
        "h": 550,
        "rot": 0,
        "mount": 0,
        "noclash": 0
      },
      {
        "t": "wc",
        "n": "WC (wall hung)",
        "x": 231,
        "y": 347,
        "w": 400,
        "d": 540,
        "h": 400,
        "rot": 90,
        "mount": 400,
        "noclash": 0
      },
      {
        "t": "wcfloor",
        "n": "WC (floor)",
        "x": 262,
        "y": 394,
        "w": 400,
        "d": 700,
        "h": 800,
        "rot": 180,
        "mount": 0,
        "noclash": 0
      },
      {
        "t": "duct",
        "n": "Duct / boxing",
        "x": 293,
        "y": 441,
        "w": 1200,
        "d": 200,
        "h": 2700,
        "rot": 270,
        "mount": 0,
        "noclash": 0
      },
      {
        "t": "vanity",
        "n": "Vanity, 1 basin",
        "x": 324,
        "y": 488,
        "w": 1200,
        "d": 450,
        "h": 850,
        "rot": 0,
        "mount": 0,
        "noclash": 0
      },
      {
        "t": "basin",
        "n": "Basin only",
        "x": 355,
        "y": 535,
        "w": 550,
        "d": 400,
        "h": 200,
        "rot": 90,
        "mount": 800,
        "noclash": 0
      },
      {
        "t": "glass",
        "n": "Shower glass",
        "x": 386,
        "y": 582,
        "w": 800,
        "d": 20,
        "h": 2000,
        "rot": 180,
        "mount": 0,
        "noclash": 0
      },
      {
        "t": "head",
        "n": "Shower head",
        "x": 417,
        "y": 629,
        "w": 250,
        "d": 120,
        "h": 120,
        "rot": 270,
        "mount": 2050,
        "noclash": 0
      },
      {
        "t": "gully",
        "n": "Linear drain",
        "x": 448,
        "y": 676,
        "w": 800,
        "d": 80,
        "h": 10,
        "rot": 0,
        "mount": 0,
        "noclash": 0
      },
      {
        "t": "gullyrnd",
        "n": "Round drain",
        "x": 479,
        "y": 723,
        "w": 120,
        "d": 120,
        "h": 10,
        "rot": 90,
        "mount": 0,
        "noclash": 0
      },
      {
        "t": "mirror",
        "n": "Mirror",
        "x": 510,
        "y": 770,
        "w": 800,
        "d": 30,
        "h": 900,
        "rot": 180,
        "mount": 1050,
        "noclash": 0
      },
      {
        "t": "mircab",
        "n": "Mirror cabinet",
        "x": 541,
        "y": 817,
        "w": 800,
        "d": 150,
        "h": 700,
        "rot": 270,
        "mount": 1150,
        "noclash": 0
      },
      {
        "t": "cornersh",
        "n": "Corner shelf",
        "x": 572,
        "y": 864,
        "w": 200,
        "d": 200,
        "h": 1200,
        "rot": 0,
        "mount": 0,
        "noclash": 0
      },
      {
        "t": "shelf",
        "n": "Open shelf",
        "x": 603,
        "y": 911,
        "w": 600,
        "d": 150,
        "h": 900,
        "rot": 90,
        "mount": 1200,
        "noclash": 0
      },
      {
        "t": "floatshelf",
        "n": "Floating shelf",
        "x": 634,
        "y": 958,
        "w": 600,
        "d": 200,
        "h": 40,
        "rot": 180,
        "mount": 1200,
        "noclash": 0
      },
      {
        "t": "cab",
        "n": "Tall cupboard",
        "x": 665,
        "y": 1005,
        "w": 400,
        "d": 350,
        "h": 1800,
        "rot": 270,
        "mount": 0,
        "noclash": 0
      },
      {
        "t": "niche",
        "n": "Recessed niche",
        "x": 696,
        "y": 1052,
        "w": 400,
        "d": 100,
        "h": 600,
        "rot": 0,
        "mount": 1100,
        "noclash": 0
      },
      {
        "t": "rail",
        "n": "Towel rail",
        "x": 727,
        "y": 1099,
        "w": 600,
        "d": 110,
        "h": 900,
        "rot": 90,
        "mount": 900,
        "noclash": 0
      },
      {
        "t": "radrail",
        "n": "Heated rail",
        "x": 758,
        "y": 1146,
        "w": 500,
        "d": 120,
        "h": 1200,
        "rot": 180,
        "mount": 400,
        "noclash": 0
      },
      {
        "t": "hook",
        "n": "Towel hook",
        "x": 789,
        "y": 1193,
        "w": 120,
        "d": 80,
        "h": 80,
        "rot": 270,
        "mount": 1600,
        "noclash": 0
      },
      {
        "t": "planttall",
        "n": "Pot plant, tall",
        "x": 820,
        "y": 1240,
        "w": 400,
        "d": 400,
        "h": 1500,
        "rot": 0,
        "mount": 0,
        "noclash": 0
      },
      {
        "t": "plantshort",
        "n": "Pot plant, short",
        "x": 851,
        "y": 1287,
        "w": 300,
        "d": 300,
        "h": 600,
        "rot": 90,
        "mount": 0,
        "noclash": 0
      },
      {
        "t": "stool",
        "n": "Stool",
        "x": 882,
        "y": 1334,
        "w": 350,
        "d": 350,
        "h": 450,
        "rot": 180,
        "mount": 0,
        "noclash": 0
      },
      {
        "t": "basket",
        "n": "Laundry basket",
        "x": 913,
        "y": 1381,
        "w": 400,
        "d": 400,
        "h": 600,
        "rot": 270,
        "mount": 0,
        "noclash": 0
      },
      {
        "t": "bin",
        "n": "Bin",
        "x": 944,
        "y": 1428,
        "w": 250,
        "d": 250,
        "h": 400,
        "rot": 0,
        "mount": 0,
        "noclash": 0
      },
      {
        "t": "chute",
        "n": "Laundry chute",
        "x": 975,
        "y": 1475,
        "w": 400,
        "d": 200,
        "h": 400,
        "rot": 90,
        "mount": 900,
        "noclash": 0
      }
    ],
    "view": null
  }
];

let pass = 0, fail = 0;
async function t(name, fn){
  try{ await fn(); pass++; console.log(`  ok   ${name}`); }
  catch(e){ fail++; console.log(`  FAIL ${name}\n       ${e.message}`); }
}

console.log("\nlink compatibility — frozen payloads from live links\n");

for(const link of FROZEN_LINKS){
  await t(`still decodes: ${link.label}`, async () => {
    const snap = await decodeShare(link.payload);
    assert.equal(snap.name, link.name, "layout name changed");
    assert.equal(snap.items.length, link.items.length, "a fixture was gained or lost");
    for(let i = 0; i < link.items.length; i++)
      assert.deepStrictEqual(snap.items[i], link.items[i],
        `fixture ${i} (${link.items[i].t}) decodes differently than when the link was made`);
    assert.deepStrictEqual(snap.view ?? null, link.view ?? null, "camera changed");
  });
}

await t("no existing fixture type has been renamed or removed", () => {
  for(const t of Object.keys(FROZEN_DEFAULTS))
    assert.ok(DEF[t], `type "${t}" is gone — every link containing it loses that fixture, ` +
                      `because restore() filters unknown types`);
});

await t("no existing fixture's defaults have moved", () => {
  for(const [t, was] of Object.entries(FROZEN_DEFAULTS)){
    const now = DEF[t]; if(!now) continue;
    for(const k of ["n","w","d","h"])
      assert.equal(now[k], was[k],
        `${t}.${k} changed ${JSON.stringify(was[k])} -> ${JSON.stringify(now[k])}; ` +
        `links that omitted it because it matched the old default now decode to the new one`);
    assert.equal(now.mount||0, was.mount||0, `${t}.mount changed`);
  }
});

await t("new fixture types are additive, never a renumbering", () => {
  const added = CAT.flatMap(g=>g.items).map(i=>i.t).filter(t => !(t in FROZEN_DEFAULTS));
  console.log(`       ${added.length ? "added since capture: " + added.join(", ") : "nothing added since capture"}`);
  assert.ok(Object.keys(FROZEN_DEFAULTS).every(t => DEF[t]), "an old type went missing");
});

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
