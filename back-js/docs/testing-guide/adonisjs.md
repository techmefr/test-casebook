# Worked example — AdonisJS 6

Same scenario as the [NestJS worked example](nestjs.md): a blog-style Article API with roles (admin/author/member), a private-article visibility rule, scheduled publishing, and comments that notify the article's owner. Built with `create-adonisjs --kit=api`, run for real, findings below are all things the run itself surfaced — not ported by analogy from the Nest or PHP-back doctrines.

## Result

**39/39 tests green** (9 unit + 30 functional), `tsc --noEmit` clean under `strict: true` (already the `--kit=api` scaffold default), ESLint clean, **100% line coverage on every file the scenario touches** (policies, controllers, services, listeners, events, validators). Coverage is 0% only on Adonis's own generated auth scaffolding this scenario never exercises (`access_tokens_controller.ts`, `new_account_controller.ts`, `profile_controller.ts`, `user_transformer.ts`) — see "Honest scope" below.

## The stack, as actually shipped

`create-adonisjs --kit=api --pkg=npm` (no `--db`/`--auth-guard` flags exist on this CLI version — confirmed via `--help`, not guessed) ships:

- `@adonisjs/core`, `@adonisjs/cors`, `@adonisjs/lucid` (ORM, SQLite via `better-sqlite3`), `@adonisjs/session`, `@adonisjs/shield`
- `@adonisjs/auth` with a pre-configured **token-based `api` guard** (`tokensGuard` / `tokensUserProvider` / `DbAccessTokensProvider`) — auth is not something to bolt on, it's already wired
- `@vinejs/vine` for validation
- **`@japa/runner` + `@japa/assert` + `@japa/plugin-adonisjs` + `@japa/api-client`, not Jest and not Vitest.** This is the single most important stack-detection fact this example surfaced: AdonisJS's real, official test runner is Japa. A JS/TS-backend doctrine that only checks for `jest`/`vitest` in `package.json` will misdetect (or fail to detect) the runner on every Adonis project. See `AGENTS.md`'s stack-detection table, updated to include Japa explicitly.

## Architecture specifics worth knowing before writing tests

- **`database/schema.ts` is generated, not hand-written.** Running `node ace migration:run` (or `migration:fresh`) scans the real database tables and regenerates typed `BaseModel`-extending schema classes (`UserSchema`, `ArticleSchema`, `CommentSchema`) with `@column()` decorators inferred from actual column types. Application models (`app/models/article.ts`, etc.) extend these generated classes and add relations/methods on top — they don't declare columns themselves.
- **Editing an already-migrated table needs `migration:fresh`, not `migration:run`.** Adding a `role` column to `create_users_table.ts` after that migration had already run had no effect under `migration:run` (only pending migrations execute) — `migration:fresh` (drop + re-run everything) was required to actually apply the change and regenerate `schema.ts`.
- **Bouncer policies and controllers are auto-indexed, not manually registered.** `adonisrc.ts`'s `experimental`/hooks wire `indexPolicies` from `@adonisjs/bouncer`; any `app/policies/*.ts` class is discovered and written into `#generated/policies` the next time codegen runs (`node ace test`, `node ace serve`, …), logged as `codegen: created N file(s)`. Controllers referenced from `start/routes.ts` are indexed the same way into `#generated/controllers`. There is no manual registry file to maintain — but it means a policy/controller that "isn't found" is more likely a codegen-not-yet-run problem than a wiring bug.

## Real bugs found by actually running the suite

### 1. Japa's request-builder assertion methods only exist on the resolved response

```ts
// throws: TypeError: ...assertStatus is not a function
await client.post(url).loginAs(user).json(body).assertStatus(201)

// correct — resolve first, then assert
const response = await client.post(url).loginAs(user).json(body)
response.assertStatus(201)
```

Unlike supertest (chainable end-to-end), Japa's `.assertStatus()`/`.assertBodyContains()`/etc. live on the awaited response object, not the pending request builder. Every functional test in this example (`articles_permission.spec.ts`, `articles_validation.spec.ts`, `articles_scheduling.spec.ts`, `comments.spec.ts`) awaits the request into a `response` variable first.

### 2. `HOST=localhost` binds IPv6, Japa's client defaults to IPv4

