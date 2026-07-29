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
| `@japa/runner` | Use Japa — AdonisJS's real test runner, not Jest/Vitest | N/A |
| `@trpc/server` | Drive permission-gated procedures through a real HTTP round-trip (`@trpc/client`), not `createCaller` alone | N/A |
| `@apollo/server`/`graphql` | Two validation layers (schema-level + business-rule); assert on `errors[].extensions.code`, not HTTP status | N/A |
| `fastify` | Default error handler reads a thrown Error's `.statusCode`; `app.inject()` is not immune to the fake-timers hazard despite avoiding a real socket | N/A |
| `@hapi/hapi` | Auth is a first-class scheme/strategy, not a hook; validate via Joi as a route option; don't install `@types/hapi__hapi`, it ships its own types now | N/A |
| `koa` | No built-in router/body-parser/auth; `ctx.throw()`'s `never` type only narrows control flow if the callback's `ctx` param is explicitly typed; test via `supertest` against `app.callback()` | N/A |
| `strict` in `tsconfig.json` | Already the definition-of-done bar | Turn it on — part of Step 3, not optional |
| An ORM (`typeorm`, `@prisma/client`, `drizzle-orm`) | Seed personas through its repository API | Adapt to whatever the project actually uses (raw driver, in-memory store) — and if a native-dependency DB library misbehaves in the execution environment, an in-memory store is a legitimate fallback, not a downgrade |

**Not every Node backend runs NestJS or an ORM.** Those are real and valuable, but this doctrine is written so a plain Express + Jest project gets the full core method without being handed instructions for packages it doesn't have.

## What's inside

