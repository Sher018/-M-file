#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA = path.join(ROOT, "data");
const offline = process.argv.includes("--offline");
let errors = 0;
let warnings = 0;

function fail(msg) {
  console.error("ERROR", msg);
  errors += 1;
}
function warn(msg) {
  console.warn("WARN", msg);
  warnings += 1;
}

function load(name) {
  const p = path.join(DATA, name);
  if (!fs.existsSync(p)) {
    fail(`missing ${name}`);
    return { items: [] };
  }
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function needSource(item, coll) {
  if (!item.source_url || !/^https:\/\//i.test(item.source_url)) {
    fail(`${coll}:${item.id} missing https source_url`);
  }
  if (!item.checked_at || !/^\d{4}-\d{2}-\d{2}$/.test(item.checked_at)) {
    fail(`${coll}:${item.id} missing checked_at`);
  } else {
    const age = (Date.now() - Date.parse(item.checked_at)) / 86400000;
    if (age > 540) fail(`${coll}:${item.id} checked_at older than 540 days`);
    else if (age > 365) warn(`${coll}:${item.id} checked_at older than 365 days`);
  }
  if (item.name && typeof item.name === "object" && !item.name.ru) warn(`${coll}:${item.id} missing name.ru`);
}

const unis = load("universities.json").items || [];
const programs = load("programs.json").items || [];
const scholarships = load("scholarships.json").items || [];
const documents = load("documents.json").items || [];
const deadlines = load("deadlines.json").items || [];
const cities = load("cities.json").items || [];

const ids = {
  universities: new Set(unis.map((x) => x.id)),
  programs: new Set(programs.map((x) => x.id)),
  scholarships: new Set(scholarships.map((x) => x.id)),
  documents: new Set(documents.map((x) => x.id)),
  deadlines: new Set(deadlines.map((x) => x.id)),
  cities: new Set(cities.map((x) => x.id)),
};

function unique(list, coll) {
  const s = new Set();
  for (const x of list) {
    if (s.has(x.id)) fail(`${coll} duplicate id ${x.id}`);
    s.add(x.id);
  }
}

unique(unis, "universities");
unique(programs, "programs");
unique(scholarships, "scholarships");
unique(documents, "documents");
unique(deadlines, "deadlines");
unique(cities, "cities");

unis.forEach((u) => {
  needSource(u, "universities");
  if (!ids.cities.has(u.city_id)) fail(`uni ${u.id} bad city_id ${u.city_id}`);
  (u.program_ids || []).forEach((id) => {
    if (!ids.programs.has(id)) fail(`uni ${u.id} missing program ${id}`);
  });
  (u.scholarship_ids || []).forEach((id) => {
    if (!ids.scholarships.has(id)) fail(`uni ${u.id} missing scholarship ${id}`);
  });
  (u.document_ids || []).forEach((id) => {
    if (!ids.documents.has(id)) fail(`uni ${u.id} missing document ${id}`);
  });
  (u.deadline_ids || []).forEach((id) => {
    if (!ids.deadlines.has(id)) fail(`uni ${u.id} missing deadline ${id}`);
  });
});
programs.forEach((p) => {
  needSource(p, "programs");
  if (!ids.universities.has(p.uni_id)) fail(`program ${p.id} bad uni_id`);
});
scholarships.forEach((s) => needSource(s, "scholarships"));
documents.forEach((d) => needSource(d, "documents"));
deadlines.forEach((d) => needSource(d, "deadlines"));
cities.forEach((c) => needSource(c, "cities"));

if (!offline) {
  warn("online HEAD checks skipped unless implemented; use --offline in CI for now");
}

console.log(`validate: ${errors} errors, ${warnings} warnings, ${unis.length} unis, ${programs.length} programs`);
if (errors) process.exit(1);
