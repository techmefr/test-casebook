# test-casebook

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Stacks covered](https://img.shields.io/badge/stacks%20covered-7-brightgreen.svg)](#supported-stacks-auto-detected)
[![Status](https://img.shields.io/badge/status-pre--release-orange.svg)](#status)

**A playbook that stops an AI from writing happy-path-only tests for your frontend.**

Most "AI, write my tests" runs stop at a few green checks on the components that were easy to reach — permissions, edge cases, and refactor-fragile selectors left untested. `test-casebook` forces an agent to plan every case from the source *before* writing anything, drive tests through dedicated `data-test-*` attributes that stay stable across refactors, and enforce strict typing and a real coverage floor.

It's paired with [`env-attr-cleaner`](https://github.com/techmefr/env-attr-cleaner), which strips those `data-test-*` attributes from production builds — so the test hooks never ship. It's running in production today across 4 different Xefi business units, on both Vue/Nuxt and React codebases.

## Quickstart

```bash
npx test-casebook init --force

# then, in Claude Code, opened on your project:
# invoke the `test-casebook` skill
```

That drops `AGENTS.md`, `docs/`, and `.claude/` (skill + agents) into your project. `AGENTS.md` Step 1 reads `package.json`/`composer.json` and **auto-detects the stack** — no manual setup.

## Supported stacks (auto-detected)

| Stack | Auto-detected | Dedicated guide | Cleaner (Part A) |
|---|---|---|---|
| Nuxt | ✅ | [`docs/testing-guide/README.md`](docs/testing-guide/README.md) | ✅ `env-attr-cleaner` |
| React / Next.js | ✅ | [`docs/testing-guide/react.md`](docs/testing-guide/react.md) | ✅ `env-attr-cleaner` |
| Vue (no Nuxt) | ✅ | follows `AGENTS.md` Step 3/5's per-framework equivalents | ✅ `env-attr-cleaner` |
| Svelte | ✅ | same | ✅ `env-attr-cleaner` |
| Astro | ✅ | same — uses Astro's Container API | ✅ `env-attr-cleaner` |
| Bun (runtime build) | ✅ | — | ✅ `env-attr-cleaner-bun` |
| Laravel / Livewire / Blade / Folio | ✅ | [`docs/testing-guide/laravel.md`](docs/testing-guide/laravel.md) | N/A — Blade-directive alternative in the guide |
| **Angular** | ❌ **Not supported** — `env-attr-cleaner` can't strip Angular templates; `AGENTS.md` stops immediately on detecting `@angular/core` | — | ❌ |

Nuxt, React and Laravel additionally ship a full cookbook with copy-paste snippets; the other JS stacks follow the same playbook with adaptations spelled out directly in `AGENTS.md`.

<details>
<summary>What a run actually looks like (Laravel/Livewire worked example)</summary>

```
$ php artisan test
...
Tests:    28 passed (72 assertions)
Duration: 4.12s
```

Full walkthrough, including the permission-matrix (roles + a private article) it was run against, in [`docs/testing-guide/laravel.md`](docs/testing-guide/laravel.md).
</details>

## Get involved

**Contributions are very welcome — this doctrine only gets sharper by running into real projects.** No permission or big change needed: a one-line fix, a missing case, a new guide all count — see [`CONTRIBUTING.md`](CONTRIBUTING.md).

## Prior art

Stripping test attributes at build time isn't new — [`babel-plugin-jsx-remove-data-test-id`](https://www.npmjs.com/package/babel-plugin-jsx-remove-data-test-id) is the closest thing to a de facto standard (React/Babel only), and smaller Vite-plugin variants exist for Vue and Svelte individually. What `env-attr-cleaner` adds is breadth: one tool across Nuxt/Vue/React/Next.js/Svelte/Astro/Bun and Vite/Rollup/Webpack/esbuild, instead of picking a new plugin per framework/bundler pair.

## Core idea

Write dedicated `data-test-*` attributes for testing. The **same selectors** drive unit, integration and E2E tests, stay out of production, and stay stable across refactors because they're decoupled from style, structure and text.

The playbook's job is to make coverage **exhaustive instead of happy-path**: plan from reading the source, enumerate every case (props, branches, states, interactions, guards, permissions), and verify each one.

## What's inside

- **`AGENTS.md`** — the playbook: detect the stack, wire the cleaner if applicable, plan every case in `task-test.md`, execute block by block with a reviewer, enforce strict typing and coverage, verify. Includes the permission matrix and anti-mock-drift rules.
- **`.claude/skills/test-task/`** *(project manager, upstream)* — turns a story into a shared `test-task.md`: interviews to close gaps, reads the real permission model.
- **`.claude/skills/test-casebook/`** + **`.claude/agents/{test-writer,test-reviewer}`** *(developer, downstream)* — executes that contract: plan per unit, write, review, verify.
- **`docs/strategy.md`** — why `data-test-*` over CSS/structural/text selectors.
- **`docs/conventions.md`** — naming rules for `data-test-id`/`data-test-class`.
- **`docs/testing-guide/`** — ready-to-use scenario snippets, one guide per stack.

## The flow

Story → **`test-task` skill** (PM) writes one `test-task.md` → given to the front **and** back developer → each runs the **`test-casebook` skill** on their side, deriving expected outcomes from that same `test-task.md`. One contract, two implementations; permission cases assert both layers, so a front/back divergence surfaces immediately.

## How it's consumed

Three channels, one source of truth (this repo's `AGENTS.md` + docs):

- **Claude Code skill + sub-agents** — the primary path, shown in Quickstart.
- **npx scaffolder** — `npx test-casebook init [--force]`.
- **Docs directly** — the guides in `docs/`.

## Status

Pre-release (not yet published to npm). Usable today via the Claude Code skill, the scaffolder (`node bin/test-casebook.mjs init`), or by handing `AGENTS.md` to any agent; marketplace packaging is in progress.

## Same doctrine, other stacks

Same method — plan first, exhaustive not happy-path, permission matrix dense on refused cases, independent review gate, enforced coverage floor — ported to each ecosystem's own tooling:

- [`test-casebook-back-php`](https://github.com/techmefr/test-casebook-back-php) — PHP backends
- [`test-casebook-back-js`](https://github.com/techmefr/test-casebook-back-js) — Node/TypeScript backends

## License

MIT
