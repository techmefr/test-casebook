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

- **Claude Code skill + sub-agents** — `.claude/skills/test-casebook/` orchestrates the run; `.claude/agents/test-writer` and `.claude/agents/test-reviewer` execute and gate each block. Open the repo (or a project it's been scaffolded into) in Claude Code and invoke the `test-casebook` skill.
- **npx scaffolder** — `npx test-casebook init` drops `AGENTS.md`, `docs/` and `.claude/` (skill + agents) into any project (agent-agnostic). Use `--force` to overwrite existing files.
- **Docs** — the guides in `docs/`.

## Status

Pre-release (not yet published to npm). Usable today via the Claude Code skill, the scaffolder (`node bin/test-casebook.mjs init`), or by handing `AGENTS.md` to any agent; marketplace packaging is in progress.

## License

MIT
