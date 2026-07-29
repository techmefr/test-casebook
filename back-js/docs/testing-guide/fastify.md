# Worked example — Fastify

Same scenario as the [NestJS](nestjs.md), [AdonisJS](adonisjs.md), [Express](express.md), [tRPC](trpc.md), and [GraphQL](graphql.md) worked examples: a blog-style Article API with roles (admin/author/member), a private-article visibility rule, scheduled publishing, and comments that notify the article's owner — this time on Fastify, using its own request-lifecycle hooks and native testing tool instead of Express-style middleware or a real HTTP client.

## Result

**47/47 tests green** (9 unit + 38 functional), `tsc --noEmit` clean under `strict: true`, ESLint clean, **98.29% line coverage** — well above the 80% floor.

## The stack, as actually built

- **Fastify v5**, with a hand-rolled `onRequest` hook (`src/app.ts`) doing the same JWT-verification-and-`request.user`-resolution job as the Express/tRPC/GraphQL examples' auth layer — Fastify has no built-in auth, same as every framework-less example in this doctrine.
- **`app.decorateRequest('user', null)` + a `declare module 'fastify'` augmentation** to add a typed `user: User | null` property to `FastifyRequest` — Fastify's documented, type-safe way to extend the request object, the direct counterpart of the Express example's `AuthedRequest extends Request` interface.
- **Zod for validation** (`src/validators.ts`), called manually inside route handlers via `.safeParse()` — same shape as the Express example. Fastify does have its own built-in JSON-Schema/Ajv-based route validation (the `schema` option on route definitions), but a real project using Zod-in-handler (rather than converting Zod schemas to JSON Schema) is common enough that this example represents that choice explicitly, the same way the Express example represents a project that chose Zod over `class-validator`.
- **Plain `Error` objects with a `.statusCode` property**, thrown from route handlers — Fastify's default error handler reads `error.statusCode` if present and uses it as the HTTP response status, with no custom error handler needed. This is a real, useful convention worth confirming by reading Fastify's own default-error-handler behavior rather than assuming a `reply.code(...).send(...)` call is required for every error path.
- **`app.inject()`**, Fastify's own built-in testing tool (via `light-my-request` under the hood) — simulates a full request/response cycle **without opening a real network socket**, similar in spirit to `supertest`'s in-process request injection but native to the framework, no separate dependency needed.
- Jest (the doctrine's default)

## A real finding: even `app.inject()` isn't safe under blanket fake timers

The scheduling test initially used the same `jest.useFakeTimers({ advanceTimers: false })` call that worked fine in the Express worked example (which also uses in-process request injection, via `supertest`). **Every test in the file timed out after 5000ms.** This was surprising: `app.inject()` is documented as not touching the real network stack, so the tRPC/GraphQL worked examples' "real socket + fake timers hang" finding shouldn't apply here — and yet it did.

**Root cause**: Fastify's own internal request lifecycle (built on `avvio` for plugin/hook boot sequencing, plus its own async lifecycle machinery) schedules some of its internal bookkeeping through the same global timer functions (`setImmediate`, `process.nextTick`-adjacent scheduling, etc.) that Jest's blanket `useFakeTimers()` replaces — even though no real socket is ever opened. **The tRPC/GraphQL finding's actual scope is broader than "real socket": it's "any test harness whose async plumbing depends on real timer functions," and Fastify's `inject()` qualifies even though it isn't a network client.**

**Fix**: the identical `doNotFake` list used in the tRPC and GraphQL worked examples:

```ts
jest.useFakeTimers({
  doNotFake: [
    'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval',
    'setImmediate', 'clearImmediate', 'nextTick', 'hrtime',
    'performance', 'queueMicrotask',
  ],
})
```

**Practical implication for applying this doctrine to any new JS backend framework**: don't assume a framework's own "fast, in-process" test helper is safe from this hazard just because it avoids a real socket. If a scheduling/isolation test using `jest.useFakeTimers()` hangs, the `doNotFake` fix is the first thing to try, regardless of whether the test drives the app through a real HTTP client or the framework's own injection helper.

## Cross-framework comparison point: error-to-status-code convention

This example's `notFound()`/`forbidden()`/`requireUser()` helpers throw a plain `Error` with a `.statusCode` property, relying entirely on Fastify's default error handler to translate that into the HTTP response — no `reply.code(...)` call in those paths at all. This differs from every other example in this doctrine: Nest needs an explicit `HttpException`, Adonis needs Bouncer's `allows()`/`denies()` translated by the controller, Express/tRPC/GraphQL all call an explicit status-setting method (`reply.code()`/`res.status()`/throwing a `TRPCError`/`GraphQLError` with an explicit code). **Fastify's convention is the most implicit of the six** — worth flagging explicitly in a project's own test/doc so a future contributor doesn't assume every error path needs a manual status call.

## Authorization: the persona matrix over `app.inject()`

`articlePolicy`/`commentPolicy` are the same plain-function shape used in the Express, tRPC, and GraphQL examples. `test/functional/articlesPermission.spec.ts` mints a real JWT per persona (`tokenFor(user)`) and drives every request through `app.inject({ method, url, headers, payload })`, weighted on the refused cells (outsider-author, plain-member, guest) per Step 5.2. `test/unit/articlePolicy.spec.ts` (9 cases) exercises the policy functions directly.

## Validation

`test/functional/articlesValidation.spec.ts` — 7 cases (missing title, missing body, non-string title, non-boolean `isPrivate`, an undeclared field rejected via Zod's `.strict()`, a valid full payload, a valid partial update), all asserting **422** — matching the Express and Adonis examples' convention, a project-level choice read from the actual handler code, not assumed.

## Isolation

- `createDb()`/`createApp(db)` create a fresh in-memory store and a fresh Fastify instance per test (`beforeEach`) — same pattern as every prior example.
- The scheduling test's `doNotFake` fix (above) is the headline isolation-mechanics finding for this example.
- The notification test uses Jest's native `jest.spyOn`, same as every prior example.

## Honest scope

This example doesn't exercise:
- **Fastify's built-in JSON-Schema route validation** (the `schema` option) — this project deliberately chose manual Zod validation instead, so there's no dedicated case for the schema-option path
- **Data integrity** and **multi-role aggregation** — same open gap flagged in all five prior worked examples

## Reproduction

```bash
cd back-js-fastify-demo
npx tsc --noEmit
npx eslint 'src/**/*.ts' 'test/**/*.ts'
npx jest
npx jest --coverage --collectCoverageFrom='src/**/*.ts' --coverageThreshold='{"global":{"lines":80}}'
```

No Docker needed — native Node 18.
