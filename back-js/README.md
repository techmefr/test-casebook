# test-casebook-back-js

> A testing methodology and AI-agent playbook for Node/TypeScript backends — exhaustive, strictly-typed, persona-matrix-driven test suites.

`test-casebook-back-js` is the **JS/TS backend counterpart** of [`test-casebook`](https://github.com/techmefr/test-casebook) (frontend) and [`test-casebook-back`](https://github.com/techmefr/test-casebook-back) (PHP backend). Same method — plan first, exhaustive not happy-path, isolated and deterministic, permission matrix dense on refused cells, independent review gate, enforced coverage floor — ported to a Node backend. It lives in its **own repo**: it shares npm/TypeScript with the frontend repo but none of its testing philosophy (no components, no accessibility, no browser), and it shares the persona-matrix/permission-gated-unit philosophy with the PHP-back repo but none of its tooling (npm vs Composer, Jest/Vitest vs PHPUnit/Pest, `tsc`/ESLint vs Larastan/PHPStan) — see [`docs/strategy.md`](docs/strategy.md) for the full reasoning.

## Core vs optional — this is not a NestJS-only doctrine

The **core** (`AGENTS.md` Steps 1–6) applies to **any Node/TS backend** — plain Express, no assumptions about which framework you run. A few things are detected and applied **only if present** in the target project's `package.json`:

| Detected via `package.json` | If present | If absent |
|---|---|---|
| `@nestjs/core` | Use Nest Guards/decorators/DI conventions | Adapt to the project's own framework (Adonis Bouncer, bespoke Express middleware) |
| `@adonisjs/core` | Use Adonis Bouncer policies | N/A |
| `vitest` | Use Vitest | Default: Jest (Nest's own CLI default) |
| `strict` in `tsconfig.json` | Already the definition-of-done bar | Turn it on — part of Step 3, not optional |
| An ORM (`typeorm`, `@prisma/client`, `drizzle-orm`) | Seed personas through its repository API | Adapt to whatever the project actually uses (raw driver, in-memory store) |

**Not every Node backend runs NestJS or an ORM.** Those are real and valuable, but this doctrine is written so a plain Express + Jest project gets the full core method without being handed instructions for packages it doesn't have.

## What's inside

- **`AGENTS.md`** — the playbook. Detect the stack, confirm the runner, enable TypeScript strict + ESLint, write tests plan-first with a persona matrix for every gated unit, verify.
- **`.claude/skills/test-casebook-back-js/`** + **`.claude/agents/{test-writer-back-js,test-reviewer-back-js}`** — orchestrates the plan → write → review → commit flow.
- **`.claude/hooks/test-casebook-back-js-gate.mjs`** — a Claude Code `PreToolUse` hook that blocks writing to a `*.spec.ts`/`*.e2e-spec.ts` file until a `task-test.md` plan exists above it. Verified for real against the accumulated NestJS demo: blocks a new test file with no plan (exit 2), allows it once one exists (exit 0), no-ops on non-test files.
- **`docs/strategy.md`** — why this doctrine, and why it's a third sibling repo rather than folding into either of the other two.
- **`docs/conventions.md`** — test naming, the `task-test.md` shape, persona naming.
- **`docs/testing-guide/nestjs.md`** — the first real worked example: a NestJS Article API (roles, a private article, scheduled publishing, comments + notification), run for real: 40/40 tests green (9 unit + 31 e2e), `tsc --noEmit` clean under `strict: true`, ESLint clean, 98.84% line coverage — well above the 80% floor. Found two genuine, non-obvious things: a fresh Nest CLI scaffold ships `strict: false` by default, and advancing a fake clock forward in an isolation test silently expires any JWT minted before the jump (a hazard the PHP-back doctrine's `actingAs()`-based tests never had, since that helper doesn't mint an expiring credential).
- **`bin/casebook-back-js-init.mjs`** — scaffolder: copies `AGENTS.md`, `docs/` and `.claude/` into a target project, with a `--coverage=<1-100>` flag. Tested for real: default copy, skip-existing (without `--force`), `--coverage=90` applied cleanly, an out-of-range value rejected with exit code 1.

## How it's consumed

- **Claude Code skill + sub-agents** — open the target project in Claude Code (with this repo scaffolded into it) and invoke the `test-casebook-back-js` skill.
- **Scaffolder** — `node bin/casebook-back-js-init.mjs init [--force] [--coverage=<n>]`, run from a checkout of this repo, targeting your project's working directory as `cwd`.
- **Docs** — hand `AGENTS.md` (and `docs/testing-guide/nestjs.md` if relevant) to any agent directly.

No installable npm package yet (no `npx casebook-back-js init` wrapper) — a natural fast-follow once this repo has seen real use.

## Status

First real worked example (NestJS) run end-to-end in Docker-free Node 18 (no Docker needed here, unlike the PHP-back doctrine which had no native PHP available on its build host): 40/40 tests green, `tsc --noEmit`/ESLint clean, 98.84% line coverage. AdonisJS and Express worked examples are the natural next passes, following the same "real project, real Docker-or-native run, honestly-scoped findings" discipline as this one and the PHP-back repo's own three-stage verification.

## Contributing

Same spirit as the other two repos: contributions are welcome, no permission needed. If a rule here doesn't match your project's reality, or you've built something similar for a different Node framework, open an issue or a PR — verify against the real tool before proposing a fix, don't guess.

## License

MIT
