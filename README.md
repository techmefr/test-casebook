# test-casebook

> A testing methodology and AI-agent playbook for exhaustive, strictly-typed, `data-test`-driven test suites.

`test-casebook` is the **doctrine** half of the testing workflow: the conventions, strategy, scenario guide, and the agent playbook (`AGENTS.md`) that an AI coding agent applies to a target project to produce complete, reliable tests.

It pairs with [`env-attr-cleaner`](https://github.com/techmefr/env-attr-cleaner) — the build-time tool that strips `data-test-*` attributes from production. The dependency is **one-way**: the methodology knows about the cleaner, the cleaner knows nothing about the methodology.

## What's inside

- **`AGENTS.md`** — the playbook. Handed to an AI coding agent, it drives: detect the stack, (optionally) wire the cleaner, plan every case in `task-test.md`, execute block by block with a reviewer, enforce strict typing and coverage, and verify. Includes the persona matrix for permission-gated units and the anti-mock-drift rules.
- **`docs/strategy.md`** — why `data-test-*` over CSS / structural / text selectors.
- **`docs/conventions.md`** — naming rules for `data-test-id` / `data-test-class`.
- **`docs/testing-guide/`** — ready-to-use scenario snippets.

## Core idea

Write dedicated `data-test-*` attributes for testing. The **same selectors** drive unit, integration and E2E tests, never reach production (stripped by `env-attr-cleaner`), and stay stable across refactors because they're decoupled from style, structure and text.

The playbook's job is to make coverage **exhaustive instead of happy-path**: plan from reading the source, enumerate every case (props, branches, states, interactions, guards, permissions), and verify each one — not re-implement a few examples.

## How it's consumed

Three channels, **one source of truth** (this repo's `AGENTS.md` + docs), never re-authored per channel:

- **npx scaffolder** — `npx test-casebook init` drops the playbook + config into any project (agent-agnostic). *Planned.*
- **Claude Code plugin** — the skill + sub-agents (writer / reviewer). *Planned.*
- **Docs** — the guides in `docs/`.

## Status

Pre-release. The playbook and docs are usable today by handing `AGENTS.md` to an agent; the scaffolder and plugin are in progress.

## License

MIT
