# Changelog

## 1.0.0

Initial public release.

- **`AGENTS.md`** — the test-casebook testing playbook: plan (`task-test.md`) → execute block by block → review gate → verify, with the persona matrix for permission-gated units and the anti-mock-drift rules.
- **Claude Code skills** — `test-task` (project manager: story → shared `test-task.md`) and `test-casebook` (developer: per-unit test execution), plus the `test-writer` / `test-reviewer` sub-agents.
- **`npx test-casebook init`** — scaffolds `AGENTS.md`, `docs/` and `.claude/` into any project.
- **Docs** — strategy, `data-test-*` conventions, testing guide.

Pairs with [`env-attr-cleaner`](https://github.com/techmefr/env-attr-cleaner) (one-way dependency).
