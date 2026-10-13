#!/usr/bin/env node
/**
 * One-shot: data-universities.js → data/universities.json + programs.json + cities.json
 * Does not invent tuition/deadlines. Institutional tier from public MoE C9/985/211 lists.
 */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "data");
const CHECKED = "2026-10-13";

const C9 = new Set(["pku", "tsinghua", "fudan", "sjtu", "zju-gcm", "nju", "hit", "xjtu"]);
const P985 = new Set([
  ...C9,
  "tju", "bit", "hust", "whu", "scut", "sysu", "buaa", "bnu", "ecnu", "seu",
  "jlu", "lzu", "xmu", "hnu", "nankai", "sdu", "tongji",
]);
const P211 = new Set([
  ...P985,
  "uibe", "bfsu", "bjtu", "npu", "whut", "blcu", "cufe", "cupl", "shisu",
  "ccnu", "hzau", "cmu", "ynu", "ouc", "hust_med",
]);
const SINO = new Set(["xjtlu", "unnc", "silc"]);

function institutionalTier(id) {
  if (C9.has(id)) return "c9";
  if (P985.has(id)) return "985";
  if (P211.has(id)) return "211";
  if (SINO.has(id)) return "sino_foreign";
  return "provincial";
}

const CITY_COORDS = {
  beijing: { lat: 39.9042, lng: 116.4074, province: { ru: "Пекин", en: "Beijing", tg: "Пекин" } },
  shanghai: { lat: 31.2304, lng: 121.4737, province: { ru: "Шанхай", en: "Shanghai", tg: "Шанхай" } },
  hangzhou: { lat: 30.2741, lng: 120.1551, province: { ru: "Чжэцзян", en: "Zhejiang", tg: "Чжэцзян" } },
  haining: { lat: 30.5102, lng: 120.4158, province: { ru: "Чжэцзян", en: "Zhejiang", tg: "Чжэцзян" } },
  xian: { lat: 34.3416, lng: 108.9398, province: { ru: "Шэньси", en: "Shaanxi", tg: "Шэнси" } },
  tianjin: { lat: 39.3434, lng: 117.3616, province: { ru: "Тяньцзинь", en: "Tianjin", tg: "Тянҷин" } },
  harbin: { lat: 45.8038, lng: 126.534, province: { ru: "Хэйлунцзян", en: "Heilongjiang", tg: "Ҳэйлунҷзян" } },
  wuhan: { lat: 30.5928, lng: 114.3055, province: { ru: "Хубэй", en: "Hubei", tg: "Ҳубэй" } },
  zhenjiang: { lat: 32.1878, lng: 119.425, province: { ru: "Цзянсу", en: "Jiangsu", tg: "Ҷзянсу" } },
  ningbo: { lat: 29.8683, lng: 121.544, province: { ru: "Чжэцзян", en: "Zhejiang", tg: "Чжэцзян" } },
  suzhou: { lat: 31.2989, lng: 120.5853, province: { ru: "Цзянсу", en: "Jiangsu", tg: "Ҷзянсу" } },
  jinan: { lat: 36.6512, lng: 117.1201, province: { ru: "Шаньдун", en: "Shandong", tg: "Шандун" } },
  qingdao: { lat: 36.0671, lng: 120.3826, province: { ru: "Шаньдун", en: "Shandong", tg: "Шандун" } },
  guangzhou: { lat: 23.1291, lng: 113.2644, province: { ru: "Гуандун", en: "Guangdong", tg: "Гуандун" } },
  nanjing: { lat: 32.0603, lng: 118.7969, province: { ru: "Цзянсу", en: "Jiangsu", tg: "Ҷзянсу" } },
  shenyang: { lat: 41.8057, lng: 123.4315, province: { ru: "Ляонин", en: "Liaoning", tg: "Ляонин" } },
  changchun: { lat: 43.8171, lng: 125.3235, province: { ru: "Гирин", en: "Jilin", tg: "Ҷилин" } },
  lanzhou: { lat: 36.0611, lng: 103.8343, province: { ru: "Ганьсу", en: "Gansu", tg: "Гансу" } },
  kunming: { lat: 25.0389, lng: 102.7183, province: { ru: "Юньнань", en: "Yunnan", tg: "Юннан" } },
  xiamen: { lat: 24.4798, lng: 118.0894, province: { ru: "Фуцзянь", en: "Fujian", tg: "Фуҷзян" } },
  changsha: { lat: 28.2282, lng: 112.9388, province: { ru: "Хунань", en: "Hunan", tg: "Ҳунан" } },
  dalian: { lat: 38.914, lng: 121.6147, province: { ru: "Ляонин", en: "Liaoning", tg: "Ляонин" } },
  dongguan: { lat: 23.0207, lng: 113.7518, province: { ru: "Гуандун", en: "Guangdong", tg: "Гуандун" } },
};

