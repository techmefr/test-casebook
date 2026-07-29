# Worked example — GraphQL (Apollo Server)

Same scenario as the [NestJS](nestjs.md), [AdonisJS](adonisjs.md), [Express](express.md), and [tRPC](trpc.md) worked examples: a blog-style Article API with roles (admin/author/member), a private-article visibility rule, scheduled publishing, and comments that notify the article's owner — this time as an Apollo Server schema/resolver pair mounted on Express, queried over real HTTP with GraphQL operations instead of REST endpoints or RPC procedures.

## Result

**47/47 tests green** (9 unit + 38 functional), `tsc --noEmit` clean under `strict: true`, ESLint clean, **98.47% line coverage** — well above the 80% floor.

## The stack, as actually built

- **Apollo Server v4** (`@apollo/server`), mounted via its official `@apollo/server/express4` integration (`expressMiddleware`) on a plain Express app — **v5 dropped the Express integration package entirely** (only a `startStandaloneServer` export remains); this project pins v4 specifically because it needs to mount on Express the same way the Nest/Adonis/Express/tRPC examples do, not switch HTTP layers per framework. Read this from the actual package exports (`node -e "console.log(Object.keys(require('@apollo/server/package.json').exports))"`), not assumed from Apollo's docs, which still show v4-era examples by default.
- **A hand-rolled `createContext`** (`src/context.ts`), the same shape as the Express and tRPC examples: reads the `Authorization` header, verifies a `jsonwebtoken` bearer token, resolves `ctx.user: User | null`. GraphQL/Apollo has no built-in auth.
- **Zod for business-rule validation** (`src/validators.ts`) inside resolvers — GraphQL's own schema (`src/schema.ts`) already enforces *structural* validation (required fields, undeclared-field rejection) before a resolver ever runs; Zod only handles rules the schema's type system can't express (non-empty strings, ISO datetime format). See "GraphQL's two validation layers" below.
- Jest (the doctrine's default) + native `fetch` (Node 18) as the GraphQL client, no `graphql-request`/Apollo Client dependency needed for testing — a GraphQL request over HTTP is just a `POST` with a `{ query, variables }` JSON body.

## A real dependency-version trap: two versions of `@types/express` in the same graph

Type-checking `src/app.ts` initially failed with a wall of `TS2769: No overload matches this call` errors on `expressMiddleware(server, { context: ... })`, blaming incompatible `Request`/`Application` types. The root cause wasn't a code bug: `npm ls @types/express` showed **two different versions resolved simultaneously** — `@apollo/server`'s own dependency tree pulled in `@types/express@4.17.25` nested inside `node_modules/@apollo/server`, while this project's root `npm install -D @types/express` (no version pinned) resolved to `@types/express@5.0.6` at the top level. TypeScript treats these as two structurally-different `Request`/`Application` types even though they're "the same" package, so `expressMiddleware`'s signature (typed against the nested v4) rejected the app's own `Express` instance (typed against the root v5).

**Fix**: pin `@types/express@4` explicitly at the root so npm dedupes to a single copy matching what `@apollo/server` (and Apollo's own Express integration, which targets Express 4) expects. **This is the direct `@types/*` counterpart of the doctrine's existing "ORM major-version API drift is real" gotcha** — a duplicate-but-different-version type package produces the exact same category of confusing structural-mismatch error, and the fix is the same: read `npm ls <package>` to confirm there really are two copies, then pin the version the library you're integrating with actually expects.

## GraphQL's two validation layers — a genuine cross-framework finding

Every prior worked example in this doctrine (Nest's `ValidationPipe`, Adonis's VineJS, Express's Zod, tRPC's Zod) has **one** validation layer: a schema object checked against the request body. GraphQL has **two**, and this example's tests deliberately distinguish them:

1. **Schema-level (structural) validation**, enforced by GraphQL itself before any resolver code runs: a required field (`title: String!`) that's missing, or **an undeclared field on an input type** — both produce a `GRAPHQL_VALIDATION_FAILED`-class error at the request-validation stage. There is no `.strict()` equivalent to configure; it's inherent to GraphQL's type system. `test/functional/articlesValidation.spec.ts`'s "rejects a missing title" and "rejects an undeclared field" cases assert only that `result.errors` is defined and isn't a `FORBIDDEN`/business error — the exact error shape here is GraphQL's own, not this project's to control.
2. **Business-rule (value-level) validation**, which the schema's type system cannot express: `title: String!` accepts an empty string just fine per GraphQL's type rules, so rejecting `""` needs the same kind of value-level check as every other framework in this doctrine — done here with Zod inside the resolver, thrown as a `GraphQLError` with `extensions: { code: 'BAD_USER_INPUT' }`.

**When applying this doctrine to a GraphQL project, enumerate both layers as separate cases in `task-test.md`** (per Step 5.0bis's "optional-module cases" category) — a missing-required-field test only proves the schema works, not that the resolver's own business rules do.

## Errors: `extensions.code`, not HTTP status

Apollo Server always returns HTTP 200 for a GraphQL response, even one containing errors — the actual outcome lives in the response body's `errors[].extensions.code` (`UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `BAD_USER_INPUT`, all thrown as `GraphQLError`s with an explicit `extensions.code` in `src/resolvers.ts`). Every test in this example asserts on `.extensions.code`, never on the HTTP status — asserting `response.status === 200` on a request that logically failed would be meaningless. This mirrors the tRPC worked example's finding that a tRPC client's real contract is `.data.code`, not a raw status — **RPC-shaped protocols (tRPC, GraphQL) both put the real outcome in a typed error code inside a uniformly-200 envelope, unlike REST's convention of using the HTTP status itself.**

## Authorization: the persona matrix over real GraphQL operations

`articlePolicy`/`commentPolicy` are the same plain-function shape used in the Express and tRPC examples, called from resolvers. `test/functional/articlesPermission.spec.ts` mints a real JWT per persona (`tokenFor(user)`) and sends real GraphQL `query`/`mutation` documents over HTTP via `test/testServer.ts`'s `fetch`-based client, weighted on the refused cells (outsider-author, plain-member, guest) per Step 5.2. `test/unit/articlePolicy.spec.ts` (9 cases) exercises the policy functions directly.

## Isolation

- `createDb()`/`startTestServer(db)` create a fresh in-memory store and a fresh `http.createServer` per test (`beforeEach`), torn down in `afterEach` — identical pattern to the Express and tRPC examples.
- `test/functional/articlesScheduling.spec.ts` reuses the exact `doNotFake` fix discovered in the tRPC worked example (faking only `Date`, not the timer functions) — this test setup also opens a real socket in-process via `fetch`, so the same Jest-fake-timers-vs-real-socket hazard applies here unchanged. Confirming this fix transfers cleanly across two different libraries built on the same "real HTTP client in the same process" pattern is itself useful validation that the `AGENTS.md` Step 4 guidance is genuinely general, not tRPC-specific.
- The notification test uses Jest's native `jest.spyOn`, same as Express/tRPC.

## Honest scope

This example doesn't exercise:
- **GraphQL subscriptions** — this scenario has no real-time requirement
- **Field-level resolvers** (e.g. a computed `Article.commentCount` field with its own resolver) — every field in this schema is a plain data property, so there's no dedicated field-resolver-under-test case
- **Data integrity** and **multi-role aggregation** — same open gap flagged in all four prior worked examples

## Reproduction

```bash
cd back-js-graphql-demo
npx tsc --noEmit
npx eslint 'src/**/*.ts' 'test/**/*.ts'
npx jest
npx jest --coverage --collectCoverageFrom='src/**/*.ts' --coverageThreshold='{"global":{"lines":80}}'
```

No Docker needed — native Node 18. `@apollo/server` pinned to v4 (not v5, which dropped the Express integration) and `@types/express` pinned to v4 to match it exactly.
