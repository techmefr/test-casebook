# Worked example — Hapi

Same scenario as the [NestJS](nestjs.md), [AdonisJS](adonisjs.md), [Express](express.md), [tRPC](trpc.md), [GraphQL](graphql.md), and [Fastify](fastify.md) worked examples: a blog-style Article API with roles (admin/author/member), a private-article visibility rule, scheduled publishing, and comments that notify the article's owner — this time on Hapi, using its native auth-strategy abstraction and Joi validation instead of a middleware/hook pattern.

## Result

**47/47 tests green** (9 unit + 38 functional), `tsc --noEmit` clean under `strict: true`, ESLint clean, **100% line coverage** — well above the 80% floor.

## The stack, as actually built

- **Hapi v21** (`@hapi/hapi@21.4.10`), with authentication expressed through Hapi's own first-class abstraction: `server.auth.scheme('jwt-bearer', () => ({ authenticate(request, h) {...} }))`, registered via `server.auth.strategy('jwt', 'jwt-bearer')` and applied server-wide via `server.auth.default('jwt')`. This is a structurally different shape from every prior example in this doctrine — Express/tRPC/GraphQL/Fastify all verify the JWT in a hook or middleware function that mutates the request; Hapi instead has a dedicated auth-scheme/strategy layer that the framework itself invokes before any route handler runs, and failures from `authenticate()` are translated to a 401 automatically.
- **`@hapi/boom`** for HTTP errors (`Boom.unauthorized()`, `Boom.forbidden()`, `Boom.notFound()`) — thrown directly from route handlers or the auth scheme, translated to the right status code with no manual `.code()` call needed for error paths.
- **Joi for validation** (`src/validators.ts`), wired as a first-class route option (`options: { validate: { payload: createArticleInput } }`) rather than called manually inside the handler body. This is deliberate: every prior example used Zod, called explicitly via `.safeParse()`/`.parse()` — Hapi ships with, and is built by the same team as, Joi, and using it as a route option rather than a manual in-handler call represents Hapi's own idiomatic default, not an equivalent-but-different choice of validation library.
- **`server.inject()`**, Hapi's own native in-process testing tool — returns a `Response` whose body is a raw `payload` string (not a parsed object or a `.json()` helper like Fastify's `inject()`), so every functional test does `JSON.parse(response.payload)` explicitly.
- Jest (the doctrine's default)

## A real finding: `@hapi/hapi` now ships its own bundled types

The project initially installed `@types/hapi__hapi` out of habit (every prior example needed a separate `@types/*` package). `tsc --noEmit` compiled, but inspecting `node_modules/@hapi/hapi/package.json` showed the package's own `types` field pointing at its own `lib/index.d.ts` — and the installed `@types/hapi__hapi` stub was labeled `// Type definitions for @hapi/hapi 20.0`, one major version behind the installed `21.4.10`. **`@hapi/hapi` transitioned from relying on DefinitelyTyped to shipping its own bundled types**, and the separately-installed stub is not just redundant but actively stale. Fixed by `npm uninstall @types/hapi__hapi` — TypeScript falls back to the package's own bundled `.d.ts` with no config change needed.

**Practical implication**: when adding a new dependency to any project, don't assume `@types/<package>` is required just because older ecosystem habits say so — check the package's own `package.json` `types`/`typings` field first. A stale DefinitelyTyped stub sitting alongside a newer self-typed package version can silently mask real type errors or introduce fake ones.

## A real finding: `request.headers.authorization` is typed as `{}` under `strict: true`

Reading `request.headers.authorization` directly in the auth scheme (`request.headers.authorization.startsWith('Bearer ')`) failed `tsc --noEmit` with `TS2339: Property 'startsWith' does not exist on type '{}'`. Hapi's own bundled types type `request.headers` loosely enough that indexed property access resolves to `{}` rather than `string | string[] | undefined`. **Fix**: an explicit cast, `const header = request.headers.authorization as string | undefined`, matching the same "read the framework's actual types, don't assume a natural-looking property access will just work" principle already documented for the `jsonwebtoken` `sub`-is-a-string gotcha in the Express/tRPC examples.

## A real finding: `server.inject()` hangs under blanket fake timers too

Following the Fastify finding (`app.inject()` hangs under `jest.useFakeTimers()` with no `doNotFake` list, despite never opening a real socket), this was tested empirically here rather than assumed: a throwaway test called `jest.useFakeTimers()` with no `doNotFake` list and drove a request through `server.inject()`. **It timed out after 8000ms**, confirming the same hazard applies to Hapi's own native in-process injection tool. This reinforces that the underlying cause is not "the test opens a real socket" (true for tRPC/GraphQL) or "framework-specific to Fastify" — it's that a framework's own internal async lifecycle machinery (Hapi's own boot/dispatch sequencing, same as Fastify's `avvio`-based one) depends on real timer functions that a blanket `jest.useFakeTimers()` replaces. The fix applied to the real scheduling suite is the same `doNotFake` list used in every prior example:

```ts
jest.useFakeTimers({
  doNotFake: [
    'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval',
    'setImmediate', 'clearImmediate', 'nextTick', 'hrtime',
    'performance', 'queueMicrotask',
  ],
})
```

**Three-framework confirmation**: this hazard has now been independently verified against a real socket client (tRPC's `httpBatchLink`, GraphQL's `fetch`), and two different frameworks' own native in-process injection helpers (Fastify's `app.inject()`, Hapi's `server.inject()`). At this point the doctrine's `AGENTS.md` note can treat "any Node HTTP-adjacent test harness" as in scope for this hazard by default, rather than a framework-by-framework surprise.

## Cross-framework comparison point: validation-failure status code

Hapi's own default Joi-validation-failure behavior was read from the actual test run rather than assumed: a payload failing the route's `options.validate.payload` schema returns **400 Bad Request** (a Boom-formatted error body), matching the Express/tRPC/Fastify convention (all 400/422-family, developer-chosen) rather than GraphQL's always-200-with-`errors[]` convention.

## Authorization: the persona matrix over `server.inject()`

`articlePolicy`/`commentPolicy` are the same plain-function shape used in every prior example. `test/functional/articlesPermission.spec.ts` mints a real JWT per persona (`tokenFor(user)`) and drives every request through `server.inject({ method, url, headers, payload })`, weighted on the refused cells (outsider-author, plain-member, guest) per Step 5.2. `test/unit/articlePolicy.spec.ts` (9 cases) exercises the policy functions directly.

## Validation

`test/functional/articlesValidation.spec.ts` — 7 cases (missing title, missing body, non-string title, non-boolean `isPrivate`, an undeclared field rejected via Joi's `allowUnknown: false`, a valid full payload, a valid partial update), all asserting **400** — Hapi's actual default, confirmed by running the tests rather than assumed from another framework's convention.

## Isolation

- `createDb()`/`createApp(db)` create a fresh in-memory store and a fresh Hapi server per test (`beforeEach`) — same pattern as every prior example.
- The scheduling test's `doNotFake` fix (above) is the headline isolation-mechanics finding for this example, now confirmed for a second framework's native injection helper.
- The notification test uses Jest's native `jest.spyOn`, same as every prior example.

## Honest scope

This example doesn't exercise:
- **Hapi's plugin system** (`server.register()`) — this project is a single flat server with no plugin decomposition, so there's no dedicated case for plugin-boundary auth or validation
- **Data integrity** and **multi-role aggregation** — same open gap flagged in all six prior worked examples

## Reproduction

```bash
cd back-js-hapi-demo
npx tsc --noEmit
npx eslint 'src/**/*.ts' 'test/**/*.ts'
npx jest
npx jest --coverage --collectCoverageFrom='src/**/*.ts' --coverageThreshold='{"global":{"lines":80}}'
```

No Docker needed — native Node 18.
