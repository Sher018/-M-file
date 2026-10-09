#!/usr/bin/env node
/**
 * Parse tuition hints from official university fee / admissions pages.
 * Writes docs/bridge-career-guide/fees-live.json for the SPA to merge at runtime.
 *
 * Only accepts amounts near tuition keywords + currency, and within a sane
 * band vs the catalog tuition in data-universities.js.
 *
 * Usage: node docs/bridge-career-guide/scripts/parse-tuition.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "fees-live.json");

const SOURCES = [
  {
    "id": "zju-gcm",
    "urls": [
      "https://zibs.zju.edu.cn"
    ]
  },
  {
    "id": "uibe",
    "urls": [
      "https://sie.uibe.edu.cn"
    ]
  },
  {
    "id": "bfsu",
    "urls": [
      "http://study.bfsu.edu.cn"
    ]
  },
  {
    "id": "sjtu",
    "urls": [
      "https://en.sjtu.edu.cn"
    ]
  },
  {
    "id": "fudan",
    "urls": [
      "https://iso.fudan.edu.cn"
    ]
  },
  {
    "id": "xjtu",
    "urls": [
      "http://sie.xjtu.edu.cn"
    ]
  },
  {
    "id": "tju",
    "urls": [
      "https://www.tju.edu.cn"
    ]
  },
  {
    "id": "bjtu",
    "urls": [
      "https://www.bjtu.edu.cn"
    ]
  },
  {
    "id": "hit",
    "urls": [
      "https://studyathit.hit.edu.cn"
    ]
  },
  {
    "id": "npu",
    "urls": [
      "https://studyat.nwpu.edu.cn"
    ]
  },
  {
    "id": "whut",
    "urls": [
      "https://english.whut.edu.cn"
    ]
  },
  {
    "id": "silc",
    "urls": [
      "https://shusilc.shu.edu.cn"
    ]
  },
  {
    "id": "bit",
    "urls": [
      "https://isc.bit.edu.cn"
    ]
  },
  {
    "id": "jsu",
    "urls": [
      "https://oec.ujs.edu.cn"
    ]
  },
  {
    "id": "zust",
    "urls": [
      "https://ies.zust.edu.cn"
    ]
  },
  {
    "id": "nbut",
    "urls": [
      "https://gjxy.nbut.edu.cn"
    ]
  },
  {
    "id": "xjtlu",
    "urls": [
      "https://www.xjtlu.edu.cn"
    ]
  },
  {
    "id": "unnc",
    "urls": [
      "https://www.nottingham.edu.cn"
    ]
  },
  {
    "id": "sdu",
    "urls": [
      "https://www.sdu.edu.cn"
    ]
  },
  {
    "id": "blcu",
    "urls": [
      "https://admission.blcu.edu.cn"
    ]
  },
  {
    "id": "tongji",
    "urls": [
      "https://study.tongji.edu.cn"
    ]
  },
  {
    "id": "hust",
    "urls": [
      "http://iso.hust.edu.cn"
    ]
  },
  {
    "id": "whu",
    "urls": [
      "https://admission.whu.edu.cn"
    ]
  },
  {
    "id": "scut",
    "urls": [
      "http://www2.scut.edu.cn/sse"
    ]
  },
  {
    "id": "pku",
    "urls": [
      "https://www.is.pku.edu.cn"
    ]
  },
  {
    "id": "tsinghua",
    "urls": [
      "https://international.join-tsinghua.edu.cn"
    ]
  },
  {
    "id": "nju",
    "urls": [
      "https://hwxy.nju.edu.cn"
    ]
  },
  {
    "id": "sysu",
    "urls": [
      "https://iso.sysu.edu.cn"
    ]
  },
  {
    "id": "buaa",
    "urls": [
      "https://is.buaa.edu.cn"
    ]
  },
  {
    "id": "bnu",
    "urls": [
      "https://admission-is.bnu.edu.cn"
    ]
  },
  {
    "id": "ecnu",
    "urls": [
      "https://lxs.ecnu.edu.cn"
    ]
  },
  {
    "id": "cufe",
    "urls": [
      "https://isie.cufe.edu.cn"
    ]
  },
  {
    "id": "suibe",
    "urls": [
      "https://www.suibe.edu.cn"
    ]
  },
  {
    "id": "cupl",
    "urls": [
      "https://www.cupl.edu.cn"
    ]
  },
  {
    "id": "bisu",
    "urls": [
      "https://www.bisu.edu.cn"
    ]
  },
  {
    "id": "seu",
    "urls": [
      "https://cis.seu.edu.cn"
    ]
  },
  {
    "id": "hust_med",
    "urls": [
      "http://iso.hust.edu.cn"
    ]
  },
  {
    "id": "cmu",
    "urls": [
      "https://www.cmu.edu.cn"
    ]
  },
  {
    "id": "jlu",
    "urls": [
      "https://cie.jlu.edu.cn"
    ]
  },
  {
    "id": "lzu",
    "urls": [
      "https://sice.lzu.edu.cn"
    ]
  },
  {
    "id": "ynu",
    "urls": [
      "https://www.ynu.edu.cn"
    ]
  },
  {
    "id": "xmu",
    "urls": [
      "https://admissions.xmu.edu.cn"
    ]
  },
  {
    "id": "hnu",
    "urls": [
      "https://www-en.hnu.edu.cn"
    ]
  },
  {
    "id": "nankai",
    "urls": [
      "https://study.nankai.edu.cn"
    ]
  },
  {
    "id": "ouc",
    "urls": [
      "https://sie.ouc.edu.cn"
    ]
  },
  {
    "id": "dufe",
    "urls": [
      "https://sie.dufe.edu.cn"
    ]
  },
  {
    "id": "shisu",
    "urls": [
      "https://www.oisa.shisu.edu.cn"
    ]
  },
  {
    "id": "ccnu",
    "urls": [
      "https://cice.ccnu.edu.cn"
    ]
  },
  {
    "id": "hzau",
    "urls": [
      "https://international.hzau.edu.cn"
    ]
  },
  {
    "id": "dgut",
    "urls": [
      "https://www.dgut.edu.cn"
    ]
  }
];

const UA =
  "Mozilla/5.0 (compatible; BRIDGE-FeeBot/1.1; +https://github.com/Sher018/-M-file; educational tuition research)";

function loadCatalogTuition() {
  const src = fs.readFileSync(path.join(ROOT, "data-universities.js"), "utf8");
  const sandbox = { window: {} };
  vm.runInNewContext(src, sandbox);
  const map = {};
  for (const u of sandbox.window.BRIDGE_UNIS || []) map[u.id] = u.tuitionYear;
  return map;
}

function stripTags(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");
}

function extractTuitionCny(text) {
  const amounts = [];
  // Require currency or 学费 near the number
  const patterns = [
    /(?:tuition|学费|academic\s*fee)[^.]{0,80}?((?:\d{1,3},)?\d{4,6})\s*(?:cny|rmb|yuan|元)?/gi,
    /((?:\d{1,3},)?\d{4,6})\s*(?:cny|rmb|yuan|元)(?:\s*\/\s*(?:year|学年|年))?/gi,
    /(?:cny|rmb|yuan|￥|¥)\s*((?:\d{1,3},)?\d{4,6})/gi,
  ];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(text))) {
      const n = Number(String(m[1]).replace(/,/g, ""));
      if (n >= 10000 && n <= 180000) amounts.push(n);
    }
  }
  if (!amounts.length) return null;
  const uniq = [...new Set(amounts)].sort((a, b) => a - b);
  const mid = uniq[Math.floor(uniq.length / 2)];
  return { tuitionYear: mid, candidates: uniq.slice(0, 12) };
}

function acceptVsCatalog(parsed, catalog) {
  if (!parsed || !catalog) return null;
  const ratio = parsed.tuitionYear / catalog;
  // Allow 0.45x–2.2x of known catalog value
  if (ratio < 0.45 || ratio > 2.2) return null;
  // Prefer candidate closest to catalog if several
  let best = parsed.tuitionYear;
  let bestDist = Math.abs(best - catalog);
  for (const c of parsed.candidates || []) {
    const r = c / catalog;
    if (r < 0.45 || r > 2.2) continue;
    const d = Math.abs(c - catalog);
    if (d < bestDist) {
      best = c;
      bestDist = d;
    }
  }
  return { ...parsed, tuitionYear: best };
}

async function fetchText(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 18000);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml" },
      redirect: "follow",
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(t);
  }
}

async function parseOne(src, catalogTuition) {
  const tried = [];
  for (const url of src.urls) {
    try {
      const html = await fetchText(url);
      const text = stripTags(html);
      const parsed = acceptVsCatalog(extractTuitionCny(text), catalogTuition[src.id]);
      tried.push({ url, ok: true, raw: extractTuitionCny(text), accepted: parsed });
      if (parsed) {
        return {
          id: src.id,
          tuitionYear: parsed.tuitionYear,
          candidates: parsed.candidates,
          catalogTuition: catalogTuition[src.id],
          sourceUrl: url,
          status: "ok",
          fetchedAt: new Date().toISOString(),
        };
      }
    } catch (e) {
      tried.push({ url, ok: false, error: String(e.message || e) });
    }
  }
  return {
    id: src.id,
    status: "unresolved",
    catalogTuition: catalogTuition[src.id],
    tried,
    fetchedAt: new Date().toISOString(),
  };
}

async function main() {
  const catalogTuition = loadCatalogTuition();
  const results = [];
  for (const src of SOURCES) {
    process.stderr.write(`Parsing ${src.id}...\n`);
    results.push(await parseOne(src, catalogTuition));
  }
  const payload = {
    updated: new Date().toISOString(),
    note: "Auto-parsed hints from public pages, validated vs catalog band. Always verify before payment.",
    ratesNote: "SPA converts CNY→USD/TJS via fx.js",
    fees: Object.fromEntries(
      results
        .filter((r) => r.status === "ok")
        .map((r) => [
          r.id,
          {
            tuitionYear: r.tuitionYear,
            sourceUrl: r.sourceUrl,
            fetchedAt: r.fetchedAt,
            candidates: r.candidates,
            catalogTuition: r.catalogTuition,
          },
        ])
    ),
    unresolved: results.filter((r) => r.status !== "ok"),
  };
  fs.writeFileSync(OUT, JSON.stringify(payload, null, 2));
  console.log(`Wrote ${OUT} (${Object.keys(payload.fees).length} resolved / ${results.length} total)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
