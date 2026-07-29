# Conventions — Test Naming and the `task-test.md` Plan

## Test naming

- **Jest/Vitest, `it`/`describe` blocks:** a descriptive sentence that states the behaviour, not the mechanism:
  ```ts
  it('refuses an outsider author from updating someone elses article', async () => { ... });
  ```
  over a name that just restates the unit under test (`test update article`) without saying what's being verified.
- Group related cases under one `describe('ArticlesPolicy', () => { ... })` per unit — mirrors PHPUnit's one-class-per-unit convention.

## File naming and layout

- `{unit}.spec.ts` colocated with its source (`articles.policy.spec.ts` next to `articles.policy.ts`) for **unit** tests — the Jest/Nest-standard convention.
- `{scenario}.e2e-spec.ts` under `test/` for **e2e/HTTP-level** tests hitting the real app via `supertest` — mirrors the PHP-back doctrine's `tests/Feature/` vs `tests/Unit/` split, just following Node's own directory convention instead of inventing a new one.

## The `task-test.md` plan — same shape as the other two doctrines

```md
## src/articles/articles.policy.ts — unit + e2e

- [ ] admin persona → view() allowed on any article, public or private
- [ ] owner persona (article.ownerId matches) → view() allowed on their own private article
- [ ] outsider persona (no permission) → view() refused — 403 at the route level, data unchanged
- [ ] persona with access via a secondary/aggregated role → view() still allowed (aggregation case)

## src/articles/dto/create-article.dto.ts — e2e (validation)

- [ ] missing title → 400
- [ ] non-string title → 400
- [ ] an undeclared field (e.g. ownerId in the body) → 400 (ValidationPipe whitelist)
- [ ] valid payload without isPrivate → 201
```

One checkbox = one test, exactly as in the other two doctrines. A block isn't done until every checkbox has a real, assertion-bearing test, the reviewer has approved it, and it's committed.

## Persona naming in tests

Name persona variables by **role in the scenario**, not by a generic `user`/`user2`:

```ts
const { user: admin, token: adminToken } = await createUser(ctx, 'admin');
const { user: owner, token: ownerToken } = await createUser(ctx, 'author');
const { token: outsiderToken } = await createUser(ctx, 'author'); // no relation to the resource — the refused cell
```

Never `user1`/`user2` — a reviewer (human or agent) shouldn't have to cross-reference back to the matrix to know which persona a variable represents.

## Minting a persona's credential

Seed the user via the repository, then mint its token through the app's real `AuthService`/JWT-signing path (`ctx.auth.tokenFor(user)`) rather than hand-constructing a JWT string — the test then exercises the same signing/verification path production does, the direct equivalent of Laravel's `actingAs()` helper. Re-mint the token if a test advances the fake clock past its `exp` (see `AGENTS.md` Step 4).
