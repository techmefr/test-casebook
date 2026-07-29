# Worked example — Koa

Same scenario as the [NestJS](nestjs.md), [AdonisJS](adonisjs.md), [Express](express.md), [tRPC](trpc.md), [GraphQL](graphql.md), [Fastify](fastify.md), and [Hapi](hapi.md) worked examples: a blog-style Article API with roles (admin/author/member), a private-article visibility rule, scheduled publishing, and comments that notify the article's owner — this time on Koa, the most minimal framework in this doctrine so far.

## Result

**47/47 tests green** (9 unit + 38 functional), `tsc --noEmit` clean under `strict: true`, ESLint clean, **100% line coverage** — well above the 80% floor.

## The stack, as actually built

- **Koa v3** + **`@koa/router`**, with a hand-rolled auth middleware (`app.use(async (ctx, next) => {...})`) doing the same JWT-verification-and-`ctx.state.user`-resolution job as the Express/tRPC/GraphQL/Fastify examples' auth layer — Koa has no built-in auth or routing at all, the leanest core of any framework covered so far (even leaner than Express: no router, no body parser, both are separate packages).
- **`koa-bodyparser`**, the community-standard body-parsing middleware — Koa's core deliberately ships with none.
- **Zod for validation** (`src/validators.ts`), called manually via `.safeParse()` — same shape as Express/tRPC/GraphQL/Fastify. Koa has no framework-native validation layer to choose instead of Zod (unlike Hapi's own Joi), so this example reverts to Zod after Hapi's deliberate Joi detour.
- **`@hapi/boom`-style errors via `ctx.throw(status, message)`** — Koa's own built-in error-throwing helper, which sets `ctx.status`/`ctx.body` and throws in one call. Typed to return `never` in `@types/koa`.
- **`supertest` against `app.callback()`** — Koa has no native in-process injection helper (unlike Fastify's `app.inject()` or Hapi's `server.inject()`); `app.callback()` returns a plain Node request listener, which is exactly what `supertest` (and every Express-family test) already knows how to drive. This makes Koa's testing story closer to Express's than to Fastify's or Hapi's.
- Jest (the doctrine's default)

## A real finding: `ctx.throw()`'s `never` return type doesn't narrow control flow when the callback parameter's type is left inferred

The very first `tsc --noEmit` pass on the auth middleware failed with `'header' is possibly 'undefined'` immediately after a guard clause that called `ctx.throw(401, ...)` — even though `@types/koa` types `ctx.throw()` as returning `never`, which should make TypeScript treat any code after an unconditional call to it as unreachable (the same mechanism that let every Boom-based `throw Boom.notFound()` call in the Hapi example narrow cleanly).

**Root cause, isolated with a minimal reproduction**: the narrowing works fine when the middleware's `ctx` parameter is explicitly typed (`(ctx: Koa.Context, next) => {...}`), but silently stops working when the parameter type is left to be inferred from `app.use(...)`'s own overloaded signature. The inferred type is structurally equivalent but isn't the same type TypeScript's control-flow analysis anchors the `never`-narrowing to — a case where two "equal enough" types produce different levels of inference precision.

**Fix**: explicitly annotate every middleware and route-handler `ctx` parameter with its real type (`AppContext = Koa.ParameterizedContext<AppState>` for `app.use`, `AppRouterContext = RouterContext<AppState>` from `@koa/router` for `router.get`/`.post`/etc.), rather than relying on inference:

```ts
app.use(async (ctx: AppContext, next) => { ... })
router.get('/articles', (ctx: AppRouterContext) => { ... })
```

**Practical implication**: `never`-typed guard functions (`ctx.throw()`, `assert()`-style helpers, etc.) are a normal and useful pattern for control-flow narrowing in this doctrine's other examples — but this only reliably works when the surrounding function's parameters are explicitly typed. Don't assume a inferred callback parameter carries the same narrowing precision as an annotated one; if a `never`-typed throw isn't narrowing as expected, try an explicit type annotation on the enclosing function's parameters before adding non-null assertions or restructuring the guard logic.

## A real finding: `@koa/router` also ships its own bundled types now

Following the exact same check applied in the Hapi example, `@koa/router`'s own `package.json` `types` field points at its own `dist/index.d.ts` — the separately-installed `@types/koa__router` package is redundant. Removed via `npm uninstall @types/koa__router`. **`koa` itself does not bundle its own types** (its `package.json` has no `types`/`typings` field) — `@types/koa` is still required. This is a useful reminder that the "does this package bundle its own types now" question has to be checked per-package, even within the same small dependency graph — Koa and its own official router package have made different choices.

## Cross-framework comparison point: validation-failure status code

This project's handlers call `ctx.throw(422, ...)` explicitly on a failed `.safeParse()`, matching the Express/Fastify convention (developer-chosen 422) rather than Hapi's native-Joi 400 default or GraphQL's always-200. Since Koa has no built-in validation layer at all, there is no framework default to discover here — the status code is entirely the project's own choice, unlike Hapi where it was Joi's actual default behavior.

## Authorization: the persona matrix over `supertest`

`articlePolicy`/`commentPolicy` are the same plain-function shape used in every prior example. `test/functional/articlesPermission.spec.ts` mints a real JWT per persona (`tokenFor(user)`) and drives every request through `supertest(app.callback())`, weighted on the refused cells (outsider-author, plain-member, guest) per Step 5.2. `test/unit/articlePolicy.spec.ts` (9 cases) exercises the policy functions directly.

## Validation

`test/functional/articlesValidation.spec.ts` — 7 cases (missing title, missing body, non-string title, non-boolean `isPrivate`, an undeclared field rejected via Zod's `.strict()`, a valid full payload, a valid partial update), all asserting **422** — the project's own explicit choice, not a framework default.

## Isolation

- `createDb()`/`createApp(db)` create a fresh in-memory store and a fresh Koa app per test (`beforeEach`) — same pattern as every prior example.
- Since this example drives requests through `supertest` (a real Node HTTP request/response cycle over `app.callback()`, the same mechanism Express uses), the scheduling suite needed the same `doNotFake` fix already established for tRPC/GraphQL's real-socket clients — confirmed by running it, not assumed. This is the fourth confirmation of the same underlying hazard (real socket: tRPC, GraphQL, Koa via supertest; native in-process injector: Fastify, Hapi), reinforcing that it applies to essentially any Node HTTP test harness, framework-agnostic.
- The notification test uses Jest's native `jest.spyOn`, same as every prior example.

## Honest scope

This example doesn't exercise:
- **Koa's own middleware composition edge cases** (e.g. `koa-compose` internals, error-middleware ordering beyond the single auth middleware used here) — the project has a flat middleware stack, so there's no dedicated case for nested/branching middleware chains
- **Data integrity** and **multi-role aggregation** — same open gap flagged in all seven prior worked examples

## Reproduction

```bash
cd back-js-koa-demo
npx tsc --noEmit
npx eslint 'src/**/*.ts' 'test/**/*.ts'
npx jest
npx jest --coverage --collectCoverageFrom='src/**/*.ts' --coverageThreshold='{"global":{"lines":80}}'
```

No Docker needed — native Node 18.