`.env` had `HOST=localhost`; Node's `server.listen(port, host)` resolved that to IPv6 `::1`, while Japa's `apiClient()`/`authApiClient()` plugins connect via IPv4 `127.0.0.1` by default — every functional test failed with `ECONNREFUSED 127.0.0.1:3333`, even though `testUtils.httpServer().start()` (in `tests/bootstrap.ts`'s `configureSuite`) genuinely succeeded (confirmed by temporarily logging inside the setup hook). AdonisJS already ships `.env.test` as the sanctioned place for test-only env overrides (it already had `SESSION_DRIVER=memory` in it) — the fix was adding one line: `HOST=127.0.0.1` to `.env.test`.

### 3. Luxon `Settings.now` override recursing into itself

```ts
// throws: RangeError: Maximum call stack size exceeded
Settings.now = () => DateTime.fromISO('2026-07-29T10:00:00Z').toMillis()

// correct — no Luxon calls inside the override body
const frozenMillis = new Date('2026-07-29T10:00:00Z').getTime()
Settings.now = () => frozenMillis
```

`DateTime.fromISO`'s internal locale-resolution logic calls `Settings.now()` itself — assigning an override whose own body calls `DateTime.fromISO` re-enters infinitely. Computing the frozen timestamp via plain `Date` outside the override closure avoids any Luxon call inside it. Used in `tests/functional/articles_scheduling.spec.ts`, including a mid-test second jump (`Settings.now = () => new Date(...).getTime()`) to prove a scheduled article becomes visible once its publish time passes.

## Cross-framework doctrine comparison points

- **VineJS's default validation-failure status is 422**, matching Laravel/Lomkit's convention — unlike Nest's `ValidationPipe` default of 400. `articles_validation.spec.ts` asserts 422 throughout. Document the actual status code a project's validator uses rather than assuming one framework's convention carries over.
- **No built-in Jest-style `spyOn` in Japa.** The notification-spy test (`comments.spec.ts`, "commenting notifies the article owner") manually monkey-patches `notificationService.notify`, saving the original reference and restoring it in a `finally` block, rather than using a mocking library.
- **Japa has no built-in coverage flag.** Coverage was measured by running the real suite under `c8`:
  ```bash
  npx c8 --reporter=text --all --include='app/**/*.ts' node ace test
  ```

## Authorization: Bouncer policies + `loginAs`

`ArticlePolicy`/`CommentPolicy` are plain `BasePolicy` subclasses (`create`/`view`/`update`/`delete` methods returning a boolean), invoked from controllers via `bouncer.with('ArticlePolicy').allows(...)`/`.denies(...)` — the direct Adonis equivalent of a Nest Guard or a Laravel Policy. Japa's `authApiClient` plugin adds `.loginAs(user)` to the request builder, minting a real access token through the project's configured `api` guard (the same tokens-based auth the scaffold ships by default) — no manual JWT signing needed, the direct counterpart of the Nest demo's `AuthService.tokenFor(user)` or Laravel's `actingAs()`.

`tests/unit/article_policy.spec.ts` exercises `ArticlePolicy` directly (no HTTP) for the visibility/scheduling branch matrix; `tests/functional/articles_permission.spec.ts` drives the same rules through real HTTP requests across the full persona matrix (admin / author-owner / author-outsider / member / guest × index/show/create/update/delete), weighted on the refused cells per the doctrine's Step 5.2.

## Isolation

`tests/bootstrap.ts`'s `configureSuite` wires `testUtils.db().withGlobalTransaction()` per test group (Lucid's `testUtils.db()` macro, lazily registered by `@adonisjs/lucid`) — every test runs inside its own transaction, rolled back automatically, no shared database state across tests. `tests/functional/comments.spec.ts` mocks the notification side effect (manual monkey-patch, see above) rather than letting a real notification fire.

## Honest scope

This example doesn't exercise:
- Adonis's own **session-based** auth guard (the scaffold ships both token and session guards; only the token guard is used here, matching the API-only `--kit=api` scenario)
- The scaffold's generated **account-registration/access-token/profile** controllers (`new_account_controller.ts`, `access_tokens_controller.ts`, `profile_controller.ts`) and `user_transformer.ts` — untouched framework scaffolding outside this scenario's Article/Comment domain, hence their 0% coverage
- **Multi-role aggregation** and a dedicated **data-integrity** (cascade-delete/unique-constraint) test — same open gap flagged in the Nest worked example, not yet exercised here either

## Reproduction

```bash
docker run --rm -v /tmp:/tmp -w /tmp/back-js-adonis-demo node:24 node ace test
docker run --rm -v /tmp:/tmp -w /tmp/back-js-adonis-demo node:24 npx tsc --noEmit
docker run --rm -v /tmp:/tmp -w /tmp/back-js-adonis-demo node:24 npx eslint .
docker run --rm -v /tmp:/tmp -w /tmp/back-js-adonis-demo -e NODE_ENV=test node:24 npx c8 --reporter=text --all --include='app/**/*.ts' node ace test
```

(Docker was used because the host's native Node was 18.19.1 — `create-adonisjs`'s CLI requires Node ≥24. Not needed if the host already has Node 24+.)
