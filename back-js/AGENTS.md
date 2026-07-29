# AGENTS.md — test-casebook-back-js testing playbook

> **For an AI coding agent (Claude Code, etc.).** You have been handed this file (or the test-casebook-back-js repository) and asked to set up the **test-casebook-back-js** methodology and write the test suite for a JS/TS backend. This file lives in the test-casebook-back-js repo; **apply its steps to the project you are currently working in** (the "target project"), not to test-casebook-back-js itself.

`test-casebook-back-js` is the **JS/TS backend counterpart** of [`test-casebook`](https://github.com/techmefr/test-casebook) (frontend) and [`test-casebook-back`](https://github.com/techmefr/test-casebook-back) (PHP backend) — same doctrine (plan first, exhaustive not happy-path, isolated and deterministic, permission matrix, review gate, coverage floor), ported to a Node backend instead of a browser-facing frontend or a PHP backend. It is a **separate repo on purpose**: a Node backend shares npm and TypeScript with `test-casebook`, but not its testing philosophy — there is no component/UI/accessibility layer to test here, and the persona-matrix/permission-gated-unit approach it needs is the same one `test-casebook-back` already uses for PHP. Forcing this into either sibling repo produces a doc that fits neither.

## Core vs optional — don't assume packages nobody asked for

This playbook has a **generic core** that applies to any Node/TS backend, and **optional modules** that only apply if the target project actually uses the framework/package in question. Detect before applying — never install or assume a package the project doesn't already depend on:

| Module | Detect via (`package.json`) | If absent |
|---|---|---|
| **Core** (this file, Steps 1–6) | any of `@nestjs/core`, `@adonisjs/core`, `express` | N/A — always applies, adapt the framework-specific mechanics below |
| NestJS | `@nestjs/core` | Use the target framework's own DI/guard/module conventions instead — the persona-matrix principle (Step 5.2) still applies |
| AdonisJS | `@adonisjs/core` | Same — adapt to Adonis Bouncer policies instead of Nest Guards |
| Express (no framework) | `express` with no Nest/Adonis | Personas are likely enforced by bespoke middleware — read it, don't assume a package |
| tRPC | `@trpc/server` in `dependencies` | Test procedures through a real HTTP round-trip (`@trpc/client`'s `httpBatchLink` against a real listening server), not `router.createCaller(ctx)` alone for permission-gated units — a hand-built caller context is as circular as unit-testing a Guard directly (see Step 5.2). Validation failures surface as `TRPCError({ code: 'BAD_REQUEST' })` automatically from `.input(zodSchema)`; assert on the client error's `.data.code`, not a raw HTTP status |
| GraphQL (Apollo Server) | `@apollo/server`/`graphql` in `dependencies` | GraphQL has **two** validation layers — schema-level (required fields, undeclared input fields, enforced by GraphQL itself before any resolver runs) and business-rule (value-level, e.g. non-empty strings — needs a Zod/equivalent check inside the resolver). Enumerate both as separate `task-test.md` cases. Errors always return HTTP 200; assert on the response body's `errors[].extensions.code`, never on HTTP status. Apollo Server v5 dropped the Express integration package (`@apollo/server/express4`) entirely — pin v4 if the project mounts on Express |
| Data layer with no ORM | no `typeorm`/`@prisma/client`/`drizzle-orm` | Read what's actually there — a raw driver, or a plain in-memory store (arrays/objects). **If a native-dependency DB library (e.g. `better-sqlite3`) segfaults or fails to build in the execution environment, falling back to a plain in-memory store is a legitimate choice, not a downgrade** — don't burn a session forcing a database dependency the project doesn't strictly need just to prove the test story |
| Vitest (vs Jest) | `vitest` in `devDependencies` | Assume Jest (the default in this playbook, and Nest's own CLI default) |
| Japa (AdonisJS's real runner) | `@japa/runner` in `devDependencies` | **AdonisJS does not use Jest or Vitest.** Every `--kit=api`/`--kit=web` scaffold ships `@japa/runner` + `@japa/assert` + `@japa/plugin-adonisjs` + `@japa/api-client` as its actual test stack — confirm via `package.json` before assuming Jest just because the project is a Node/TS backend |
| ESLint + TypeScript `strict` | `eslint`, `typescript` | Skip the static-analysis step if neither is configured — but note that a fresh framework scaffold commonly ships `strict: false`; turning it on is part of Step 3, not optional once TypeScript is present |
| An ORM (TypeORM, Prisma, Drizzle…) | in `dependencies` | Persona/factory seeding goes through the ORM's repository API; without one, the project is likely using a raw driver or an in-memory store — adapt Step 5.2's seeding accordingly |

**Not every Node backend runs NestJS or an ORM.** Those are documented as opt-in modules precisely so a plain Express + Jest project isn't handed instructions for packages it doesn't have.

## Definition of done

When you finish, all of these must be true:

1. The test runner (Jest or Vitest, whichever the project already uses) is configured and the suite passes.
2. TypeScript compiles clean in **strict mode** (`tsc --noEmit`) and ESLint runs clean — no new `any`, no new suppressions.
3. A `task-test.md` plan exists, lists every unit and its enumerated cases (see Step 5.0), and **every box in it is ticked, reviewed, and committed** — tests exist for every layer the project needs (unit and e2e/integration against a real in-memory or test database), **cover every branch and state of each unit under test**, and each block was validated by a review agent before its commit.
4. Test coverage is **at least the project's coverage floor** (see "Coverage floor" below).
5. Every **permission-gated** unit (a Guard, a Policy, a role/permission check) is covered by a **permission matrix** (Step 5.2) — scenario × persona, expected from the plan, at least one *refused* persona per gated capability, and every enforcement layer asserted.

Work through the steps in order. Do not skip verification.

### Coverage floor

The floor below is **80%** (lines and branches) unless this copy was configured with a different value for the project. It is a per-project, governance-owned setting, not a fixed constant — same reasoning as the front and PHP-back doctrines.

---

## Step 1 — Detect the stack

Read the target project's `package.json`:

1. Identify the framework — `@nestjs/core`, `@adonisjs/core`, or plain `express`/`fastify`. If it's a different Node framework, the core principles (plan first, isolate, permission matrix, review gate) still apply but the specific commands below don't — adapt to the framework's own testing tools.
2. Check for `vitest` — if present, use it; if absent, assume Jest (Nest's own CLI scaffolds Jest by default, and it's the more common convention in real-world Node backends). **This is the default assumption**, mirroring the PHP-back doctrine's PHPUnit-by-default rule.
3. Check `tsconfig.json`'s `compilerOptions.strict` — if `false` or unset, turning it on is part of Step 3's definition of done, not something to leave as-is because "the scaffold shipped that way." A fresh NestJS CLI project ships with `strictNullChecks: false` — don't assume a scaffold's default tsconfig is already strict.
4. Check for an ORM (`typeorm`, `@prisma/client`, `drizzle-orm`) — changes how personas are seeded in Step 5.2 (repository API vs raw driver calls).
5. Check for a permission library (Nest has no built-in one — projects typically hand-roll `Guards` + a `Roles` decorator, or use CASL) — read the actual implementation, don't assume a package.

Match the project's **package manager** (npm, unless `pnpm-lock.yaml`/`yarn.lock` says otherwise) and **test runner invocation** (`npx jest` / `npx vitest`) — detect from `package.json` scripts, don't assume.

---

## Step 2 — Confirm the test runner is configured

- **Jest (default):** confirm a `jest` key in `package.json` (or a `jest.config.js`) scopes `testRegex`/`testMatch` correctly, and a separate e2e config (commonly `test/jest-e2e.json`) exists for HTTP-level tests distinct from unit `*.spec.ts` files colocated with source.
- **Vitest (if detected):** confirm `vitest.config.ts` exists; coverage via `@vitest/coverage-v8` or `-istanbul`.
- **Japa (AdonisJS, if detected):** confirm `tests/bootstrap.ts` registers `assert()`, `apiClient()`, and (if auth is used) `authApiClient(app)` in the `plugins` array, and that `adonisrc.ts` lists the relevant test suites. There is no built-in coverage flag — run the suite (`node ace test`) under `npx c8` instead (see Step 6).
  - **Japa's request-builder chaining differs from supertest.** `client.post(url).loginAs(user).json(body).assertStatus(201)` throws `TypeError: ...assertStatus is not a function` — assertion methods (`assertStatus`, `assertBodyContains`, …) exist only on the **resolved response**, not on the pending request builder. Always `const response = await client.post(url).loginAs(user).json(body)` first, then call `response.assertStatus(201)` as a separate statement.
- **Coverage command:**
  ```bash
  npx jest --coverage --collectCoverageFrom='src/**/*.ts' --coverageThreshold='{"global":{"lines":80}}'
  # or, if Vitest is present:
  npx vitest run --coverage
  ```
- **A framework's e2e suite and its unit suite are commonly two separate Jest configs/projects** (Nest's own scaffold ships exactly this split) — coverage collected from only the unit-spec run will under-report real coverage if the bulk of business logic is actually exercised through the e2e/HTTP suite. Point `--collectCoverageFrom` at `src/**/*.ts` from whichever config actually runs the HTTP-level tests, or merge both runs, rather than trusting the unit-only number.
- **Do not install a runner the project doesn't have.** If neither Jest nor Vitest is configured, stop and ask the user which one they want before proceeding.

---

## Step 3 — Static analysis (TypeScript strict + ESLint)

```bash
npx tsc --noEmit
npx eslint '{src,test}/**/*.ts'
```

- **Turn on `strict: true` in `tsconfig.json`** if the project's scaffold shipped without it — a fresh NestJS CLI project ships `strictNullChecks: false`, `noImplicitAny: false`; enabling strict mode is part of the definition of done, the same way the PHP-back doctrine treats an established Larastan level as non-negotiable.
- **Definite-assignment assertions on ORM entity/DTO properties.** TypeORM (and similar decorator-driven ORMs) declare columns without initializers (`@Column() title: string;`) — under `strict`, this is a real compile error (`has no initializer and is not definitely assigned`), not a false positive. Use `title!: string;` on entity and DTO fields — this is the direct TS-strict-mode counterpart of the PHP-back doctrine's PHPDoc-generics requirement.
- **`collect`/response-shape equivalents:** a controller test that does `response.body.data.map(...)` without a typed DTO on the response loses type information the same way PHP's `collect($response->json())` does — type the response shape (a response DTO, or an explicit cast) rather than reading through `any`.
- **`jsonwebtoken`'s `JwtPayload.sub` is typed `string | undefined`, not `number`.** Signing a token with `{ sub: user.id }` where `id` is a numeric primary key compiles under loose settings, but `strict: true` correctly flags the later lookup (`db.users.find(u => u.id === payload.sub)`) as a type mismatch (`TS2367`) — sign with `{ sub: String(user.id) }` and compare `String(u.id) === payload.sub` on the lookup side.
- **A duplicate-but-different-version `@types/*` package produces the same confusing structural-mismatch errors as ORM API drift.** If a library (e.g. `@apollo/server`) nests its own `@types/express` while the project's root also installs an unpinned (and therefore newer) `@types/express`, TypeScript treats the two as structurally different `Request`/`Application` types and rejects otherwise-correct code with a wall of overload-mismatch errors. Run `npm ls <package>` to confirm a duplicate actually exists, then pin the root version to match what the library expects — don't chase the symptom by adding casts.
- **ORM major-version API drift is real, not theoretical.** A relations option that used to accept a string array (`relations: ['owner']`) may now require an object shape (`relations: { owner: true }`) after a major bump — `tsc --noEmit` catches this immediately if strict mode is on; don't skip strict mode "because the ORM already worked before."
- If the project has **no** ESLint/TypeScript strict mode configured at all (extremely rare in a real Node backend), skip this step's enforcement but still recommend enabling it — same "optional, never installed without asking" rule as the other two doctrines, but note that plain `tsc` is nearly always present since TypeScript itself is a devDependency of virtually every serious Node backend.

---

## Step 4 — Testing conventions (Jest/Vitest, isolation, determinism)

Same principles as the front and PHP-back doctrines' equivalent steps, Node/TS idioms:

- **Isolate with a fresh database per test.** An in-memory SQLite/Postgres-in-container instance recreated per test file (e.g. TypeORM's `dropSchema: true, synchronize: true` against `:memory:`) — never share database state across tests.
- **Mint a fresh persona per test**, never mutate one seeded user's role mid-test to represent a different persona — same reasoning as the PHP-back doctrine: a mutated user can carry state (a previously-issued JWT, a cached guard decision) from its prior persona.
- **A JWT (or any signed token) has its own `exp` — isolation tests that fake the clock forward can silently expire it too.** `jest.setSystemTime()` advances the fake clock used both by the business logic under test (e.g. a scheduled-publish gate) **and** by `jsonwebtoken`'s own expiry check on every subsequent request. A test that time-travels forward to prove a scheduling gate opens, then re-uses a token minted before the jump, will fail with an unrelated `401` — not because the permission logic is wrong, but because the token expired along with the fake clock. Re-mint the token (or any other time-bound credential) after advancing time, don't reuse one from before the jump. This is a real, verified gotcha — not theoretical.
- **Freeze/advance time with `jest.useFakeTimers()` / `jest.setSystemTime()`** (or Vitest's `vi.useFakeTimers()`) for anything date-dependent — same reasoning as the other two doctrines' time-freezing rules.
- **AdonisJS/Japa: a `HOST=localhost` in `.env` can bind the test server on IPv6 (`::1`) while Japa's API client defaults to IPv4 (`127.0.0.1`)**, producing `ECONNREFUSED 127.0.0.1:<port>` on every functional test even though `testUtils.httpServer().start()` genuinely succeeded. Set `HOST=127.0.0.1` in the project's `.env.test` (AdonisJS already loads this file for the test environment — it is the sanctioned place for test-only env overrides, not a workaround).
- **Luxon's `Settings.now` override must never call a Luxon API inside its own closure.** `Settings.now = () => DateTime.fromISO(...).toMillis()` recurses infinitely (`RangeError: Maximum call stack size exceeded`) because `DateTime.fromISO` itself calls `Settings.now()` internally. Compute the frozen timestamp with a plain `new Date(iso).getTime()` **before** assigning it into the `Settings.now` override, so the override body contains zero Luxon calls.
- **A test that opens a real socket in-process (e.g. `http.createServer(...).listen(0)` driven via `fetch`/a real client, as opposed to `supertest`'s in-process request injection) must not blanket-fake Jest's timers.** `jest.useFakeTimers()` without `doNotFake` replaces `setTimeout`/`setImmediate`/etc. globally, which are exactly what Node's own HTTP/net stack uses internally to drive socket I/O — the request's callbacks never fire and the test hangs until Jest's own timeout. Pass `doNotFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'setImmediate', 'clearImmediate', 'nextTick', 'hrtime', 'performance', 'queueMicrotask']` to freeze only `Date`/`Date.now()` while leaving the timer/socket machinery real. This doesn't show up with `supertest` (no real socket involved) — it's specific to any test setup (e.g. a tRPC client over `httpBatchLink`) that genuinely opens a socket in the same process as the faked clock.
- **Mock outbound HTTP and notifications**, don't let a test actually fire a real email/webhook/queue job — spy on the service boundary (e.g. a `NotificationsService.notify()` call) and assert it was invoked with the right arguments, the direct Node equivalent of Laravel's `Notification::fake()`/`assertSentTo()`.
- **Don't test the framework.** Don't write a case asserting that a Nest Guard pipeline runs in the documented order, or that TypeORM's own query builder works as documented — that's the framework's/package's own test suite's job. Test **your** Guards' logic, **your** Policies/permission services, **your** validation DTOs, **your** custom business logic.

---

## Step 5 — Write the tests

### Step 5.0 — Plan in `task-test.md` first, then execute block by block

Identical process to the front and PHP-back doctrines:

1. **List every unit under test** — every service's business logic, every Guard/Policy, every custom interceptor/listener, every controller endpoint that isn't purely framework CRUD, grouped **one block per unit**. Include units that already have tests — audit them.
2. **Read the unit's full source end to end** before enumerating cases — every branch, every guard clause, every collaborator it calls.
3. **Enumerate every case as a checkbox**: every input partition, every conditional branch, every state (success/empty/error), every validation rule (valid **and** invalid input), every guard the code already contains, and — critically — **every authorization gate** (see Step 5.2).
4. Note the layer (unit/e2e) and, if the unit is exposed over HTTP, the endpoint(s) involved.

### Step 5.0bis — The category checklist (don't stop at permissions)

Same categories as the PHP-back doctrine, tick "N/A" explicitly rather than silently skipping one:

- **Authorization** — the persona matrix (Step 5.2).
- **Validation** — every rule on the request DTO (`class-validator` decorators, or the framework's equivalent), both the valid case and *each* invalid case (missing, wrong type, out of range, an undeclared/non-whitelisted field) — one case per rule, not one "invalid payload" catch-all.
- **Business/state logic** — every branch and every state transition the unit's own code contains, including the empty/error/edge states.
- **Isolation** — no test may depend on wall-clock time without faking it, a real external HTTP call, or a real queue/notification dispatch — assert the mock/spy was called with the right arguments, don't let it actually fire. Remember the JWT-expiry-under-fake-time gotcha from Step 4.
- **Data integrity** — unique constraints, cascade/restrict deletes, required relations — assert via the database (a repository `findOne`), not just the returned DTO.
- **Multi-role aggregation** — a capability whose access comes from a secondary/aggregated role, not the persona's single defining one.
- **Optional-module cases** — framework-specific structural validation (a DTO whitelist rejecting an undeclared field — Nest's `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })` returns 400, not the PHP-back doctrine's 422; document the actual status code the project uses) as a separate case from the Policy/Guard-level authorization check.

### Step 5.1 — Execute each block

Same discipline as the other two doctrines: one assertion-bearing test per checkbox, TypeScript strict, run the block, tick the checkbox, hand it to an independent reviewer before committing. No comments in the test files — intent lives in test/method names, not in `// arrange / act / assert` banners.

### Step 5.2 — Permission-gated units: the persona matrix

Directly ported from the other two doctrines — same reasoning, same weighting toward refused cells, Node/TS-specific mechanics:

**Build a persona catalog by seeding real records, minted fresh per test.** Never mutate a single seeded user's role mid-test to represent a different persona.

- **With NestJS Guards + a `Roles` decorator (or CASL):** seed a user with the target role via the repository, mint a real signed token for it (`AuthService.tokenFor(user)`, or the project's actual login flow), one seed + one token per persona, per test.
- **Without a role library:** drive whatever the project actually uses — a `role` column checked in bespoke middleware, a hand-rolled ability-check function — as long as it's a real input the test controls.

**Drive the gate through a real HTTP request (supertest against the Nest app), assert the observable outcome.** `request(app.getHttpServer()).patch(...).set('Authorization', 'Bearer ' + token).expect(403)` — assert what the system does (status code, field present/absent), never "does this persona hold role X" (that just re-tests the role check's own resolution, see "don't test the framework").

- **Weight the matrix on the refused cells.** For every gated capability, at least one persona that must be **denied** — that's where the bugs live.
- **The expected outcome comes from the plan, never from the app's own check.** Computing "expected = what the Guard returns" and asserting against the Guard's own decision is circular.
- **Assert every enforcement layer.** If both a Policy/Guard (403) and a DTO structural whitelist (400) exist for the same endpoint, assert both.
- **A capability that rides a secondary/aggregated role needs its own unit case.** Mint at least one persona whose access to a given capability comes from a non-primary role and assert it still works.
- **If you cannot drive the persona/gate at all, stop and say so** — don't fake a green test locked to a single default persona.

---

## Step 6 — Verify (do not skip)

1. **Run the tests** — `npx jest` (unit) and `npx jest --config test/jest-e2e.json` (e2e), or the Vitest equivalents; they must pass.
2. **Run static analysis** — `npx tsc --noEmit` and `npx eslint '{src,test}/**/*.ts'`; both clean.
3. **Run coverage and enforce the floor**, from whichever run actually exercises the business logic (commonly the e2e suite, not the unit-spec run alone — see Step 2's note):
   ```bash
   npx jest --config test/jest-e2e.json --coverage --rootDir=. --collectCoverageFrom='src/**/*.ts' --coverageThreshold='{"global":{"lines":80}}'
   ```
   If coverage is below the floor, that maps to cases missing from `task-test.md` — go back to Step 5.0, don't lower the threshold.

---

## Guardrails

- Do **not** assume NestJS, an ORM, or a specific permission library is present — detect via `package.json` (Step 1) and adapt cleanly if the project uses something else.
- Do **not** invent a persona-catalog helper that hardcodes one project's auth API — build it from what the target project actually uses.
- Do **not** write comments in the test files (or any code you touch) — same rule as the other two doctrines.
- Do **not** stop at the happy path, and do **not** skip the `task-test.md` plan.
- Do **not** ship loosely-typed tests — TypeScript strict mode, typed factories/DTOs, and a clean `tsc`/ESLint run.
- Do **not** lower or disable the coverage floor to make the suite pass.
- Do **not** test a permission-gated unit under a single persona. Build the matrix (Step 5.2), dense on the refused cells, asserting every enforcement layer.
- Do **not** compute a case's expected result from the app's own guard/gate check and assert against it — that's circular.
- Do **not** reuse a token minted before a `jest.setSystemTime()` forward jump — mint a fresh one after the jump if the test needs to make an authenticated request post-jump.
- Do **not** mutate a single seeded user's role to represent multiple personas in one test — mint a fresh persona per test instead.
- Do **not** test the framework or a third-party package's own internals — test your Guards, your Policies, your validation DTOs, your custom business logic only.