function cityIdFrom(cityEn) {
  const s = String(cityEn || "").toLowerCase();
  if (s.includes("haining")) return "haining";
  if (s.includes("hangzhou")) return "hangzhou";
  if (s.includes("beijing")) return "beijing";
  if (s.includes("shanghai")) return "shanghai";
  if (s.includes("xi")) return "xian";
  if (s.includes("tianjin")) return "tianjin";
  if (s.includes("harbin")) return "harbin";
  if (s.includes("wuhan")) return "wuhan";
  if (s.includes("zhenjiang")) return "zhenjiang";
  if (s.includes("ningbo")) return "ningbo";
  if (s.includes("suzhou")) return "suzhou";
  if (s.includes("jinan")) return "jinan";
  if (s.includes("qingdao")) return "qingdao";
  if (s.includes("guangzhou")) return "guangzhou";
  if (s.includes("nanjing")) return "nanjing";
  if (s.includes("shenyang")) return "shenyang";
  if (s.includes("changchun")) return "changchun";
  if (s.includes("lanzhou")) return "lanzhou";
  if (s.includes("kunming")) return "kunming";
  if (s.includes("xiamen")) return "xiamen";
  if (s.includes("changsha")) return "changsha";
  if (s.includes("dalian")) return "dalian";
  if (s.includes("dongguan")) return "dongguan";
  return "beijing";
}

function slug(s) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

function detectDegree(text) {
  const s = String(text || "").toLowerCase();
  if (/\b(mba|master|msc|ma\b|graduate|postgrad)/.test(s)) return "master";
  if (/\b(phd|doctoral|doctor)/.test(s)) return "phd";
  if (/\b(language|hsk|chinese teaching|preparatory)/.test(s) && !/bachelor|mbbs|bba|ba\b/.test(s))
    return "language";
  return "bachelor";
}

function detectDiscipline(text, clusters) {
  const s = String(text || "").toLowerCase();
  if (/mbbs|medic|pharma|health/.test(s) || clusters.includes("medicine")) return "medicine";
  if (/law|legal/.test(s) || clusters.includes("law")) return "law";
  if (/computer|software|ai\b|cs\b|data/.test(s) || clusters.includes("it")) return "cs";
  if (/engine|civil|mechanical|electrical|automation|aerospace/.test(s) || clusters.includes("engineering"))
    return "engineering";
  if (/financ|account/.test(s) || clusters.includes("finance")) return "finance";
  if (/media|journal|communicat/.test(s) || clusters.includes("media")) return "media";
  if (/design|architect/.test(s) || clusters.includes("design")) return "design";
  if (/touris|hospital|hotel/.test(s) || clusters.includes("hospitality")) return "hospitality";
  if (/logistic|transport/.test(s) || clusters.includes("logistics")) return "logistics";
  if (/educat|teach/.test(s) || clusters.includes("education")) return "education";
  if (/diplomat|relation/.test(s) || clusters.includes("international_relations")) return "international";
  if (/business|management|trade|marketing|bba|econom/.test(s) || clusters.includes("business")) return "business";
  return "other";
}

function duration(degree, text) {
  if (/mbbs/.test(String(text).toLowerCase())) return 6;
  if (degree === "language") return 1;
  if (degree === "master") return 2;
  if (degree === "phd") return 3;
  return 4;
}

