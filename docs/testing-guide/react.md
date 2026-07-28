# React + Vitest Testing Guide

> Ready-to-use snippets for testing your React applications with Vitest and React Testing Library

**Status**: Piloted on a React + .NET production template

This is the React counterpart of the [Nuxt guide](./README.md). The doctrine is identical — `data-test-*` selectors, exhaustive case plans in `task-test.md`, isolated deterministic tests — only the tooling changes. Read `AGENTS.md` first; this guide is the cookbook, not the playbook.

---

## Basic Configuration

### Installation

```bash
npm install -D vitest @vitejs/plugin-react jsdom @vitest/coverage-v8 @testing-library/react @testing-library/user-event @testing-library/jest-dom msw
```

### vite.config.ts (test block)

```ts
test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
        provider: 'v8',
        reporter: ['text', 'html'],
        include: ['src/**', 'lib/**'],
        exclude: ['**/*.test.*', 'src/test/**'],
        thresholds: { lines: 90, branches: 90, functions: 90, statements: 90 },
    },
},
```

### src/test/setup.ts

```ts
import '@testing-library/jest-dom'
import { afterEach } from 'vitest'
import { cleanup, configure } from '@testing-library/react'

configure({ testIdAttribute: 'data-test-id' })

afterEach(() => {
    cleanup()
})
```

Without the `configure` line, `getByTestId` looks for `data-testid` and every snippet below silently fails — it is part of the infra, not an option.

### Selector lint gate

Wire the ESLint override from `AGENTS.md` Step 3 so `getByText`, `getByRole`, `querySelector`, `closest`, `toHaveClass` and friends are red in test files, and ban the app's real store module via `no-restricted-imports`. The infra is not done until a forbidden selector fails lint.

### src/test/utils.tsx — render helper and group query

```tsx
import { render } from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter } from 'react-router-dom'
import { configureStore } from '@reduxjs/toolkit'
import type { ReactElement } from 'react'
import userReducer, { initialUserState, type UserState } from '../store/userSlice'

type PreloadedState = { user?: Partial<UserState> }

export function makeTestStore(preloaded: PreloadedState = {}) {
    return configureStore({
        reducer: { user: userReducer },
        preloadedState: preloaded.user
            ? { user: { ...initialUserState, ...preloaded.user } }
            : undefined,
    })
}

export function renderWithProviders(
    ui: ReactElement,
    { preloaded, route = '/' }: { preloaded?: PreloadedState; route?: string } = {},
) {
    const store = makeTestStore(preloaded)
    const result = render(
        <Provider store={store}>
            <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
        </Provider>,
    )
    return { ...result, store }
}

export function getAllByTestClass(container: HTMLElement, name: string) {
    return Array.from(
        container.querySelectorAll<HTMLElement>(`[data-test-class="${name}"]`),
    )
}
```

Every test mounts through `renderWithProviders` with a **fresh, seeded store** — never the app's singleton store (`src/store/store`), which drags `redux-persist`, real middlewares and shared state into your tests. `getAllByTestClass` lives here, outside the lint override's scope, so group selection stays possible while `querySelector` stays banned in test files.

---

## Data Attributes Conventions

Same two attributes and naming rules as the Nuxt guide, written JSX-style:

```tsx
<button data-test-id="bon-form-submit">Envoyer</button>
<input data-test-id="bon-client-name-input" />
<div data-test-class="bon-piece-row">...</div>
```

Name by role, never by style or position. `env-attr-cleaner` strips them from `staging`/`production` builds.

---

## Core Cases

### Select and assert on a unique element

```tsx
renderWithProviders(<BonFormulaire />)
expect(screen.getByTestId('bon-form-submit')).toBeDisabled()
```

### Select and count a group

```tsx
const { container } = renderWithProviders(<BonFormulaire />)
const rows = getAllByTestClass(container, 'bon-piece-row')
expect(rows).toHaveLength(3)
```

### User interactions

```tsx
const user = userEvent.setup()
renderWithProviders(<LoginForm />)
await user.type(screen.getByTestId('login-email-input'), 'a@b.fr')
await user.click(screen.getByTestId('login-submit'))
expect(screen.getByTestId('login-error')).toHaveTextContent('Mot de passe requis')
```

### Assert a variant through state, not classes

Never `toHaveClass('bg-destructive')` — the Tailwind class is styling, not behaviour, and renames green-break your suite. Expose the state as a hook and assert on it:

```tsx
<div data-test-id="alert" data-test-state={variant}>...</div>
```

```tsx
expect(screen.getByTestId('alert')).toHaveAttribute('data-test-state', 'destructive')
```

### Mock the network with typed fixtures (MSW)

```ts
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import type { Intervention } from '../types/intervention'

const intervention: Intervention = {
    id: 12,
    clientName: 'Fitness Park',
    startDate: '2026-07-17T08:00:00Z',
    endDate: '2026-07-17T10:00:00Z',
}

export const server = setupServer(
    http.get('/Intervention/GetInterventionById/:id', () =>
        HttpResponse.json(intervention),
    ),
)
```

The fixture is typed from the real contract: a mock of a renamed endpoint or a drifted shape fails at type-check instead of greening a broken integration.

### Freeze time and test the exact boundary

```ts
beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-17T12:00:00Z'))
})

afterEach(() => {
    vi.useRealTimers()
})

it('keeps the intervention active 59 minutes after its end', () => { ... })
it('drops the intervention 61 minutes after its end', () => { ... })
```

A grace period tested only far from its threshold (30 minutes before, 3 hours after) still passes if the constant silently changes — the two boundary cases are the ones that pin it.

### Do not test the framework

A disabled native button never fires `onClick`; that is the DOM's contract, not your component's. Test the logic **you** wrote — the prop wiring, the state transition, the guard — or the case earns nothing.

### Permission-gated units

Same matrix as `AGENTS.md` Step 5.2: drive the permission state as an input (seed the store's permission list, mock the gate hook), cover authorized **and** refused, assert every enforcement layer through `data-test-*` hooks. The expected outcome comes from the plan, never from the app's own check.

---

## Table of Contents by Use Case

The Nuxt guide's [use-case catalogue](./README.md#table-of-contents-by-use-case) applies case-for-case; transpose the mounting (`renderWithProviders` instead of `mountSuspended`) and the interaction layer (`user-event` instead of `trigger`). Cases that prove React-specific enough to diverge get their own snippet here — propose them via Issue or PR, same template as the Nuxt guide.
