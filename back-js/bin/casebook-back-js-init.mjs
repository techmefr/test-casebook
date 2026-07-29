#!/usr/bin/env node
import { existsSync, mkdirSync, copyFileSync, readdirSync, statSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const pkgRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const cwd = process.cwd();
const args = process.argv.slice(2);
const command = args[0] ?? null;
const force = args.includes("--force");

const DEFAULT_COVERAGE = 80;
const coverageArg = args.find((a) => a.startsWith("--coverage="));
let coverage = DEFAULT_COVERAGE;
if (coverageArg !== undefined) {
  const raw = coverageArg.slice("--coverage=".length);
  const n = Number(raw);
  if (!/^\d+$/.test(raw) || n < 1 || n > 100) {
    process.stderr.write(`casebook-back-js-init: --coverage must be an integer between 1 and 100 (got "${raw}").\n`);
    process.exit(1);
  }
  coverage = n;
}

const COVERAGE_THRESHOLD_FILES = ["AGENTS.md"];
const assets = ["AGENTS.md", "docs", ".claude"];

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...walk(full));
    } else {
      out.push(full);
    }
  }
  return out;
}

function copyAsset(name) {
  const src = join(pkgRoot, name);
  if (!existsSync(src)) {
    return { copied: [], skipped: [] };
  }
  const copied = [];
  const skipped = [];
  const files = statSync(src).isDirectory() ? walk(src) : [src];
  for (const file of files) {
    const rel = relative(pkgRoot, file);
    const dest = join(cwd, rel);
    if (existsSync(dest) && !force) {
      skipped.push(rel);
      continue;
    }
    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync(file, dest);
    copied.push(rel);
  }
  return { copied, skipped };
}

function applyCoverageThreshold(copied) {
  if (coverage === DEFAULT_COVERAGE) return;
  for (const rel of COVERAGE_THRESHOLD_FILES) {
    if (!copied.includes(rel)) continue;
    const path = join(cwd, rel);
    if (!existsSync(path)) continue;
    const content = readFileSync(path, "utf8");
    const updated = content.replace(/\b80\b/g, String(coverage));
    writeFileSync(path, updated);
  }
}

function usage() {
  console.log("test-casebook-back-js — testing methodology scaffolder\n");
  console.log("Usage:");
  console.log("  node bin/casebook-back-js-init.mjs init [--force] [--coverage=<1-100>]\n");
  console.log("  init             copy AGENTS.md, docs/ and .claude/ into the current project");
  console.log("  --force          overwrite files that already exist");
  console.log("  --coverage=<n>   set the coverage floor (default 80) in the scaffolded AGENTS.md");
  console.log("\nNote: this is a plain script, not yet an npm package with a bin wrapper — that's");
  console.log("a natural fast-follow once this repo is published. For now, run it directly from");
  console.log("a checkout of this repo, pointed at your target project's directory.");
}

function init() {
  let copied = [];
  let skipped = [];
  for (const asset of assets) {
    const result = copyAsset(asset);
    copied = copied.concat(result.copied);
    skipped = skipped.concat(result.skipped);
  }

  applyCoverageThreshold(copied);

  console.log(`\ntest-casebook-back-js — scaffolded into ${cwd}\n`);
  if (copied.length) {
    console.log(`Added ${copied.length} file(s):`);
    for (const file of copied) console.log(`  + ${file}`);
  }
  if (skipped.length) {
    console.log(`\nSkipped ${skipped.length} existing file(s) (use --force to overwrite):`);
    for (const file of skipped) console.log(`  = ${file}`);
  }
  if (coverage !== DEFAULT_COVERAGE) {
    console.log(`\nCoverage floor set to ${coverage}% (default is ${DEFAULT_COVERAGE}%).`);
  }
  console.log("\nNext steps:");
  console.log('  1. Open this project in Claude Code and invoke the "test-casebook-back-js" skill.');
  console.log("  2. Read AGENTS.md's \"Core vs optional\" table — it only applies NestJS/AdonisJS-specific");
  console.log("     mechanics if the project actually depends on that framework.");
}

if (command === "init") {
  init();
} else {
  usage();
}
