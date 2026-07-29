# Worked example — a NestJS Article API with roles and a private article

> Verified for real: fresh `@nestjs/cli` project, TypeORM + `better-sqlite3` (in-memory), Passport-JWT for real signed-token auth, Jest (Nest's own default, not Vitest), run directly on the host (Node 18, no Docker needed — unlike the PHP-back doctrine's demo, which had no native PHP available). **40/40 tests green (9 unit + 31 e2e), `tsc --noEmit` clean under `strict: true`, ESLint clean.** This isn't a plausible-looking example — every assertion below actually ran.

## The scenario

Same blog-idea scenario as the PHP-back doctrine's worked examples, ported to NestJS — an Article API (`GET/POST/PATCH/DELETE /articles`) plus comments, with three roles:

- **admin** — sees and can act on every article, public or private.
- **author (owner)** — can create articles, and update/delete their own.
- **author (outsider)** — same role, but not the owner of the article under test.
- **member** — can read public articles but can't create one.
- **guest** — no token at all; every endpoint must reject with 401.

One article is `isPrivate = true`, visible only to its owner and to admins. A second mechanic, scheduled publishing (`publishedAt`), adds a time-dependent gate: an article isn't visible to anyone but its owner/admin until `publishedAt` passes — this is what exercises the Isolation category for real.

## The Policy — the actual authorization surface

```ts
@Injectable()
export class ArticlesPolicy {
  view(user: User, article: Article): boolean {
    if (article.isScheduledForFuture()) {
      return user.role === 'admin' || user.id === article.ownerId;
    }
    if (!article.isPrivate) {
      return true;
    }
    return user.role === 'admin' || user.id === article.ownerId;
  }

  update(user: User, article: Article): boolean {
    return user.role === 'admin' || user.id === article.ownerId;
  }

  delete(user: User, article: Article): boolean {
    return user.role === 'admin' || user.id === article.ownerId;
  }
}
```

The controller calls this policy per row for `index` (filtering the list) and per record for `show`/`update`/`delete` — the direct Node equivalent of the PHP worked example's `Gate::allows('view', $article)` per-row filtering, without a package doing it automatically.

Coarse-grained checks (can this role create an article at all) go through a separate `RolesGuard` + `@Roles('admin', 'author')` decorator — the equivalent of Laravel's `hasAnyRole()` check, but implemented as a Nest Guard rather than inline in a Policy method, since Nest's DI/decorator model makes that the idiomatic place for a role-only (not row-level) check.

## The persona-matrix test — dense on the refused cells

```ts
it('an outsider author is forbidden from viewing someone elses private article directly', async () => {
  const { user: owner } = await createUser(ctx, 'author');
  const { token: outsiderToken } = await createUser(ctx, 'author');

  const created = await request(app.getHttpServer())
    .post('/articles')
    .set('Authorization', `Bearer ${ctx.auth.tokenFor(owner)}`)
    .send({ title: 'private', body: 'b', isPrivate: true })
    .expect(201);

  await request(app.getHttpServer())
    .get(`/articles/${created.body.id}`)
    .set('Authorization', `Bearer ${outsiderToken}`)
    .expect(403);
});

it('a guest without a token is rejected on every endpoint', async () => {
  await request(app.getHttpServer()).get('/articles').expect(401);
  await request(app.getHttpServer()).post('/articles').send({ title: 'x', body: 'y' }).expect(401);
});
```

Full matrix actually run (13 e2e permission tests, HTTP end-to-end via `supertest`): index visibility for admin vs. an outsider author, view of a private article for owner/admin/outsider/plain member, guest rejection, create allowed for author and refused for member, update/delete allowed for owner and admin and refused for an outsider — asserting the actual HTTP status, not a mocked guard decision.

## The unit-level counterpart — the same matrix, without HTTP

`src/articles/articles.policy.spec.ts` drives `ArticlesPolicy` directly, `new ArticlesPolicy()`, no HTTP, no supertest — 9 unit tests, same persona matrix against `view`/`update`/`delete`, all green. Same reasoning as the other two doctrines' unit/feature split: the e2e suite is what a client actually experiences, the unit suite pinpoints a failure fast.

## Validation — every rule, both directions

`test/articles-validation.e2e-spec.ts` (7 tests) asserts each `CreateArticleDto`/`UpdateArticleDto` rule both ways: missing `title`, missing `body`, non-string `title`, non-boolean `isPrivate`, and — the Node/Nest-specific case — an **undeclared field** (`ownerId` in the create payload) rejected by `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })`, the direct equivalent of Lomkit's 422 structural whitelist but returning **400**, Nest's own default status for a validation failure.

## Isolation — scheduled publishing, and a real gotcha it surfaced

```ts
it('the article becomes visible once its publish time passes', async () => {
  const { user: owner } = await createUser(ctx, 'author');
  const { token: memberToken } = await createUser(ctx, 'member');
  const article = await ctx.articles.save(ctx.articles.create({
    title: 't', body: 'b', isPrivate: false, ownerId: owner.id,
    publishedAt: new Date('2026-07-30T10:00:00Z'),
  }));

  await request(app.getHttpServer())
    .get(`/articles/${article.id}`)
    .set('Authorization', `Bearer ${memberToken}`)
    .expect(403);

  jest.setSystemTime(new Date('2026-07-31T10:00:00Z'));

  const memberTokenAfterTimeTravel = ctx.auth.tokenFor(
    await ctx.users.findOneByOrFail({ role: 'member' }),
  );

  await request(app.getHttpServer())
    .get(`/articles/${article.id}`)
    .set('Authorization', `Bearer ${memberTokenAfterTimeTravel}`)
    .expect(200);
});
```