- **`AGENTS.md`** — the playbook. Detect the stack, confirm the runner, enable TypeScript strict + ESLint, write tests plan-first with a persona matrix for every gated unit, verify.
- **`.claude/skills/test-casebook-back-js/`** + **`.claude/agents/{test-writer-back-js,test-reviewer-back-js}`** — orchestrates the plan → write → review → commit flow.
- **`.claude/hooks/test-casebook-back-js-gate.mjs`** — a Claude Code `PreToolUse` hook that blocks writing to a `*.spec.ts`/`*.e2e-spec.ts` file until a `task-test.md` plan exists above it. Verified for real against the accumulated NestJS demo: blocks a new test file with no plan (exit 2), allows it once one exists (exit 0), no-ops on non-test files.
- **`docs/strategy.md`** — why this doctrine, and why it's a third sibling repo rather than folding into either of the other two.
- **`docs/conventions.md`** — test naming, the `task-test.md` shape, persona naming.
- **`docs/testing-guide/nestjs.md`** — the first real worked example: a NestJS Article API (roles, a private article, scheduled publishing, comments + notification), run for real: 40/40 tests green (9 unit + 31 e2e), `tsc --noEmit` clean under `strict: true`, ESLint clean, 98.84% line coverage — well above the 80% floor. Found two genuine, non-obvious things: a fresh Nest CLI scaffold ships `strict: false` by default, and advancing a fake clock forward in an isolation test silently expires any JWT minted before the jump (a hazard the PHP-back doctrine's `actingAs()`-based tests never had, since that helper doesn't mint an expiring credential).
- **`docs/testing-guide/adonisjs.md`** — the second worked example, same scenario ported to AdonisJS 6 (`--kit=api`): 39/39 tests green (9 unit + 30 functional), `tsc --noEmit`/ESLint clean, 100% coverage on every file the scenario touches. Confirmed AdonisJS's real test runner is **Japa**, not Jest/Vitest, and found three genuine integration bugs: Japa's request-builder assertion methods only exist on the resolved response (not chainable like supertest), a `HOST=localhost` binds IPv6 while Japa's client defaults to IPv4 (`ECONNREFUSED`), and overriding Luxon's `Settings.now` with a closure that itself calls a Luxon API recurses infinitely.
- **`docs/testing-guide/express.md`** — the third worked example, same scenario on plain Express (no framework, hand-rolled auth/authorization middleware, Zod validation): 47/47 tests green (8 unit + 39 functional), `tsc --noEmit`/ESLint clean, 97.5% line coverage. `better-sqlite3` segfaulted in the build environment (reproducible standalone, independent of this project's code) — fell back to a plain in-memory JS store per the doctrine's own no-ORM guidance rather than fighting a broken native binding. Also found a real `strict`-mode catch: `jsonwebtoken`'s `sub` claim is typed `string`, not `number`.
- **`docs/testing-guide/trpc.md`** — the fourth worked example, same scenario as tRPC procedures over an Express HTTP adapter: 48/48 tests green (9 unit + 39 functional), `tsc --noEmit`/ESLint clean, 100% line coverage. Drives the persona matrix through a real HTTP round-trip (`@trpc/client`'s `httpBatchLink`) rather than tRPC's own in-process `createCaller` pattern, since a hand-built caller context would be as circular as unit-testing a Guard directly. Found a real bug: blanket `jest.useFakeTimers()` hangs a real in-process HTTP round-trip because it fakes the timer functions Node's own socket I/O relies on — fixed with a `doNotFake` list that freezes only `Date`.
- **`docs/testing-guide/graphql.md`** — the fifth worked example, same scenario as an Apollo Server v4 schema/resolver pair mounted on Express: 47/47 tests green (9 unit + 38 functional), `tsc --noEmit`/ESLint clean, 98.47% line coverage. Documents GraphQL's two distinct validation layers (schema-structural vs business-rule) as separate `task-test.md` cases, that Apollo always returns HTTP 200 (assert on `errors[].extensions.code` instead), and a real dependency trap — two different `@types/express` versions resolved simultaneously in the same install produced a wall of confusing type errors, fixed by pinning the root version to match what `@apollo/server` expects.
- **`docs/testing-guide/fastify.md`** — the sixth worked example, same scenario on Fastify with hand-rolled auth and manual Zod validation: 47/47 tests green (9 unit + 38 functional), `tsc --noEmit`/ESLint clean, 98.29% line coverage. Found that even Fastify's own `app.inject()` (an in-process request simulator, no real socket) hangs under blanket `jest.useFakeTimers()` — the same `doNotFake` fix from the tRPC/GraphQL examples applies, proving the underlying hazard is broader than "opens a real socket." Also documents that Fastify's default error handler reads a thrown Error's `.statusCode` automatically, the most implicit error-to-status convention of any framework in this doctrine.
- **`docs/testing-guide/hapi.md`** — the seventh worked example, same scenario on Hapi using its native auth scheme/strategy abstraction and Joi route validation instead of a hook/middleware pattern: 47/47 tests green (9 unit + 38 functional), `tsc --noEmit`/ESLint clean, 100% line coverage. Found that `@hapi/hapi` now ships its own bundled types (v21+), making a separately-installed `@types/hapi__hapi` both redundant and stale; that `request.headers.authorization` types as `{}` under `strict: true`, needing an explicit cast; and confirmed empirically that Hapi's own `server.inject()` hangs under blanket `jest.useFakeTimers()` just like Fastify's `app.inject()`, reinforcing that the doctrine's fake-timers hazard applies broadly to any Node HTTP-adjacent test harness, not just real-socket clients or one specific framework.
- **`docs/testing-guide/koa.md`** — the eighth worked example, same scenario on Koa, the leanest core of any framework in this doctrine (no built-in router, body parser, or auth): 47/47 tests green (9 unit + 38 functional), `tsc --noEmit`/ESLint clean, 100% line coverage. Found that `ctx.throw()`'s `never` return type only narrows TypeScript's control flow when the enclosing middleware/handler's `ctx` parameter is explicitly typed, not inferred — a genuinely surprising TS-narrowing gap between two structurally-identical types. Also found `@koa/router` ships its own bundled types now (drop `@types/koa__router`) while `koa` itself still needs `@types/koa` — the same "check per-package, not per-ecosystem" lesson as Hapi. Tested via `supertest` (a real socket, like Express/tRPC/GraphQL), confirming the fake-timers hazard a fourth time.
- **`bin/casebook-back-js-init.mjs`** — scaffolder: copies `AGENTS.md`, `docs/` and `.claude/` into a target project, with a `--coverage=<1-100>` flag. Tested for real: default copy, skip-existing (without `--force`), `--coverage=90` applied cleanly, an out-of-range value rejected with exit code 1.

## How it's consumed

- **Claude Code skill + sub-agents** — open the target project in Claude Code (with this repo scaffolded into it) and invoke the `test-casebook-back-js` skill.
- **Scaffolder** — `node bin/casebook-back-js-init.mjs init [--force] [--coverage=<n>]`, run from a checkout of this repo, targeting your project's working directory as `cwd`.
- **Docs** — hand `AGENTS.md` (and `docs/testing-guide/nestjs.md` if relevant) to any agent directly.

No installable npm package yet (no `npx casebook-back-js init` wrapper) — a natural fast-follow once this repo has seen real use.

## Status

Eight worked examples run end-to-end so far: NestJS (Docker-free, native Node 18 — 40/40 tests green, `tsc --noEmit`/ESLint clean, 98.84% line coverage), AdonisJS 6 (via Docker, since `create-adonisjs` requires Node ≥24 — 39/39 tests green, `tsc --noEmit`/ESLint clean, 100% coverage on scenario code), Express (Docker-free, native Node 18 — 47/47 tests green, `tsc --noEmit`/ESLint clean, 97.5% line coverage, in-memory data layer after a native-binding segfault ruled out `better-sqlite3` in this environment), tRPC (Docker-free, native Node 18 — 48/48 tests green, `tsc --noEmit`/ESLint clean, 100% line coverage), GraphQL/Apollo Server (Docker-free, native Node 18 — 47/47 tests green, `tsc --noEmit`/ESLint clean, 98.47% line coverage), Fastify (Docker-free, native Node 18 — 47/47 tests green, `tsc --noEmit`/ESLint clean, 98.29% line coverage), Hapi (Docker-free, native Node 18 — 47/47 tests green, `tsc --noEmit`/ESLint clean, 100% line coverage), and Koa (Docker-free, native Node 18 — 47/47 tests green, `tsc --noEmit`/ESLint clean, 100% line coverage). This closes the originally planned JS/TS backend framework queue.

## Contributing

Same spirit as the other two repos: contributions are welcome, no permission needed. If a rule here doesn't match your project's reality, or you've built something similar for a different Node framework, open an issue or a PR — verify against the real tool before proposing a fix, don't guess.

## License

MIT
