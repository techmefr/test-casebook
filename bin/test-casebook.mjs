#!/usr/bin/env node
import { cpSync, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const pkgRoot = dirname(here);
const cwd = process.cwd();
const args = process.argv.slice(2);
const command = args[0];
const force = args.includes("--force");

const ASSETS = ["AGENTS.md", "docs", ".claude"];

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

function copyAsset(name) {
  const src = join(pkgRoot, name);
  if (!existsSync(src)) return { copied: [], skipped: [] };
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
    cpSync(file, dest);
    copied.push(rel);
  }
  return { copied, skipped };
}

function init() {
  const copied = [];
  const skipped = [];
  for (const asset of ASSETS) {
    const result = copyAsset(asset);
    copied.push(...result.copied);
    skipped.push(...result.skipped);
  }
  console.log(`\ntest-casebook — scaffolded into ${cwd}\n`);
  if (copied.length) {
    console.log(`Added ${copied.length} file(s):`);
    for (const file of copied) console.log(`  + ${file}`);
  }
  if (skipped.length) {
    console.log(
      `\nSkipped ${skipped.length} existing file(s) (use --force to overwrite):`,
    );
    for (const file of skipped) console.log(`  = ${file}`);
  }
  console.log(`\nNext steps:`);
  console.log(
    `  1. Open this project in Claude Code and invoke the "test-casebook" skill.`,
  );
  console.log(
    `  2. env-attr-cleaner (the cleaner) is OPTIONAL and never auto-installed.`,
  );
  console.log(
    `     To strip data-test-* from production builds, install it yourself:`,
  );
  console.log(
    `       npm i -D env-attr-cleaner   (or pnpm add -D / yarn add -D)`,
  );
  console.log(
    `     then wire it per the env-attr-cleaner repo's docs/frameworks.\n`,
  );
}

function usage() {
  console.log(`test-casebook — testing methodology scaffolder\n`);
  console.log(`Usage:`);
  console.log(`  npx test-casebook init [--force]\n`);
  console.log(
    `  init     copy AGENTS.md, docs/ and .claude/ into the current project`,
  );
  console.log(`  --force  overwrite files that already exist\n`);
}

if (command === "init") init();
else usage();
