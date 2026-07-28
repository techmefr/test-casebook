# test-casebook

> A testing methodology and AI-agent playbook for exhaustive, strictly-typed, `data-test`-driven test suites.

`test-casebook` is the **doctrine** half of the testing workflow: the conventions, strategy, scenario guide, and the agent playbook (`AGENTS.md`) that an AI coding agent applies to a target project to produce complete, reliable tests.

It pairs with [`env-attr-cleaner`](https://github.com/techmefr/env-attr-cleaner) — the build-time tool that strips `data-test-*` attributes from production, on bundler-based JS stacks (Nuxt, Vue, React, Next.js, Svelte, Astro, Bun). The dependency is **one-way**: the methodology knows about the cleaner, the cleaner knows nothing about the methodology. Server-rendered stacks with no JS bundler (Laravel / Livewire / Blade / Folio) skip the cleaner entirely and go straight to the testing methodology — see `docs/testing-guide/laravel.md`.

## Supported stacks (auto-detected)

Hand this repo to an agent — Claude Code or otherwise — and tell it to use `test-casebook` for testing. `AGENTS.md` Step 1 reads the target project's `package.json` / `composer.json` and **auto-detects the stack**, no manual setup required:

| Stack | Auto-detected | Dedicated guide | Cleaner (Part A) |
|---|---|---|---|
| Nuxt | ✅ | [`docs/testing-guide/README.md`](docs/testing-guide/README.md) | ✅ `env-attr-cleaner` |
| React / Next.js | ✅ | [`docs/testing-guide/react.md`](docs/testing-guide/react.md) | ✅ `env-attr-cleaner` |
| Vue (no Nuxt) | ✅ | — (Nuxt guide's snippets adapt directly, see `AGENTS.md` Step 5's per-framework equivalents) | ✅ `env-attr-cleaner` |
| Svelte | ✅ | — (same, adapt from `AGENTS.md` Step 3/5) | ✅ `env-attr-cleaner` |
| Astro | ✅ | — (same; uses Astro's Container API, no extra DOM lib) | ✅ `env-attr-cleaner` |
| Bun (runtime build) | ✅ | — | ✅ `env-attr-cleaner-bun` |
| Laravel / Livewire / Blade / Folio | ✅ | [`docs/testing-guide/laravel.md`](docs/testing-guide/laravel.md) | N/A — no bundler, see the guide's Blade-directive alternative |
| **Angular** | ❌ **Not supported** — `env-attr-cleaner` cannot strip Angular templates; `AGENTS.md` Step 1 stops immediately on detecting `@angular/core` | — | ❌ |

So yes: **Astro, Svelte, React, Next.js, Vue, Nuxt, Laravel and Livewire are all covered automatically** the moment the agent reads `AGENTS.md` — the only stack excluded on purpose is Angular. Nuxt, React and Laravel additionally ship a full cookbook (`docs/testing-guide/*.md`) with copy-paste snippets; the other JS stacks follow the same playbook with the per-framework adaptations spelled out in `AGENTS.md` Steps 1, 3 and 5 (render API, coverage config, etc.) rather than their own dedicated file.

## What's inside

- **`AGENTS.md`** — the playbook. Handed to an AI coding agent, it drives: detect the stack, (optionally) wire the cleaner, plan every case in `task-test.md`, execute block by block with a reviewer, enforce strict typing and coverage, and verify. Includes the permission matrix for permission-gated units and the anti-mock-drift rules.
- **`.claude/skills/test-task/`** — *(project manager, upstream)* turns a story into a shared **`test-task.md`**: interviews to close gaps (permissions, gated capabilities, regression surface) and reads the real permission model, so the contract is complete before dev.
- **`.claude/skills/test-casebook/`** + **`.claude/agents/{test-writer,test-reviewer}`** — *(developer, downstream)* executes that contract on the code — plan per unit, write, review, verify.
- **`docs/strategy.md`** — why `data-test-*` over CSS / structural / text selectors.
- **`docs/conventions.md`** — naming rules for `data-test-id` / `data-test-class`.
- **`docs/testing-guide/`** — ready-to-use scenario snippets, one guide per stack: Nuxt + Vitest, React + Vitest, Laravel + Pest + Livewire.

## The flow

Story → **`test-task` skill** (PM) writes one `test-task.md` → given to the front **and** back developer → each runs the **`test-casebook` skill** on their side, deriving expected outcomes from that same `test-task.md`. One contract, two implementations; permission cases assert both layers, so a front/back divergence surfaces immediately.

## Core idea

Write dedicated `data-test-*` attributes for testing. The **same selectors** drive unit, integration and E2E tests, stay out of production (stripped by `env-attr-cleaner`, or by an equivalent environment-gated directive on server-rendered stacks), and stay stable across refactors because they're decoupled from style, structure and text.

The playbook's job is to make coverage **exhaustive instead of happy-path**: plan from reading the source, enumerate every case (props, branches, states, interactions, guards, permissions), and verify each one — not re-implement a few examples.

## How it's consumed

Three channels, **one source of truth** (this repo's `AGENTS.md` + docs), never re-authored per channel:

- **Claude Code skill + sub-agents** — `.claude/skills/test-casebook/` orchestrates the run; `.claude/agents/test-writer` and `.claude/agents/test-reviewer` execute and gate each block. Open the repo (or a project it's been scaffolded into) in Claude Code and invoke the `test-casebook` skill.
- **npx scaffolder** — `npx test-casebook init` drops `AGENTS.md`, `docs/` and `.claude/` (skill + agents) into any project (agent-agnostic). Use `--force` to overwrite existing files.
- **Docs** — the guides in `docs/`.

## Status

Pre-release (not yet published to npm). Usable today via the Claude Code skill, the scaffolder (`node bin/test-casebook.mjs init`), or by handing `AGENTS.md` to any agent; marketplace packaging is in progress.

## Contributing

**Contributions are very welcome — this doctrine only gets sharper by running into real projects, and every one of them surfaces something worth fixing or adding.** You don't need permission or a big change to send a PR: a one-line fix, a missing case, a new guide all count. If you're not sure whether something is worth raising, open the issue anyway — that's what it's for.

Ideas for where to start:

- **Write the cookbook your stack is missing.** Vue (no Nuxt), Svelte, Astro and Bun are auto-detected (`AGENTS.md` Step 1/3) but only follow the general playbook — Nuxt, React and Laravel are the only ones with a dedicated `docs/testing-guide/*.md` so far. If you've run the doctrine on one of these and worked out the framework-specific snippets, that guide is genuinely wanted — this is one of the highest-value contributions right now.
- **Fix a snippet or command that's drifted.** Every code example here should reflect the real API of the tool it names. `docs/testing-guide/laravel.md`'s E2E section already had one such fix (an invented `$this->visit()->fill()` API corrected against the real Pest v4 browser plugin docs) — if you spot the next one, a PR with the fix (or even just an issue flagging it) is exactly the kind of contribution that keeps this trustworthy.
- **Tell us where a rule doesn't fit.** If a Guardrail or a Step in `AGENTS.md` conflicts with something you can't avoid in a real codebase, open an issue about it — the doctrine should describe what actually works, not what sounds right on paper, and that only happens if people say when it doesn't.
- **Report scaffolder or hook bugs.** `bin/test-casebook.mjs` and `.claude/hooks/test-casebook-gate.mjs` are plain Node scripts — wrong file matched/missed, a flag that doesn't do what it says, anything — file it.
- **Share a worked example.** The Laravel guide's permission-matrix example (roles + a private article, run for real, 28/28 green) started as exactly this kind of contribution — if you've built something similar for another stack or scenario, it's worth adding.

No process beyond that: fork, branch, PR against `main`. Mention what you verified it against (a real running project beats reasoning from the docs) so reviewers can move fast — but don't let an imperfect PR stop you from opening it.

## License

MIT
