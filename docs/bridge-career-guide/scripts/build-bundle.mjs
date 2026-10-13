#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA = path.join(ROOT, "data");

function items(name) {
  const j = JSON.parse(fs.readFileSync(path.join(DATA, name), "utf8"));
  return j.items || j;
}

const bundle = {
  version: "2026-10-13",
  universities: items("universities.json"),
  programs: items("programs.json"),
  scholarships: items("scholarships.json"),
  documents: items("documents.json"),
  deadlines: items("deadlines.json"),
  cities: items("cities.json"),
  disciplines: items("disciplines.json"),
  support: JSON.parse(fs.readFileSync(path.join(DATA, "support.json"), "utf8")),
  fx: JSON.parse(fs.readFileSync(path.join(DATA, "fx-fallback.json"), "utf8")),
};

const out = path.join(ROOT, "catalog.bundle.json");
fs.writeFileSync(out, JSON.stringify(bundle));
console.log("wrote", out, "bytes", fs.statSync(out).size);
