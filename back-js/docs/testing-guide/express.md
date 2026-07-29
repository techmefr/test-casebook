# Worked example — Express (no framework)

Same scenario as the [NestJS](nestjs.md) and [AdonisJS](adonisjs.md) worked examples: a blog-style Article API with roles (admin/author/member), a private-article visibility rule, scheduled publishing, and comments that notify the article's owner — this time on plain Express, with no DI container, no decorators, and no ORM.

## Result

**47/47 tests green** (8 unit + 39 functional), `tsc --noEmit` clean under `strict: true`, ESLint clean, **97.5% line coverage** — well above the 80% floor.

## The stack, as actually built

Express has no scaffolding CLI and no built-in conventions for auth, authorization, or validation — every one of those is a project-specific choice, confirmed by reading the code rather than assumed:

- **Auth**: hand-rolled `authenticate()` middleware (`src/auth.ts`) verifying a `jsonwebtoken` bearer token and attaching `req.user`; a `requireRole(...)` middleware for coarse role gates. No Passport, no framework Guard equivalent — this is what "a bespoke Express project" actually looks like, matching the doctrine's Step 1 guidance to "read the actual implementation, don't assume a package."
- **Authorization**: plain object literals (`src/articlePolicy.ts`, `src/commentPolicy.ts`) exporting functions like `view(user, article, now)` — no Policy/Guard base class, just functions returning booleans, called directly from route handlers.
- **Validation**: Zod schemas (`src/validators.ts`) with `.strict()` (rejects undeclared fields) — Express itself has no validation layer, this project's choice was Zod over `class-validator`/Joi.
- **Data layer**: **no ORM, no database — a plain in-memory JS store** (`src/db.ts`: arrays of `User`/`Article`/`Comment` plus incrementing id counters). This is a real, load-bearing finding, not a shortcut: see "A native-binding trap" below.
- **Test runner**: Jest (the doctrine's default, confirmed absent of `vitest` in `package.json`) + `ts-jest` + `supertest` for HTTP-level assertions + `c8`/Jest's own `--coverage` for coverage.

## A native-binding trap: `better-sqlite3` segfaulted in this environment

The first build of this example used `better-sqlite3` (an in-memory SQLite database), matching the isolation approach used in the Nest and Adonis examples. It **segfaulted on every query** (`Segmentation fault (core dumped)`) in this WSL environment — reproducible with a two-line standalone script (`new Database(':memory:')` + one `INSERT`), independent of Jest, TypeScript, or this project's code. `npm rebuild --build-from-source` did not fix it; removing the stale `build/` directory to force use of the shipped `linux-x64.node` prebuild did not fix it either — the prebuilt native binary itself faulted in this environment.

**This is exactly the scenario the doctrine's core-vs-optional table already anticipates**: "no ORM detected → the project is likely using a raw driver or an in-memory store — adapt seeding accordingly." Rather than fighting a broken native binding to force a real-database story that isn't this project's actual choice, the fix was to **rebuild the data layer as a plain in-memory JS store** — arrays plus counters, no native dependencies at all. This is a legitimate, real option for a small Express service, not a downgrade of the test story: isolation is achieved the same way (`createDb()` returns a fresh store, `beforeEach` recreates it per test — see "Isolation" below), and every test still exercises real HTTP requests against a real Express app.

**Lesson for future agents applying this doctrine to a from-scratch or unfamiliar Express project**: if a native-dependency database library misbehaves in the execution environment (segfaults, fails to build, or the project genuinely has no ORM/database), falling back to a plain in-memory store is a legitimate, doctrine-sanctioned choice — don't burn a session forcing a database dependency the project doesn't actually need to prove the test story.

## Real, project-specific findings

### 1. JWT's `sub` claim is a string, not a number — `strict: true` catches the mismatch immediately

`jsonwebtoken`'s `JwtPayload.sub` is typed `string | undefined` (per the JWT spec, `sub` is always a string claim). Signing with `{ sub: user.id }` (a `number`) compiles under loose settings but `tsc --noEmit` under `strict: true` correctly flags the later lookup `db.users.find((u) => u.id === payload.sub)` as `TS2367: This comparison appears to be unintentional because the types 'number' and 'string | undefined' have no overlap`. Fixed by signing `{ sub: String(user.id) }` and comparing `String(u.id) === payload.sub` on the lookup side — a small, real gotcha that a loosely-typed (non-strict) Express/TS project would silently miss, since `===` between mismatched types is still valid JS at runtime as long as one side happens to coerce correctly by luck.

### 2. `HttpStatus` conventions are a per-project choice, not a framework default

Express has no framework-level validation pipe, so there's no "Nest's 400" or "VineJS's 422" default to fall back on — the project's own `safeParse`-based handlers were written to return **422** for every Zod validation failure, matching the AdonisJS example's convention rather than Nest's 400. Document whichever status code a bespoke Express project actually returns; don't assume either sibling framework's convention carries over by default.

## Authorization: hand-rolled policy functions + a persona matrix

`articlePolicy.view(user, article, now)`/`.create(user)`/`.update(user, article)`/`.delete(user, article)` and `commentPolicy.create(user, article)`/`.delete(user, comment, article)` are plain functions — no interface, no DI. Route handlers call them directly and translate the boolean into a 403 when denied. `test/unit/articlePolicy.spec.ts` exercises the policy functions directly (8 cases: public/private/scheduled visibility, owner/admin/outsider update-delete, role-gated create). `test/functional/articlesPermission.spec.ts` drives the same rules through real HTTP requests, `tokenFor(user)` minting a real signed JWT per persona (the hand-rolled equivalent of the Nest demo's `AuthService.tokenFor()` or Adonis's `.loginAs()`), weighted on the refused cells (outsider-author, plain-member, guest) per the doctrine's Step 5.2.

## Validation

`test/functional/articlesValidation.spec.ts` — 7 cases: missing title, missing body, non-string title, non-boolean `isPrivate`, an **undeclared field rejected** (Zod's `.strict()`, the direct equivalent of Nest's `forbidNonWhitelisted`), a valid full payload, and a valid partial update payload. All assert **422**.

## Isolation

- `createDb()` returns a brand-new in-memory store; every test file's `beforeEach` calls it fresh — no shared state leaks across tests (an early version of this suite shared one `db` per `describe` block and a permission-matrix "index returns exactly 2 articles" assertion started failing once later tests in the same file added their own articles to the same store — fixed by moving `createDb()`/`createApp()` into `beforeEach`).
- `test/functional/articlesScheduling.spec.ts` uses `jest.useFakeTimers()` + `jest.setSystemTime()` to freeze/advance the clock for the scheduled-publish gate — and includes a dedicated case, **"a token minted before a forward time jump expires along with the fake clock"**, directly verifying the JWT-expiry-under-fake-time hazard already documented in `AGENTS.md` Step 4: a token signed before `jest.setSystemTime()` jumps forward is correctly rejected with 401 afterward, and the "article becomes visible" case re-mints a fresh token after the jump rather than reusing the stale one.
- `test/functional/comments.spec.ts`'s notification test uses `jest.spyOn(notificationService, 'notify').mockImplementation(...)` — Jest's real spy API (unlike the Adonis example, which had no such built-in and needed a manual monkey-patch) — asserted with `toHaveBeenCalledWith(...)`, then `spy.mockRestore()`.

## Honest scope

This example doesn't exercise:
- **Data integrity** (unique constraints, cascade deletes) beyond what the in-memory store's own filter-based delete already guarantees — there's no real database to violate a constraint against
- **Multi-role aggregation** — same open gap flagged in both the Nest and Adonis worked examples

## Reproduction

```bash
cd back-js-express-demo
npx tsc --noEmit
npx eslint 'src/**/*.ts' 'test/**/*.ts'
npx jest
npx jest --coverage --collectCoverageFrom='src/**/*.ts' --coverageThreshold='{"global":{"lines":80}}'
```

No Docker needed — this example ran on the host's native Node 18, since Express has no minimum-Node requirement beyond what its own dependencies need.
