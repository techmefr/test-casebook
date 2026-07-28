#!/usr/bin/env node
import {
  appendFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, sep } from "node:path";
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

function findGitRoot(from) {
  let dir = from;
  while (true) {
    if (existsSync(join(dir, ".git"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

const POINTER_MARKER = "test-casebook";

function pointerBody(doctrinePath) {
  return [
    "## Testing doctrine (test-casebook)",
    "",
    `Tests in this repository follow the test-casebook playbook: \`${doctrinePath}\`. Read it before writing or reviewing any test. Non-negotiables:`,
    "",
    "- writing or modifying tests ALWAYS goes through the `test-casebook` skill: it builds the `task-test.md` plan, delegates each block to the `test-writer` sub-agent, and gates it with `test-reviewer` — never write a test file directly outside that flow",
    "- select on `data-test-id` / `data-test-class` only — never CSS classes, tag structure, or visible text; add the hooks to the markup as you write the tests",
    "- plan first in `task-test.md`, one assertion-bearing test per enumerated case",
    "- isolated, deterministic tests: fresh seeded test store, mocked network, frozen time — never the app's real singleton store",
    "- strict typing, no `any`, no blind `as`",
    "- coverage floor 90%, enforced by thresholds — never lowered to pass",
    "",
  ].join("\n");
}

function ensurePointer(filePath, doctrinePath, results) {
  const rel = relative(cwd, filePath) || filePath;
  const body = pointerBody(doctrinePath);
  if (!existsSync(filePath)) {
    writeFileSync(filePath, body);
    results.copied.push(rel);
    return;
  }
  if (readFileSync(filePath, "utf8").includes(POINTER_MARKER)) {
    results.skipped.push(rel);
    return;
  }
  appendFileSync(filePath, `\n${body}`);
  results.copied.push(rel);
}

function ensureRootHook(gitRoot, results) {
  const hookRel = join(".claude", "hooks", "test-casebook-gate.mjs");
  const hookDest = join(gitRoot, hookRel);
  if (!existsSync(hookDest)) {
    mkdirSync(dirname(hookDest), { recursive: true });
    cpSync(join(pkgRoot, hookRel), hookDest);
    results.copied.push(relative(cwd, hookDest));
  }
  const settingsDest = join(gitRoot, ".claude", "settings.json");
  if (!existsSync(settingsDest)) {
    cpSync(join(pkgRoot, ".claude", "settings.json"), settingsDest);
    results.copied.push(relative(cwd, settingsDest));
    return;
  }
  if (!readFileSync(settingsDest, "utf8").includes("test-casebook-gate")) {
    console.log(
      `\nNote: ${relative(cwd, settingsDest)} already exists — add the PreToolUse hook yourself:`,
    );
    console.log(
      `  { "matcher": "Write|Edit|MultiEdit", "hooks": [{ "type": "command", "command": "node .claude/hooks/test-casebook-gate.mjs" }] }`,
    );
  }
}

function scaffoldRootPointers(results) {
  const gitRoot = findGitRoot(cwd);
  if (!gitRoot) return;
  const doctrineRel =
    relative(gitRoot, join(cwd, "AGENTS.md")).split(sep).join("/");
  ensurePointer(join(gitRoot, "CLAUDE.md"), doctrineRel, results);
  if (gitRoot !== cwd) {
    ensurePointer(join(gitRoot, "AGENTS.md"), doctrineRel, results);
    ensureRootHook(gitRoot, results);
  }
}

function init() {
  const copied = [];
  const skipped = [];
  for (const asset of ASSETS) {
    const result = copyAsset(asset);
    copied.push(...result.copied);
    skipped.push(...result.skipped);
  }
  scaffoldRootPointers({ copied, skipped });
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