**What actually happened the first time this test was written**, before the fix above: advancing `jest.setSystemTime()` forward one day made the *previously minted* `memberToken` fail with a **401**, not the expected 200 — because the JWT's own `exp` claim (signed with a 1-hour expiry) is checked against the same faked clock the test uses to prove the scheduling gate opens. The failure looked like a broken permission check; it was actually an expired credential. Fixed by re-minting the token after the time jump. This is a genuinely new isolation-testing hazard neither the frontend nor the PHP-back doctrine has an equivalent of — Laravel's `actingAs()` test helper authenticates without minting an expiring credential at all, so `travelTo()` in the PHP worked example never had this failure mode to surface.

## Comments and notification — the owner gets notified

`test/comments.e2e-spec.ts` (9 tests): a member can comment on a public article, is refused on someone else's private article (403) and as a guest (401), and — the notification case — commenting emits an event (`@nestjs/event-emitter`) consumed by a listener that calls `NotificationsService.notify(ownerId, 'article.commented', ...)`. The test spies on `NotificationsService.notify` (`jest.spyOn`) and asserts it was called with the article owner's id — the direct equivalent of Laravel's `Notification::fake()`/`assertSentTo()`, just implemented as a plain Jest spy on the service boundary rather than a framework-provided fake, since Nest has no built-in notification-faking helper.

## The static-analysis gate — also actually run, and it found real gaps

`tsc --noEmit` failed first, twice, on a **freshly enabled `strict: true`** (the CLI scaffold ships `strictNullChecks: false`):

1. **26 "has no initializer" errors** on every TypeORM entity and DTO property (`@Column() title: string;`) — fixed with definite-assignment assertions (`title!: string;`), the TS-strict-mode counterpart of the PHP doctrine's PHPDoc-generics requirement on Eloquent relations.
2. **3 errors from a TypeORM major-version API change**: `relations: ['owner']` no longer type-checks against `FindOptionsRelations<Article>` — the installed TypeORM (1.1.0) expects the object shape `relations: { owner: true }`. `tsc --noEmit` caught this immediately; without strict mode (or without running `tsc` on `test/` at all) this would have been a silent runtime issue instead of a compile-time one.

ESLint (Prettier-integrated, Nest's own scaffold config) found 39 formatting-only violations across the entire codebase and test suite — all auto-fixed with `--fix`, re-verified clean, tests still green afterward. No behavioral findings from ESLint itself in this pass, but running it against `test/` as well as `src/` (not just `src/`) is worth calling out the same way the PHP doctrine calls out pointing Larastan at `tests/`.

## Coverage — measured for real, not assumed

```
All files                    |   99.02 |     90.9 |     100 |   98.84
```
(lines/statements/branches/functions, collected from the **e2e** run against `src/**/*.ts`, excluding `main.ts` — the bootstrap entrypoint, never exercised by a test the same way Laravel's `routes/console.php`/kernel bootstrap isn't — and excluding `*.spec.ts` files themselves from being counted as source.) 98.84% lines, well above the 80% floor. One real gap the per-file breakdown surfaced: `jwt.strategy.ts`'s `validate()` failure branch (user not found) is untested — a genuine missing case, not a coverage-tool artifact, noted for a future `task-test.md` pass on this demo.

**A real gotcha in how this was measured**: Nest's own scaffold ships **two separate Jest configs** — a unit config (`rootDir: "src"`, `*.spec.ts`) and a separate e2e config (`test/jest-e2e.json`, `*.e2e-spec.ts`) — and most of this project's actual business logic (controllers, guards, services) is only exercised through the e2e suite via real HTTP requests, not the unit-spec run. Running `--coverage` against the unit config alone reported **0%** on everything except `ArticlesPolicy` — not because the code was untested, but because the config measuring coverage wasn't the one running the tests that exercise it. `AGENTS.md` Step 2 and Step 6 both call this out explicitly.

## Honest scope of what this example actually exercises

Of the category checklist in `AGENTS.md` Step 5.0bis, this example drives **Authorization** (unit + e2e), **Validation**, **Isolation** (scheduled publishing + the JWT-expiry-under-fake-time gotcha + notification spying), and **Business/state logic** end to end — 40/40 green, `tsc --noEmit` clean under strict mode, ESLint clean. **Multi-role aggregation** and **Data integrity** (cascade deletes, unique constraints) are documented in `AGENTS.md` but not yet exercised by a dedicated case in this demo — a natural next pass, the same kind of honestly-scoped gap the PHP worked example called out before its own follow-up passes closed it.

## How to reproduce this yourself

```bash
npx @nestjs/cli@10 new back-js-demo --package-manager npm --skip-git
cd back-js-demo
npm install class-validator class-transformer @nestjs/config bcrypt
npm install @nestjs/typeorm typeorm better-sqlite3 @nestjs/event-emitter
npm install @nestjs/jwt @nestjs/passport passport passport-jwt

# then: entities, policies, guards, controllers, services (see this repo's own
# demo, not shipped as files in test-casebook-back-js itself), tsconfig.json's
# strict: true, main.ts's ValidationPipe

npx tsc --noEmit
npx eslint '{src,test}/**/*.ts' --fix
npx jest
npx jest --config ./test/jest-e2e.json
npx jest --config ./test/jest-e2e.json --coverage --rootDir=. --collectCoverageFrom='src/**/*.ts' --collectCoverageFrom='!src/main.ts' --coveragePathIgnorePatterns='/node_modules/' --coveragePathIgnorePatterns='\.spec\.ts$'
```

No Docker needed — Node was available natively on the build host, unlike the PHP-back doctrine's environment (no native PHP/Composer, hence Docker throughout there).