function httpsify(url) {
  if (!url) return null;
  const s = String(url).trim();
  if (/^https:\/\//i.test(s)) return s;
  if (/^http:\/\//i.test(s)) return s.replace(/^http:\/\//i, "https://");
  return null;
}

function sourceUrl(u) {
  return httpsify(u.portal) || httpsify(u.apply) || "https://www.campuschina.org";
}

function loadUnis() {
  const src = fs.readFileSync(path.join(ROOT, "data-universities.js"), "utf8");
  const sandbox = { window: {} };
  vm.runInNewContext(src, sandbox, { filename: "data-universities.js" });
  return sandbox.window.BRIDGE_UNIS;
}

function loadDocs() {
  const src = fs.readFileSync(path.join(ROOT, "documents-catalog.js"), "utf8");
  const sandbox = { window: {} };
  vm.runInNewContext(src, sandbox, { filename: "documents-catalog.js" });
  return sandbox.window.BRIDGE_DOCS;
}

function mapDocIds(list, docs) {
  const ids = [];
  for (const raw of list || []) {
    const lower = String(raw).toLowerCase();
    let hit = null;
    for (const [id, meta] of Object.entries(docs)) {
      if ((meta.aliases || []).some((a) => a.toLowerCase() === lower)) {
        hit = id;
        break;
      }
    }
    if (!hit) {
      if (lower.includes("passport")) hit = "passport";
      else if (lower.includes("csca")) hit = "csca";
      else if (lower.includes("ielts") || lower.includes("toefl") || lower.includes("english")) hit = "english_score";
      else if (lower.startsWith("ps") || lower.includes("personal")) hit = "personal_statement";
      else if (lower.includes("recommend")) hit = "recommendations";
      else if (lower.includes("criminal")) hit = "no_criminal";
      else if (lower.includes("financial")) hit = "financial_proof";
      else if (lower.includes("guardian")) hit = "guardian_docs";
      else if (lower.includes("guarantor")) hit = "guarantor_id";
      else if (lower.includes("health") || lower.includes("physical")) hit = "health_form";
      else if (lower.includes("diploma") || lower.includes("transcript") || lower.includes("certificate"))
        hit = "diploma_transcript";
      else if (lower.includes("photo")) hit = "photo";
      else if (lower.includes("application")) hit = "application_form";
      else if (lower.includes("selfie")) hit = "selfie_video";
    }
    if (hit && !ids.includes(hit)) ids.push(hit);
  }
  return ids;
}

const unisIn = loadUnis();
const docsIn = loadDocs();

const citiesMap = {};
const universities = [];
const programs = [];

for (const u of unisIn) {
  const cid = cityIdFrom(u.city?.en);
  if (!citiesMap[cid]) {
    const meta = CITY_COORDS[cid];
    citiesMap[cid] = {
      id: cid,
      name: {
        ru: u.city?.ru?.split("/")[0].trim() || cid,
        en: u.city?.en?.split("/")[0].trim() || cid,
        tg: u.city?.tg?.split("/")[0].trim() || cid,
      },
      province: meta.province,
      lat: meta.lat,
      lng: meta.lng,
      population: null,
      cost_of_living_month: null,
      climate: null,
      airport: null,
      source_url: "https://en.wikipedia.org/wiki/" + encodeURIComponent(cid),
      checked_at: CHECKED,
    };
    // Wikipedia is not an official uni source; coordinates are public geographic facts.
    // Point city pages at GeoNames as a stable gazetteer.
    citiesMap[cid].source_url = `https://www.geonames.org/search.html?q=${encodeURIComponent(cid)}&country=CN`;
  }

  const mentionsCsc = /csc/i.test(u.quota?.type || "");
  const scholarship_ids = mentionsCsc ? ["csc-bilateral", "csc-university"] : [];
  const document_ids = mapDocIds(u.documents, docsIn);
  const deadline_ids = mentionsCsc ? ["csc-bilateral-tj-2026", "csc-bilateral-ru-2026"] : [];

  const labels = (u.englishPrograms || []).filter(Boolean);
  const fallback = (u.majors || []).slice(0, 3);
  const progLabels = labels.length ? labels.slice(0, 10) : fallback;
  const program_ids = [];
  progLabels.forEach((label, i) => {
    const pid = `${u.id}-${slug(label) || "p" + i}`;
    const degree = detectDegree(label);
    const discipline = detectDiscipline(label, u.clusters || []);
    program_ids.push(pid);
    programs.push({
      id: pid,
      uni_id: u.id,
      name: { ru: label, en: label, tg: label },
      degree,
      language: "en",
      discipline,
      cluster_ids: u.clusters || [],
      duration_years: duration(degree, label),
      tuition_year: i === 0 ? u.tuitionYear ?? null : u.tuitionYear ?? null,
      intake: "september",
      deadline_id: null,
      requirements: {
        english: u.englishReq || null,
        hsk: null,
        exams: u.csca?.length ? ["CSCA"] : [],
      },
      scholarship_ids,
      apply_url: u.apply || u.portal || null,
      source_url: sourceUrl(u),
      checked_at: CHECKED,
    });
  });

  const qs = Number(String(u.rankWorld || "").replace(/[^\d]/g, ""));
  universities.push({
    id: u.id,
    name: u.name,
    short: (u.name?.en || u.id).split("(")[0].trim().split(" ").map((w) => w[0]).join("").slice(0, 8).toUpperCase() || u.id,
    city_id: cid,
    tier: institutionalTier(u.id),
    match_tier: u.tier,
    founded: null,
    rank_qs: Number.isFinite(qs) && qs > 0 && qs < 2000 ? qs : null,
    rank_arwu: null,
    students_total: null,
    students_intl: null,
    quota_intl: null,
    intakes: ["september"],
    application_fee: u.applicationFee ?? null,
    dorm:
      u.dormYear != null
        ? { types: [], price_min: u.dormYear, price_max: u.dormYear, included: [] }
        : null,
    insurance: u.insuranceYear ?? null,
    requirements: {
      age_min: null,
      age_max: null,
      english: u.englishReq || null,
      hsk: null,
      csca: Boolean(u.csca?.length),
      diploma: null,
    },
    photos: [],
    links: {
      official: httpsify(u.portal) || sourceUrl(u),
      admission: httpsify(u.apply) || httpsify(u.portal) || sourceUrl(u),
      apply: httpsify(u.apply),
      campus_map: null,
      video: null,
    },
    program_ids,
    scholarship_ids,
    document_ids,
    deadline_ids,
    cluster_ids: u.clusters || [],
    csc_agency_no: null,
    blurb: u.blurb,
    source_url: sourceUrl(u),
    source_note: u.sourceNote || null,
    checked_at: CHECKED,
  });
}

fs.mkdirSync(OUT, { recursive: true });
function dump(name, items) {
  const file = path.join(OUT, name);
  fs.writeFileSync(file, JSON.stringify({ version: CHECKED, items }, null, 2) + "\n");
  console.log(name, items.length);
}

dump("universities.json", universities);
dump("programs.json", programs);
dump("cities.json", Object.values(citiesMap));
