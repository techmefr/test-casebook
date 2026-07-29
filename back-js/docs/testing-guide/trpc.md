# Worked example — tRPC

Same scenario as the [NestJS](nestjs.md), [AdonisJS](adonisjs.md), and [Express](express.md) worked examples: a blog-style Article API with roles (admin/author/member), a private-article visibility rule, scheduled publishing, and comments that notify the article's owner — this time as tRPC procedures over an Express HTTP adapter, with end-to-end type inference from server to client instead of a REST/JSON contract.

## Result

**48/48 tests green** (9 unit + 39 functional), `tsc --noEmit` clean under `strict: true`, ESLint clean, **100% line coverage / 97.05% statement coverage** — well above the 80% floor.

## The stack, as actually built

tRPC has no scaffolding CLI — a project wires it onto whatever HTTP layer it already uses. This example used:

- `@trpc/server` (routers, procedures, middleware) mounted via `@trpc/server/adapters/express`'s `createExpressMiddleware`, on a plain Express app (`src/app.ts`)
- **Zod for input validation** (`src/validators.ts`) — tRPC's `.input(schema)` is Zod-shaped by convention, not a hard requirement, but Zod is the overwhelming majority convention in real tRPC projects
- A hand-rolled `createContext` (`src/context.ts`) that reads the `Authorization` header, verifies a `jsonwebtoken` bearer token, and resolves `ctx.user: User | null` — tRPC has no built-in auth, same as plain Express
- A `protectedProcedure` middleware (`src/trpc.ts`) that throws `TRPCError({ code: 'UNAUTHORIZED' })` when `ctx.user` is null, narrowing `ctx.user` to non-null for every procedure built on top of it — the tRPC-idiomatic equivalent of a Nest Guard or an Express `authenticate()` middleware
- **`@trpc/client`'s `httpBatchLink`**, not `supertest`, used to drive the persona matrix through a real HTTP round-trip against a real `http.createServer(app).listen(0)` instance (`test/testServer.ts`) — see "Driving the gate through a real request" below
- Jest (the doctrine's default) + `ts-jest`

## Two ways to test a tRPC procedure — and why this example uses the HTTP one

tRPC's own idiomatic unit-testing pattern is `appRouter.createCaller(ctx)` — calling a procedure directly in-process with a hand-built context, no HTTP at all. It's fast and is the pattern tRPC's own docs lead with. **This example does not use it for the persona matrix**, and that's a deliberate doctrine choice, not an oversight: the doctrine's Step 5.2 requires driving permission-gated units through **a real request**, because a caller-based test that hand-builds `ctx.user` is exactly as circular as unit-testing a Guard by calling it directly — it proves the procedure's own logic works, not that a real client's token actually resolves to the right user through the real `createContext`. `test/testServer.ts` spins a genuine `http.createServer`, and every functional test drives it through `@trpc/client`'s `httpBatchLink`, exercising the JWT verification and context construction exactly as a production client would. Unit tests (`test/unit/articlePolicy.spec.ts`) still call the policy functions directly — that's the correct scope for a unit test, same as the other three worked examples.

## Real bugs found by actually running the suite

### 1. Jest's fake timers hang a real in-process HTTP round-trip

The scheduling test (`test/functional/articlesScheduling.spec.ts`) needs to freeze/advance the clock the same way the Nest/Adonis/Express examples do. The first attempt used the same `jest.useFakeTimers({ advanceTimers: false })` call that worked fine in Express — every test in that file **timed out after 5000ms**, even the ones with no time-travel assertion at all. Root cause: this project's functional tests spin a real `http.createServer` and drive it via `fetch` (through `httpBatchLink`) in the *same process* as the test — Jest's modern fake timers replace the global timer functions (`setTimeout`, `setImmediate`, etc.) that Node's own HTTP/net stack relies on internally to drive socket I/O, so the request's underlying callbacks never fire and the `await` never resolves. This never showed up in Express or Adonis because those examples used `supertest`, which invokes the Express app's request handler in-process without opening a real socket — no timer-dependent I/O layer sits in between.

**Fix**: only fake `Date`, not the timer functions, by passing `doNotFake`:

```ts
jest.useFakeTimers({
  doNotFake: [
    'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval',
    'setImmediate', 'clearImmediate', 'nextTick', 'hrtime',
    'performance', 'queueMicrotask',
  ],
})
```

This freezes `new Date()`/`Date.now()` (what the scheduling logic and JWT expiry checks actually read) while leaving the real timer/socket machinery alone. **This is the direct, real-HTTP-in-process counterpart of the doctrine's existing "don't fake more than you need to" caution** — any testing setup that opens a real socket in the same process as a faked clock needs this same care, not just tRPC projects specifically.

### 2. `jsonwebtoken`'s `sub` claim, same typing gotcha as Express

Same root cause as the Express worked example: `JwtPayload.sub` is `string | undefined`, not `number`. Fixed identically — sign `{ sub: String(user.id) }`, compare `String(u.id) === payload.sub` on lookup.

## Cross-framework doctrine comparison points

- **tRPC's Zod validation failures surface as `TRPCError({ code: 'BAD_REQUEST' })` automatically** — no manual `safeParse` call needed in the procedure body, tRPC's `.input()` wrapper does it. This differs from every prior example in this doctrine (Nest's `ValidationPipe` returns 400 too, but Adonis's VineJS and this doctrine's own Express example both chose 422) — another real data point that there's no universal validation-failure convention across the JS backend ecosystem; read what the actual library does.
- **Errors are typed, not just status-coded.** A tRPC client catches a `TRPCClientError` with a `.data.code` (`'FORBIDDEN'`, `'NOT_FOUND'`, `'UNAUTHORIZED'`, `'BAD_REQUEST'`, …) and a `.data.httpStatus` — tests in this example assert on `.data.code` rather than a raw HTTP status, since that's the actual contract a tRPC client consumes; a REST-style assertion on `response.status` would be testing the HTTP transport, not the API's real contract.
- **No built-in role/policy library, same as Express.** `articlePolicy`/`commentPolicy` are the identical plain-function shape used in the Express worked example, called directly from procedure bodies instead of route handlers — the persona-matrix and policy-testing approach transfers unchanged regardless of which HTTP layer wraps the procedures.

## Authorization: the persona matrix over `httpBatchLink`

`test/functional/articlesPermission.spec.ts` mints a real JWT per persona via `tokenFor(user)` and builds a fresh `@trpc/client` instance per persona (`server.clientFor(token)`), then calls the actual procedure (`.articles.byId.query(...)`, `.articles.create.mutate(...)`, etc.) — weighted on the refused cells (outsider-author, plain-member, guest) exactly as the doctrine's Step 5.2 requires. `test/unit/articlePolicy.spec.ts` (9 cases) exercises the policy functions directly for the branch matrix (public/private/scheduled visibility, owner/admin/outsider).

## Isolation

- `createDb()` returns a fresh in-memory store; every test file's `beforeEach` creates a new one and a new `http.createServer` bound to an ephemeral port (`.listen(0)`), torn down in `afterEach` via `server.close()` — no shared state or lingering listening sockets across tests.
- The scheduling test's fake-timer fix (above) is itself an isolation-mechanics finding, not just a workaround.
- `test/functional/comments.spec.ts`'s notification test uses Jest's native `jest.spyOn(notificationService, 'notify')`, same pattern as the Express example.

## Honest scope

This example doesn't exercise:
- **Subscriptions** (tRPC's third procedure type, alongside query/mutation) — this scenario has no real-time requirement
- **Data integrity** and **multi-role aggregation** — same open gap flagged in all three prior worked examples

## Reproduction

```bash
cd back-js-trpc-demo
npx tsc --noEmit
npx eslint 'src/**/*.ts' 'test/**/*.ts'
npx jest
npx jest --coverage --collectCoverageFrom='src/**/*.ts' --coverageThreshold='{"global":{"lines":80}}'
```

No Docker needed — native Node 18, `@trpc/server`/`@trpc/client` v10 (pinned together; their peer-dependency ranges must match exactly), TypeScript pinned to 5.x since `ts-jest`'s current peer range does not yet support TypeScript 7.
