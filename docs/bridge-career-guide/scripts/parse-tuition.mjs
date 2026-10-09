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
    id: "zju-gcm",
    urls: [
      "https://zibs.zju.edu.cn/zibsenglish/admissions/undergraduate.htm",
      "https://zibs.zju.edu.cn",
    ],
  },
  { id: "uibe", urls: ["https://sie.uibe.edu.cn/en/Admission/Tuition_and_Fees.htm", "https://sie.uibe.edu.cn"] },
  { id: "bfsu", urls: ["http://study.bfsu.edu.cn/info/1107/1284.htm", "http://study.bfsu.edu.cn"] },
  { id: "sjtu", urls: ["https://isc.sjtu.edu.cn/EN/content.aspx?info_lb=280&flag=2", "https://isc.sjtu.edu.cn"] },
  { id: "fudan", urls: ["https://iso.fudan.edu.cn/isoenglish/wnglijkx/", "https://iso.fudan.edu.cn"] },
  { id: "xjtu", urls: ["http://sie.xjtu.edu.cn/en/Admissions1/Tuition_and_Fees.htm", "http://sie.xjtu.edu.cn"] },
  { id: "tju", urls: ["https://sie.tju.edu.cn/en/jxj/Tuition_Fees.htm", "https://sie.tju.edu.cn"] },
  { id: "bjtu", urls: ["https://is.bjtu.edu.cn"] },
  { id: "hit", urls: ["http://studyathit.hit.edu.cn/18266/list.htm", "http://studyathit.hit.edu.cn"] },
  { id: "nuaa", urls: ["https://ciee.nuaa.edu.cn"] },
  { id: "scut", urls: ["http://www2.scut.edu.cn/sse/1176/list.htm", "http://www2.scut.edu.cn/sse"] },
  { id: "hust", urls: ["http://iso.hust.edu.cn"] },
  { id: "whu", urls: ["https://admission.whu.edu.cn"] },
  { id: "tongji", urls: ["https://study.tongji.edu.cn"] },
  { id: "blcu", urls: ["https://admission.blcu.edu.cn"] },
  { id: "nbut", urls: ["https://gjxy.nbut.edu.cn"] },
  { id: "zust", urls: ["https://ies.zust.edu.cn"] },
  { id: "xjtlu", urls: ["https://www.xjtlu.edu.cn/en/admissions/undergraduate/fees", "https://www.xjtlu.edu.cn/en/admissions"] },
  { id: "unnc", urls: ["https://www.nottingham.edu.cn/en/study-with-us/undergraduate/fees.aspx", "https://www.nottingham.edu.cn/en/study-with-us"] },
  { id: "sdu", urls: ["https://www.istudy.sdu.edu.cn"] },
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
