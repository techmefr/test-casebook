
# Nuxt + Vitest Testing Guide

> Ready-to-use snippets for testing your Nuxt applications with Vitest

**Status**: Tested and validated in production

---

## Vision

This guide was created to **accelerate development** and improve **web application quality**. The objective is to provide ready-to-use snippets for all common use cases, allowing developers to:

- **Save time**: ready-to-use copy-paste snippets
- **Improve robustness**: better tested applications
- **Facilitate maintenance**: more maintainable code
- **Prevent regressions**: early bug detection
- **Simplify scaling**: industrializable approach

---

## Progressive Approach

This guide is part of a progressive testing approach:

1. **Phase 1: Nuxt + Vitest** (this guide)
2. **Phase 2: Next.js + Vitest** (coming soon)
3. **Phase 3: Debug & Troubleshooting** (coming soon)
4. **Phase 4: E2E Tests** (coming soon)

The idea is to start simple and progressively evolve towards more complex tests.

---

## How to Contribute

This guide is **community-driven**. If you have:
- A new use case to propose
- A correction to make
- An improvement to suggest

**Open an Issue or make a Pull Request!**

### Template for proposing a new case

```markdown
## Case Title

**When to use**: [One sentence description]

**Code**:
```js
// Your snippet here
```
```

---

## Basic Configuration

### Installation

```bash
npm install -D @nuxt/test-utils vitest @vue/test-utils happy-dom
```

### vitest.config.ts

```ts
import { defineVitestConfig } from '@nuxt/test-utils/config'

export default defineVitestConfig({
    test: {
        environment: 'nuxt',
        environmentOptions: {
            nuxt: {
                domEnvironment: 'happy-dom'
            }
        }
    }
})
```

### Basic imports

```js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountSuspended, mockNuxtImport, registerEndpoint } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
```

---

## Data Attributes Conventions

This guide uses a simple convention for selecting elements in tests:

### `data-test-id` - Unique identifier

Pattern: `domain-element-action?`

```html
<button data-test-id="user-form-submit">Submit</button>
<input data-test-id="product-name-input" />
```

### `data-test-class` - Element group

Pattern: `domain-category-type`

```html
<div data-test-class="product-table-row">...</div>
<input data-test-class="filter-input" />
```

### `data-test-state` - Component state

Values: `loading | error | success | empty | invalid | disabled | selected`

```html
<div data-test-state="loading">Loading...</div>
<form data-test-state="invalid">...</form>
```

---

## Table of Contents by Use Case

### Navigation & Routing
- [Navigate to a page](#nav-navigate-to-page)
- [Navigation with parameters](#nav-with-params)
- [Hierarchical navigation (breadcrumb)](#nav-breadcrumb)
- [Redirect middleware](#nav-middleware)

### Forms & Validation
- [Form with required field validation](#form-required-validation)
- [Form with backend errors](#form-backend-errors)
- [Form with submission](#form-submit)
- [Edit form with prefill](#form-edit-prefill)
- [Cancel form](#form-cancel)
- [Multi-step form](#form-multi-step)

### Tables & Lists
- [Table with data](#table-display-data)
- [Table with sorting](#table-sorting)
- [Table with filters](#table-filters)
- [Table with pagination](#table-pagination)
- [Table with multi-selection](#table-multi-select)
- [Table with loading](#table-loading)
- [Empty list](#table-empty-state)

### Modals & Dialogs
- [Open/close modal](#modal-open-close)
- [Modal with form](#modal-with-form)
- [Confirmation modal](#modal-confirmation)
- [Modal with dynamic content](#modal-dynamic-content)

### Permissions & Auth
- [Conditional display based on permissions](#auth-conditional-display)
- [Redirect if unauthorized](#auth-redirect)
- [Check multiple permissions](#auth-multiple-permissions)
- [Restricted action](#auth-restricted-action)

### API & Data Fetching
- [Component with useFetch](#api-use-fetch)
- [Component with $fetch](#api-dollar-fetch)
- [API error handling](#api-error-handling)
- [Retry on error](#api-retry)
- [Mock API endpoint](#api-mock-endpoint)

### States & Loading
- [Loading state](#state-loading)
- [Error state](#state-error)
- [Empty state (no data)](#state-empty)
- [Success state](#state-success)
- [State transitions](#state-transitions)

### User Interactions
- [Click button](#interaction-button-click)
- [Fill input field](#interaction-fill-input)
- [Select option](#interaction-select-option)
- [Check checkbox](#interaction-checkbox)
- [File upload](#interaction-file-upload)
- [Debounce on input](#interaction-debounce)
- [Drag & drop](#interaction-drag-drop)

### i18n & Translations
- [Check i18n keys](#i18n-check-keys)
- [Switch language](#i18n-switch-locale)
- [Translation with interpolation](#i18n-interpolation)
- [Plural translation](#i18n-plural)

### Utils & Helpers
- [Date formatter](#util-format-date)
- [File size formatter](#util-format-bytes)
- [Email validation](#util-validate-email)
- [IP validation](#util-validate-ip)
- [Data mapping](#util-data-mapping)
- [Group by key](#util-group-by)
- [Sort array](#util-sort-by)
- [Parse CSV](#util-parse-csv)

### Stores & State Management
- [Store: add item](#store-add-item)
- [Store: remove item](#store-remove-item)
- [Store: filter items](#store-filter-items)
- [Store: fetch data](#store-fetch-data)
- [Store: reset](#store-reset)

### Composables
- [Form composable](#composable-form)
- [API composable](#composable-api)
- [Permissions composable](#composable-permissions)
- [Notification composable](#composable-notification)

### Advanced Cases
- [Race conditions (concurrent requests)](#advanced-race-conditions)
- [CSV import with mapping](#advanced-csv-import)
- [Data export](#advanced-export-data)
- [Search with multiple filters](#advanced-multi-search)
- [Complete workflow (CRUD)](#advanced-crud-workflow)

### Vuetify & Components (without data attributes)
- [Testing component props](#vuetify-props)
- [Finding a Vuetify component (findComponent)](#vuetify-find-component)
- [Updating props (setProps)](#vuetify-set-props)
- [Testing emits](#vuetify-emits)
- [Testing slots](#vuetify-slots)
- [Disabled and loading state in Vuetify](#vuetify-disabled-loading)
- [Testing v-model](#vuetify-v-model)
- [VDialog and overlays](#vuetify-dialog)
- [VDataTable: items and headers](#vuetify-datatable)
- [CSS classes (classes())](#vuetify-classes)
- [HTML attributes (attributes())](#vuetify-attributes)

### Components with Teleport (Portals)
- [The teleported components problem](#teleport-problem)
- [Affected components](#teleport-components)
- [The method to apply](#teleport-method)
- [Complete example — VDialog with form](#teleport-example)

---

# Navigation & Routing

## <a name="nav-navigate-to-page"></a>Navigate to a page

**When to use**: Verify that clicking a link or button triggers navigation to the correct page.

```js
test('navigates to user detail page', async () => {
    const routerPush = vi.fn()

    mockNuxtImport('useRouter', () => {
        return () => ({
            push: routerPush
        })
    })

    const wrapper = await mountSuspended(UserCard, {
        props: { user: { id: 123, name: 'John Doe' } }
    })

    await wrapper.find('[data-test-id="view-details-btn"]').trigger('click')

    expect(routerPush).toHaveBeenCalledWith('/users/123')
})
```

---

## <a name="nav-with-params"></a>Navigation with parameters

**When to use**: Verify that a page correctly receives and uses route parameters.

```js
test('displays user from route params', async () => {
    mockNuxtImport('useRoute', () => {
        return () => ({
            params: { id: '123' }
        })
    })

    mockNuxtImport('useFetch', () => {
        return () => ({
            data: ref({ id: 123, name: 'John Doe' }),
            pending: ref(false),
            error: ref(null)
        })
    })

    const wrapper = await mountSuspended(UserDetailPage)

    expect(wrapper.find('[data-test-id="user-name"]').text()).toBe('John Doe')
})
```

---

## <a name="nav-breadcrumb"></a>Hierarchical navigation (breadcrumb)

**When to use**: Verify that breadcrumb navigation correctly displays the navigation hierarchy.

```js
test('displays breadcrumb navigation', async () => {
    mockNuxtImport('useRoute', () => {
        return () => ({
            path: '/products/electronics/smartphones/iphone',
            matched: [
                { path: '/products', name: 'Products' },
                { path: '/products/electronics', name: 'Electronics' },
                { path: '/products/electronics/smartphones', name: 'Smartphones' }
            ]
        })
    })

    const wrapper = await mountSuspended(Breadcrumb)

    const items = wrapper.findAll('[data-test-class="breadcrumb-item"]')
    expect(items).toHaveLength(3)
    expect(items[0].text()).toBe('Products')
    expect(items[2].text()).toBe('Smartphones')
})
```

---

## <a name="nav-middleware"></a>Redirect middleware

**When to use**: Verify that middleware correctly redirects based on conditions (auth, permissions, etc.).

```js
test('middleware redirects unauthenticated users', async () => {
    const mockNavigateTo = vi.fn()

    mockNuxtImport('navigateTo', () => mockNavigateTo)
    mockNuxtImport('useAuth', () => {
        return () => ({
            isAuthenticated: ref(false)
        })
    })

    const { default: authMiddleware } = await import('~/middleware/auth.ts')

    await authMiddleware()

    expect(mockNavigateTo).toHaveBeenCalledWith('/login')
})
```

---

# Forms & Validation

## <a name="form-required-validation"></a>Form with required field validation

**When to use**: Verify that a form prevents submission if required fields are empty.

```js
test('validates required fields before submit', async () => {
    const wrapper = await mountSuspended(UserForm)

    await wrapper.find('[data-test-id="user-form-submit"]').trigger('click')

    expect(wrapper.find('[data-test-id="name-error"]').exists()).toBe(true)
    expect(wrapper.find('[data-test-id="name-error"]').text()).toBe('Name is required')
    expect(wrapper.find('[data-test-state="invalid"]').exists()).toBe(true)

    await wrapper.find('[data-test-id="user-form-name"]').setValue('John Doe')

    expect(wrapper.find('[data-test-id="name-error"]').exists()).toBe(false)
    expect(wrapper.find('[data-test-state="invalid"]').exists()).toBe(false)
})
```

---

## <a name="form-backend-errors"></a>Form with backend errors

**When to use**: Verify that a form correctly displays errors returned by the API.

```js
test('displays backend validation errors', async () => {
    registerEndpoint('/api/users', {
        method: 'POST',
        handler: () => {
            throw createError({
                statusCode: 422,
                data: {
                    errors: {
                        email: 'Email already exists'
                    }
                }
            })
        }
    })

    const wrapper = await mountSuspended(UserForm)

    await wrapper.find('[data-test-id="user-form-name"]').setValue('John Doe')
    await wrapper.find('[data-test-id="user-form-email"]').setValue('john@example.com')
    await wrapper.find('[data-test-id="user-form-submit"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-test-id="email-error"]').text()).toBe('Email already exists')
})
```

---

## <a name="form-submit"></a>Form with submission

**When to use**: Verify that a form correctly submits data and shows confirmation.

```js
test('submits form data successfully', async () => {
    const mockCreate = vi.fn().mockResolvedValue({ id: 123 })

    registerEndpoint('/api/users', {
        method: 'POST',
        handler: () => mockCreate()
    })

    const wrapper = await mountSuspended(UserForm)

    await wrapper.find('[data-test-id="user-form-name"]').setValue('John Doe')
    await wrapper.find('[data-test-id="user-form-email"]').setValue('john@example.com')
    await wrapper.find('[data-test-id="user-form-submit"]').trigger('click')

    expect(wrapper.find('[data-test-state="loading"]').exists()).toBe(true)

    await flushPromises()

    expect(wrapper.find('[data-test-id="success-message"]').exists()).toBe(true)
    expect(wrapper.find('[data-test-id="success-message"]').text()).toContain('User created')
})
```

---

## <a name="form-edit-prefill"></a>Edit form with prefill

**When to use**: Verify that an edit form loads and correctly displays existing data.

```js
test('prefills form with existing data', async () => {
    mockNuxtImport('useFetch', () => {
        return () => ({
            data: ref({
                id: 123,
                name: 'John Doe',
                email: 'john@example.com'
            }),
            pending: ref(false),
            error: ref(null)
        })
    })

    const wrapper = await mountSuspended(UserEditForm)

    expect(wrapper.find('[data-test-id="user-form-name"]').element.value).toBe('John Doe')
    expect(wrapper.find('[data-test-id="user-form-email"]').element.value).toBe('john@example.com')
})
```

---

## <a name="form-cancel"></a>Cancel form

**When to use**: Verify that a cancel button abandons changes and redirects the user.

```js
test('cancels form without saving', async () => {
    const routerPush = vi.fn()

    mockNuxtImport('useRouter', () => {
        return () => ({ push: routerPush })
    })

    const wrapper = await mountSuspended(UserEditForm, {
        props: { user: { id: 123, name: 'John Doe' } }
    })

    await wrapper.find('[data-test-id="user-form-name"]').setValue('Modified Name')
    await wrapper.find('[data-test-id="user-form-cancel"]').trigger('click')

    expect(routerPush).toHaveBeenCalledWith('/users/123')
})
```

---

## <a name="form-multi-step"></a>Multi-step form

**When to use**: Verify navigation between form steps and validation of each step.

```js
test('navigates through form steps', async () => {
    const wrapper = await mountSuspended(MultiStepForm)

    // Step 1
    expect(wrapper.find('[data-test-id="step-indicator"]').text()).toBe('Step 1 of 3')

    await wrapper.find('[data-test-id="step1-name"]').setValue('John Doe')
    await wrapper.find('[data-test-id="step-next"]').trigger('click')

    // Step 2
    expect(wrapper.find('[data-test-id="step-indicator"]').text()).toBe('Step 2 of 3')

    await wrapper.find('[data-test-id="step2-email"]').setValue('john@example.com')
    await wrapper.find('[data-test-id="step-next"]').trigger('click')

    // Step 3
    expect(wrapper.find('[data-test-id="step-indicator"]').text()).toBe('Step 3 of 3')

    await wrapper.find('[data-test-id="step3-confirm"]').setChecked(true)
    await wrapper.find('[data-test-id="step-submit"]').trigger('click')

    await flushPromises()

    expect(wrapper.find('[data-test-id="success-message"]').exists()).toBe(true)
})
```

---

# Tables & Lists

## <a name="table-display-data"></a>Table with data

**When to use**: Verify that a table correctly displays a list of data.

```js
test('displays list of users', async () => {
    mockNuxtImport('useFetch', () => {
        return () => ({
            data: ref([
                { id: 1, name: 'John Doe', email: 'john@example.com' },
                { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
            ]),
            pending: ref(false),
            error: ref(null)
        })
    })

    const wrapper = await mountSuspended(UserTable)

    const rows = wrapper.findAll('[data-test-class="user-table-row"]')
    expect(rows).toHaveLength(2)
    expect(rows[0].text()).toContain('John Doe')
    expect(rows[1].text()).toContain('Jane Smith')
})
```

---

## <a name="table-sorting"></a>Table with sorting

**When to use**: Verify that clicking a column header sorts the data correctly.

```js
test('sorts table by column', async () => {
    const wrapper = await mountSuspended(UserTable, {
        props: {
            users: [
                { id: 3, name: 'Charlie' },
                { id: 1, name: 'Alice' },
                { id: 2, name: 'Bob' }
            ]
        }
    })

    await wrapper.find('[data-test-id="table-header-name"]').trigger('click')

    const rows = wrapper.findAll('[data-test-class="user-table-row"]')
    expect(rows[0].text()).toContain('Alice')
    expect(rows[1].text()).toContain('Bob')
    expect(rows[2].text()).toContain('Charlie')

    // Reverse sort
    await wrapper.find('[data-test-id="table-header-name"]').trigger('click')

    const rowsDesc = wrapper.findAll('[data-test-class="user-table-row"]')
    expect(rowsDesc[0].text()).toContain('Charlie')
})
```

---

## <a name="table-filters"></a>Table with filters

**When to use**: Verify that a filter correctly reduces displayed results.

```js
test('filters table by search term', async () => {
    const wrapper = await mountSuspended(UserTable, {
        props: {
            users: [
                { id: 1, name: 'John Doe', role: 'admin' },
                { id: 2, name: 'Jane Smith', role: 'user' },
                { id: 3, name: 'John Smith', role: 'user' }
            ]
        }
    })

    await wrapper.find('[data-test-id="filter-search"]').setValue('John')

    const rows = wrapper.findAll('[data-test-class="user-table-row"]')
    expect(rows).toHaveLength(2)

    await wrapper.find('[data-test-id="filter-role"]').setValue('admin')

    const filteredRows = wrapper.findAll('[data-test-class="user-table-row"]')
    expect(filteredRows).toHaveLength(1)
    expect(filteredRows[0].text()).toContain('John Doe')
})
```

---

## <a name="table-pagination"></a>Table with pagination

**When to use**: Verify that pagination correctly loads next/previous pages.

```js
test('paginates through table pages', async () => {
    const fetchSpy = vi.fn()
        .mockResolvedValueOnce({ data: [{ id: 1 }, { id: 2 }], total: 50 })
        .mockResolvedValueOnce({ data: [{ id: 3 }, { id: 4 }], total: 50 })

    registerEndpoint('/api/users', {
        method: 'GET',
        handler: () => fetchSpy()
    })

    const wrapper = await mountSuspended(UserTable)

    expect(wrapper.find('[data-test-id="page-info"]').text()).toBe('Page 1 of 25')

    await wrapper.find('[data-test-id="pagination-next"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-test-id="page-info"]').text()).toBe('Page 2 of 25')
    expect(fetchSpy).toHaveBeenCalledTimes(2)
})
```

---

## <a name="table-multi-select"></a>Table with multi-selection

**When to use**: Verify that multiple rows can be selected and bulk actions performed.

```js
test('selects multiple rows and performs bulk action', async () => {
    registerEndpoint('/api/users/bulk-delete', {
        method: 'POST',
        handler: () => ({ success: true })
    })

    const wrapper = await mountSuspended(UserTable, {
        props: {
            users: [
                { id: 1, name: 'John' },
                { id: 2, name: 'Jane' },
                { id: 3, name: 'Bob' }
            ]
        }
    })

    await wrapper.find('[data-test-id="select-user-1"]').setChecked(true)
    await wrapper.find('[data-test-id="select-user-2"]').setChecked(true)

    expect(wrapper.find('[data-test-id="selected-count"]').text()).toBe('2 selected')

    await wrapper.find('[data-test-id="bulk-delete-btn"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-test-id="success-message"]').exists()).toBe(true)
})
```

---

## <a name="table-loading"></a>Table with loading

**When to use**: Verify that a loading indicator displays while fetching data.

```js
test('displays loading state while fetching', async () => {
    mockNuxtImport('useFetch', () => {
        return () => ({
            data: ref(null),
            pending: ref(true),
            error: ref(null)
        })
    })

    const wrapper = await mountSuspended(UserTable)

    expect(wrapper.find('[data-test-state="loading"]').exists()).toBe(true)
    expect(wrapper.find('[data-test-id="loading-spinner"]').exists()).toBe(true)
})
```

---

## <a name="table-empty-state"></a>Empty list

**When to use**: Verify that an appropriate message displays when there's no data.

```js
test('displays empty state when no data', async () => {
    mockNuxtImport('useFetch', () => {
        return () => ({
            data: ref([]),
            pending: ref(false),
            error: ref(null)
        })
    })

    const wrapper = await mountSuspended(UserTable)

    expect(wrapper.find('[data-test-state="empty"]').exists()).toBe(true)
    expect(wrapper.find('[data-test-id="empty-message"]').text()).toContain('No users found')
})
```

---

# Modals & Dialogs

## <a name="modal-open-close"></a>Open/close modal

**When to use**: Verify that a modal opens and closes correctly.

```js
test('opens and closes modal', async () => {
    const wrapper = await mountSuspended(UserModal)

    expect(wrapper.findAll('[data-test-class="modal-content"]')).toHaveLength(0)

    await wrapper.find('[data-test-id="open-modal-btn"]').trigger('click')

    expect(wrapper.findAll('[data-test-class="modal-content"]')).toHaveLength(1)
    expect(wrapper.find('[data-test-id="modal-title"]').text()).toBe('User Details')

    await wrapper.find('[data-test-id="close-modal-btn"]').trigger('click')

    expect(wrapper.findAll('[data-test-class="modal-content"]')).toHaveLength(0)
})
```

---

## <a name="modal-with-form"></a>Modal with form

**When to use**: Verify that a modal containing a form correctly submits data.

```js
test('submits form inside modal', async () => {
    registerEndpoint('/api/users', {
        method: 'POST',
        handler: () => ({ id: 123, name: 'John Doe' })
    })

    const wrapper = await mountSuspended(UserCreateModal, {
        props: { isOpen: true }
    })

    await wrapper.find('[data-test-id="modal-form-name"]').setValue('John Doe')
    await wrapper.find('[data-test-id="modal-form-email"]').setValue('john@example.com')
    await wrapper.find('[data-test-id="modal-form-submit"]').trigger('click')

    await flushPromises()

    expect(wrapper.emitted('user-created')).toBeTruthy()
    expect(wrapper.emitted('user-created')[0]).toEqual([{ id: 123, name: 'John Doe' }])
})
```

---

## <a name="modal-confirmation"></a>Confirmation modal

**When to use**: Verify that a confirmation modal requests validation before a destructive action.

```js
test('confirms action before deleting', async () => {
    const mockDelete = vi.fn().mockResolvedValue({})

    registerEndpoint('/api/users/123', {
        method: 'DELETE',
        handler: () => mockDelete()
    })

    const wrapper = await mountSuspended(UserList)

    await wrapper.find('[data-test-id="delete-user-123"]').trigger('click')

    expect(wrapper.find('[data-test-class="confirmation-modal"]').exists()).toBe(true)
    expect(wrapper.find('[data-test-id="confirm-message"]').text()).toContain('Are you sure')

    await wrapper.find('[data-test-id="confirm-cancel"]').trigger('click')

    expect(wrapper.find('[data-test-class="confirmation-modal"]').exists()).toBe(false)
    expect(mockDelete).not.toHaveBeenCalled()

    await wrapper.find('[data-test-id="delete-user-123"]').trigger('click')
    await wrapper.find('[data-test-id="confirm-delete"]').trigger('click')

    await flushPromises()

    expect(mockDelete).toHaveBeenCalled()
})
```

---

## <a name="modal-dynamic-content"></a>Modal with dynamic content

**When to use**: Verify that a modal loads and displays different content based on context.

```js
test('displays different content based on user', async () => {
    const wrapper = await mountSuspended(UserDetailsModal, {
        props: {
            isOpen: true,
            userId: 123
        }
    })

    mockNuxtImport('useFetch', () => {
        return () => ({
            data: ref({ id: 123, name: 'John Doe', role: 'admin' }),
            pending: ref(false),
            error: ref(null)
        })
    })

    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-test-id="user-name"]').text()).toBe('John Doe')
    expect(wrapper.find('[data-test-id="user-role"]').text()).toBe('admin')

    await wrapper.setProps({ userId: 456 })

    // Modal should load new data
    expect(wrapper.find('[data-test-state="loading"]').exists()).toBe(true)
})
```

---

# Permissions & Auth

## <a name="auth-conditional-display"></a>Conditional display based on permissions

**When to use**: Verify that UI elements only display if the user has the correct permissions.

```js
test('shows actions based on permissions', async () => {
    mockNuxtImport('usePermissions', () => {
        return () => ({
            can: (permission) => permission === 'user.edit'
        })
    })

    const wrapper = await mountSuspended(UserCard, {
        props: { user: { id: 123, name: 'John Doe' } }
    })

    expect(wrapper.find('[data-test-id="edit-btn"]').exists()).toBe(true)
    expect(wrapper.find('[data-test-id="delete-btn"]').exists()).toBe(false)
})
```

---

## <a name="auth-redirect"></a>Redirect if unauthorized

**When to use**: Verify that an unauthorized user is redirected to an error or login page.

```js
test('redirects unauthorized user', async () => {
    const mockNavigateTo = vi.fn()

    mockNuxtImport('navigateTo', () => mockNavigateTo)
    mockNuxtImport('usePermissions', () => {
        return () => ({
            can: () => false
        })
    })

    const wrapper = await mountSuspended(AdminPage)
    await flushPromises()

    expect(mockNavigateTo).toHaveBeenCalledWith('/403')
})
```

---

## <a name="auth-multiple-permissions"></a>Check multiple permissions

**When to use**: Verify that a user has all required permissions for an action.

```js
test('requires multiple permissions for action', async () => {
    mockNuxtImport('usePermissions', () => {
        return () => ({
            canAll: (permissions) => {
                const userPermissions = ['user.view', 'user.edit']
                return permissions.every(p => userPermissions.includes(p))
            }
        })
    })

    const wrapper = await mountSuspended(UserManagement)

    // User can view and edit
    expect(wrapper.find('[data-test-id="edit-btn"]').exists()).toBe(true)

    // But can't delete (permission missing)
    expect(wrapper.find('[data-test-id="delete-btn"]').exists()).toBe(false)
})
```

---

## <a name="auth-restricted-action"></a>Restricted action

**When to use**: Verify that an action can only be performed by authorized users.

```js
test('prevents restricted action without permission', async () => {
    mockNuxtImport('usePermissions', () => {
        return () => ({
            can: () => false
        })
    })

    const wrapper = await mountSuspended(UserActions, {
        props: { user: { id: 123 } }
    })

    await wrapper.find('[data-test-id="delete-btn"]').trigger('click')

    expect(wrapper.find('[data-test-id="permission-error"]').exists()).toBe(true)
    expect(wrapper.find('[data-test-id="permission-error"]').text()).toContain('not authorized')
})
```

---

# API & Data Fetching

## <a name="api-use-fetch"></a>Component with useFetch

**When to use**: Verify that a component correctly loads data with useFetch.

```js
test('loads data with useFetch', async () => {
    mockNuxtImport('useFetch', () => {
        return () => ({
            data: ref([
                { id: 1, name: 'Product 1' },
                { id: 2, name: 'Product 2' }
            ]),
            pending: ref(false),
            error: ref(null)
        })
    })

    const wrapper = await mountSuspended(ProductList)

    expect(wrapper.findAll('[data-test-class="product-item"]')).toHaveLength(2)
})
```

---

## <a name="api-dollar-fetch"></a>Component with $fetch

**When to use**: Verify that a component uses $fetch for manual requests.

```js
test('fetches data on button click', async () => {
    registerEndpoint('/api/products/search', {
        method: 'GET',
        handler: () => ([
            { id: 1, name: 'Product 1' }
        ])
    })

    const wrapper = await mountSuspended(ProductSearch)

    await wrapper.find('[data-test-id="search-input"]').setValue('Product')
    await wrapper.find('[data-test-id="search-btn"]').trigger('click')

    await flushPromises()

    expect(wrapper.findAll('[data-test-class="product-item"]')).toHaveLength(1)
})
```

---

## <a name="api-error-handling"></a>API error handling

**When to use**: Verify that an API error is correctly displayed to the user.

```js
test('displays API error message', async () => {
    mockNuxtImport('useFetch', () => {
        return () => ({
            data: ref(null),
            pending: ref(false),
            error: ref({
                statusCode: 500,
                message: 'Internal Server Error'
            })
        })
    })

    const wrapper = await mountSuspended(ProductList)

    expect(wrapper.find('[data-test-state="error"]').exists()).toBe(true)
    expect(wrapper.find('[data-test-id="error-message"]').text()).toContain('Internal Server Error')
})
```

---

## <a name="api-retry"></a>Retry on error

**When to use**: Verify that a button allows retrying after an error.

```js
test('retries fetch on error', async () => {
    const refreshSpy = vi.fn()

    mockNuxtImport('useFetch', () => {
        return () => ({
            data: ref(null),
            pending: ref(false),
            error: ref({ message: 'Network error' }),
            refresh: refreshSpy
        })
    })

    const wrapper = await mountSuspended(ProductList)

    expect(wrapper.find('[data-test-id="error-message"]').exists()).toBe(true)

    await wrapper.find('[data-test-id="retry-btn"]').trigger('click')

    expect(refreshSpy).toHaveBeenCalled()
})
```

---

## <a name="api-mock-endpoint"></a>Mock API endpoint

**When to use**: Mock a complete API response with status code and data.

```js
test('mocks API endpoint response', async () => {
    registerEndpoint('/api/products/123', {
        method: 'GET',
        handler: () => ({
            id: 123,
            name: 'Product Name',
            price: 99.99,
            stock: 42
        })
    })

    const wrapper = await mountSuspended(ProductDetail, {
        props: { productId: 123 }
    })

    await flushPromises()

    expect(wrapper.find('[data-test-id="product-name"]').text()).toBe('Product Name')
    expect(wrapper.find('[data-test-id="product-price"]').text()).toContain('99.99')
})
```

---

# States & Loading

## <a name="state-loading"></a>Loading state

**When to use**: Verify that a loading indicator displays during an async operation.

```js
test('displays loading state', async () => {
    mockNuxtImport('useFetch', () => {
        return () => ({
            data: ref(null),
            pending: ref(true),
            error: ref(null)
        })
    })

    const wrapper = await mountSuspended(ProductList)

    expect(wrapper.find('[data-test-state="loading"]').exists()).toBe(true)
    expect(wrapper.find('[data-test-id="loading-spinner"]').exists()).toBe(true)
})
```

---

## <a name="state-error"></a>Error state

**When to use**: Verify that an error message displays when an operation fails.

```js
test('displays error state', async () => {
    mockNuxtImport('useFetch', () => {
        return () => ({
            data: ref(null),
            pending: ref(false),
            error: ref({ message: 'Failed to load products' })
        })
    })

    const wrapper = await mountSuspended(ProductList)

    expect(wrapper.find('[data-test-state="error"]').exists()).toBe(true)
    expect(wrapper.find('[data-test-id="error-message"]').text()).toContain('Failed to load')
})
```

---

## <a name="state-empty"></a>Empty state (no data)

**When to use**: Verify that an appropriate message displays when there's no data.

```js
test('displays empty state', async () => {
    mockNuxtImport('useFetch', () => {
        return () => ({
            data: ref([]),
            pending: ref(false),
            error: ref(null)
        })
    })

    const wrapper = await mountSuspended(ProductList)

    expect(wrapper.find('[data-test-state="empty"]').exists()).toBe(true)
    expect(wrapper.find('[data-test-id="empty-message"]').text()).toContain('No products found')
})
```

---

## <a name="state-success"></a>Success state

**When to use**: Verify that data displays correctly after successful loading.

```js
test('displays success state with data', async () => {
    mockNuxtImport('useFetch', () => {
        return () => ({
            data: ref([{ id: 1, name: 'Product 1' }]),
            pending: ref(false),
            error: ref(null)
        })
    })

    const wrapper = await mountSuspended(ProductList)

    expect(wrapper.find('[data-test-state="success"]').exists()).toBe(true)
    expect(wrapper.findAll('[data-test-class="product-item"]')).toHaveLength(1)
})
```

---

## <a name="state-transitions"></a>State transitions

**When to use**: Verify that the component correctly transitions from one state to another.

```js
test('transitions between loading and success states', async () => {
    const pending = ref(true)
    const data = ref(null)

    mockNuxtImport('useFetch', () => {
        return () => ({
            data,
            pending,
            error: ref(null)
        })
    })

    const wrapper = await mountSuspended(ProductList)

    expect(wrapper.find('[data-test-state="loading"]').exists()).toBe(true)

    pending.value = false
    data.value = [{ id: 1, name: 'Product 1' }]
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-test-state="loading"]').exists()).toBe(false)
    expect(wrapper.find('[data-test-state="success"]').exists()).toBe(true)
})
```

---

# User Interactions

## <a name="interaction-button-click"></a>Click button

**When to use**: Verify that clicking a button triggers an action.

```js
test('triggers action on button click', async () => {
    const wrapper = await mountSuspended(Counter)

    expect(wrapper.find('[data-test-id="count"]').text()).toBe('0')

    await wrapper.find('[data-test-id="increment-btn"]').trigger('click')

    expect(wrapper.find('[data-test-id="count"]').text()).toBe('1')
})
```

---

## <a name="interaction-fill-input"></a>Fill input field

**When to use**: Verify that an input field correctly updates its value.

```js
test('updates input value', async () => {
    const wrapper = await mountSuspended(SearchBar)

    await wrapper.find('[data-test-id="search-input"]').setValue('test query')

    expect(wrapper.find('[data-test-id="search-input"]').element.value).toBe('test query')
    expect(wrapper.emitted('search')).toBeTruthy()
})
```

---

## <a name="interaction-select-option"></a>Select option

**When to use**: Verify that selecting from a dropdown updates the value.

```js
test('selects dropdown option', async () => {
    const wrapper = await mountSuspended(CategoryFilter)

    await wrapper.find('[data-test-id="category-select"]').setValue('electronics')

    expect(wrapper.find('[data-test-id="category-select"]').element.value).toBe('electronics')
    expect(wrapper.emitted('filter-change')).toBeTruthy()
})
```

---

## <a name="interaction-checkbox"></a>Check checkbox

**When to use**: Verify that a checkbox changes state when clicked.

```js
test('toggles checkbox', async () => {
    const wrapper = await mountSuspended(TermsAcceptance)

    expect(wrapper.find('[data-test-id="terms-checkbox"]').element.checked).toBe(false)

    await wrapper.find('[data-test-id="terms-checkbox"]').setChecked(true)

    expect(wrapper.find('[data-test-id="terms-checkbox"]').element.checked).toBe(true)
    expect(wrapper.find('[data-test-id="submit-btn"]').element.disabled).toBe(false)
})
```

---

## <a name="interaction-file-upload"></a>File upload

**When to use**: Verify that file upload works correctly.

```js
test('uploads file', async () => {
    const wrapper = await mountSuspended(FileUpload)

    const file = new File(['content'], 'test.txt', { type: 'text/plain' })
    await wrapper.find('[data-test-id="file-input"]').setValue([file])

    expect(wrapper.find('[data-test-id="file-name"]').text()).toBe('test.txt')
    expect(wrapper.find('[data-test-id="upload-btn"]').element.disabled).toBe(false)
})
```

---

## <a name="interaction-debounce"></a>Debounce on input

**When to use**: Verify that a debounced search only calls the API after a delay.

```js
test('debounces search input', async () => {
    vi.useFakeTimers()

    const mockSearch = vi.fn().mockResolvedValue([])

    mockNuxtImport('useSearch', () => {
        return () => ({
            search: mockSearch
        })
    })

    const wrapper = await mountSuspended(SearchBar)

    await wrapper.find('[data-test-id="search-input"]').setValue('a')
    vi.advanceTimersByTime(100)

    await wrapper.find('[data-test-id="search-input"]').setValue('ab')
    vi.advanceTimersByTime(100)

    expect(mockSearch).not.toHaveBeenCalled()

    vi.advanceTimersByTime(200) // Total 300ms

    expect(mockSearch).toHaveBeenCalledTimes(1)
    expect(mockSearch).toHaveBeenCalledWith('ab')

    vi.useRealTimers()
})
```

---

## <a name="interaction-drag-drop"></a>Drag & drop

**When to use**: Verify that an element can be moved via drag and drop.

```js
test('reorders items with drag and drop', async () => {
    const wrapper = await mountSuspended(SortableList, {
        props: {
            items: [
                { id: 1, name: 'Item 1' },
                { id: 2, name: 'Item 2' },
                { id: 3, name: 'Item 3' }
            ]
        }
    })

    const items = wrapper.findAll('[data-test-class="sortable-item"]')

    // Simulate drag & drop
    await items[0].trigger('dragstart')
    await items[2].trigger('drop')

    const reorderedItems = wrapper.findAll('[data-test-class="sortable-item"]')
    expect(reorderedItems[2].text()).toContain('Item 1')
})
```

---

# i18n & Translations

## <a name="i18n-check-keys"></a>Check i18n keys

**When to use**: Verify that all i18n keys are defined and translated.

```js
test('all i18n keys are translated', async () => {
    mockNuxtImport('useI18n', () => {
        return () => ({
            t: (key) => {
                const translations = {
                    'user.name': 'Name',
                    'user.email': 'Email',
                    'common.save': 'Save'
                }
                return translations[key] || key
            }
        })
    })

    const wrapper = await mountSuspended(UserForm)

    expect(wrapper.find('[data-test-id="name-label"]').text()).toBe('Name')
    expect(wrapper.find('[data-test-id="name-label"]').text()).not.toBe('user.name')
})
```

---

## <a name="i18n-switch-locale"></a>Switch language

**When to use**: Verify that switching language updates the interface.

```js
test('switches locale', async () => {
    const locale = ref('en')

    mockNuxtImport('useI18n', () => {
        return () => ({
            locale,
            t: (key) => {
                const translations = {
                    en: { 'common.welcome': 'Welcome' },
                    fr: { 'common.welcome': 'Bienvenue' }
                }
                return translations[locale.value][key] || key
            }
        })
    })

    const wrapper = await mountSuspended(Header)

    expect(wrapper.find('[data-test-id="welcome-text"]').text()).toBe('Welcome')

    locale.value = 'fr'
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-test-id="welcome-text"]').text()).toBe('Bienvenue')
})
```

---

## <a name="i18n-interpolation"></a>Translation with interpolation

**When to use**: Verify that a translation with dynamic variables works.

```js
test('interpolates translation values', async () => {
    mockNuxtImport('useI18n', () => {
        return () => ({
            t: (key, values) => {
                if (key === 'user.greeting') {
                    return `Hello ${values.name}!`
                }
                return key
            }
        })
    })

    const wrapper = await mountSuspended(UserGreeting, {
        props: { userName: 'John' }
    })

    expect(wrapper.find('[data-test-id="greeting"]').text()).toBe('Hello John!')
})
```

---

## <a name="i18n-plural"></a>Plural translation

**When to use**: Verify that plural forms are correctly handled.

```js
test('handles plural translations', async () => {
    mockNuxtImport('useI18n', () => {
        return () => ({
            t: (key, count) => {
                if (key === 'item.count') {
                    return count === 1 ? '1 item' : `${count} items`
                }
                return key
            }
        })
    })

    const wrapper = await mountSuspended(ItemCounter, {
        props: { count: 1 }
    })

    expect(wrapper.find('[data-test-id="item-count"]').text()).toBe('1 item')

    await wrapper.setProps({ count: 5 })

    expect(wrapper.find('[data-test-id="item-count"]').text()).toBe('5 items')
})
```

---

# Utils & Helpers

## <a name="util-format-date"></a>Date formatter

**When to use**: Test a function that formats dates.

```js
import { formatDate } from '@/utils/formatDate'

test('formats date correctly', () => {
    const date = new Date('2024-03-15')

    expect(formatDate(date, 'DD/MM/YYYY')).toBe('15/03/2024')
    expect(formatDate(date, 'YYYY-MM-DD')).toBe('2024-03-15')
    expect(formatDate(date, 'MMM DD, YYYY')).toBe('Mar 15, 2024')
})
```

---

## <a name="util-format-bytes"></a>File size formatter

**When to use**: Test a function that converts bytes to readable format.

```js
import { formatBytes } from '@/utils/formatBytes'

test('formats bytes to readable size', () => {
    expect(formatBytes(0)).toBe('0 Bytes')
    expect(formatBytes(1024)).toBe('1 KB')
    expect(formatBytes(1048576)).toBe('1 MB')
    expect(formatBytes(1073741824)).toBe('1 GB')
    expect(formatBytes(1500, 2)).toBe('1.46 KB')
})
```

---

## <a name="util-validate-email"></a>Email validation

**When to use**: Test an email validation function.

```js
import { validateEmail } from '@/utils/validators'

test('validates email addresses', () => {
    expect(validateEmail('john@example.com')).toBe(true)
    expect(validateEmail('user+tag@domain.co.uk')).toBe(true)

    expect(validateEmail('invalid')).toBe(false)
    expect(validateEmail('missing@domain')).toBe(false)
    expect(validateEmail('@example.com')).toBe(false)
})
```

---

## <a name="util-validate-ip"></a>IP validation

**When to use**: Test an IP address validation function.

```js
import { validateIPAddress } from '@/utils/validators'

test('validates IP addresses', () => {
    expect(validateIPAddress('192.168.1.1')).toBe(true)
    expect(validateIPAddress('255.255.255.255')).toBe(true)
    expect(validateIPAddress('0.0.0.0')).toBe(true)

    expect(validateIPAddress('256.1.1.1')).toBe(false)
    expect(validateIPAddress('192.168.1')).toBe(false)
    expect(validateIPAddress('invalid')).toBe(false)
})
```

---

## <a name="util-data-mapping"></a>Data mapping

**When to use**: Test a function that transforms data from one format to another.

```js
import { mapUserToForm, mapFormToUser } from '@/utils/userMapper'

test('maps user data to form format', () => {
    const user = { id: 123, firstName: 'John', lastName: 'Doe', age: 30 }
    const form = mapUserToForm(user)

    expect(form.fullName).toBe('John Doe')
    expect(form.age).toBe('30')
})

test('maps form data to user format', () => {
    const form = { fullName: 'John Doe', age: '30' }
    const user = mapFormToUser(form)

    expect(user.firstName).toBe('John')
    expect(user.lastName).toBe('Doe')
    expect(user.age).toBe(30)
})
```

---

## <a name="util-group-by"></a>Group by key

**When to use**: Test a function that groups an array of objects by a key.

```js
import { groupBy } from '@/utils/array'

test('groups array by key', () => {
    const users = [
        { id: 1, role: 'admin', name: 'John' },
        { id: 2, role: 'user', name: 'Jane' },
        { id: 3, role: 'admin', name: 'Bob' }
    ]

    const grouped = groupBy(users, 'role')

    expect(grouped.admin).toHaveLength(2)
    expect(grouped.user).toHaveLength(1)
    expect(grouped.admin[0].name).toBe('John')
})
```

---

## <a name="util-sort-by"></a>Sort array

**When to use**: Test an array sorting function.

```js
import { sortBy } from '@/utils/array'

test('sorts array by key', () => {
    const users = [
        { id: 3, name: 'Charlie' },
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' }
    ]

    const sorted = sortBy(users, 'id', 'asc')
    expect(sorted[0].id).toBe(1)
    expect(sorted[2].id).toBe(3)

    const sortedDesc = sortBy(users, 'name', 'desc')
    expect(sortedDesc[0].name).toBe('Charlie')
})
```

---

## <a name="util-parse-csv"></a>Parse CSV

**When to use**: Test a function that parses a CSV line.

```js
import { parseCsvRow } from '@/utils/csv'

test('parses CSV row correctly', () => {
    expect(parseCsvRow('a,b,c')).toEqual(['a', 'b', 'c'])
    expect(parseCsvRow('"a,b",c,d')).toEqual(['a,b', 'c', 'd'])
    expect(parseCsvRow('a, b , c')).toEqual(['a', 'b', 'c'])
    expect(parseCsvRow('a,"b""c",d')).toEqual(['a', 'b"c', 'd'])
})
```

---

# Stores & State Management

## <a name="store-add-item"></a>Store: add item

**When to use**: Test adding an item to a Pinia store.

```js
import { useUserStore } from '@/stores/user'
import { setActivePinia, createPinia } from 'pinia'

beforeEach(() => {
    setActivePinia(createPinia())
})

test('adds user to store', () => {
    const store = useUserStore()

    expect(store.users).toHaveLength(0)

    store.addUser({ id: 1, name: 'John Doe' })

    expect(store.users).toHaveLength(1)
    expect(store.users[0].name).toBe('John Doe')
})
```

---

## <a name="store-remove-item"></a>Store: remove item

**When to use**: Test removing an item from a store.

```js
test('removes user from store', () => {
    const store = useUserStore()

    store.addUser({ id: 1, name: 'John' })
    store.addUser({ id: 2, name: 'Jane' })

    expect(store.users).toHaveLength(2)

    store.removeUser(1)

    expect(store.users).toHaveLength(1)
    expect(store.users[0].id).toBe(2)
})
```

---

## <a name="store-filter-items"></a>Store: filter items

**When to use**: Test a computed that filters store items.

```js
test('filters users by role', () => {
    const store = useUserStore()

    store.users = [
        { id: 1, name: 'John', role: 'admin' },
        { id: 2, name: 'Jane', role: 'user' },
        { id: 3, name: 'Bob', role: 'admin' }
    ]

    store.filterRole = 'admin'

    expect(store.filteredUsers).toHaveLength(2)
    expect(store.filteredUsers[0].name).toBe('John')
})
```

---

## <a name="store-fetch-data"></a>Store: fetch data

**When to use**: Test loading data from an API in a store.

```js
test('fetches users from API', async () => {
    registerEndpoint('/api/users', {
        method: 'GET',
        handler: () => ([
            { id: 1, name: 'John' },
            { id: 2, name: 'Jane' }
        ])
    })

    const store = useUserStore()

    expect(store.isLoading).toBe(false)

    const promise = store.fetchUsers()
    expect(store.isLoading).toBe(true)

    await promise

    expect(store.isLoading).toBe(false)
    expect(store.users).toHaveLength(2)
})
```

---

## <a name="store-reset"></a>Store: reset

**When to use**: Test resetting a store to its initial state.

```js
test('resets store to initial state', () => {
    const store = useUserStore()

    store.users = [{ id: 1, name: 'John' }]
    store.filterRole = 'admin'

    store.$reset()

    expect(store.users).toHaveLength(0)
    expect(store.filterRole).toBe('')
})
```

---

# Composables

## <a name="composable-form"></a>Form composable

**When to use**: Test a composable that manages form logic.

```js
import { useForm } from '@/composables/useForm'

test('validates form data', () => {
    const { form, errors, validate, isValid } = useForm({
        name: '',
        email: ''
    })

    validate()
    expect(isValid.value).toBe(false)
    expect(errors.name).toBe('Name is required')

    form.name = 'John'
    validate()
    expect(errors.name).toBe('')

    form.email = 'john@example.com'
    validate()
    expect(isValid.value).toBe(true)
})
```

---

## <a name="composable-api"></a>API composable

**When to use**: Test a composable that encapsulates API calls.

```js
test('fetches user successfully', async () => {
    registerEndpoint('/api/users/123', {
        method: 'GET',
        handler: () => ({ id: 123, name: 'John Doe' })
    })

    const { user, isLoading, error, fetchUser } = useUserApi()

    expect(isLoading.value).toBe(false)
    expect(user.value).toBeNull()

    await fetchUser(123)

    expect(isLoading.value).toBe(false)
    expect(error.value).toBeNull()
    expect(user.value.name).toBe('John Doe')
})
```

---

## <a name="composable-permissions"></a>Permissions composable

**When to use**: Test a composable that manages user permissions.

```js
import { usePermissions } from '@/composables/usePermissions'

test('checks user permissions', () => {
    const { setPermissions, can, canAny, canAll } = usePermissions()

    setPermissions(['user.view', 'user.edit'])

    expect(can('user.view')).toBe(true)
    expect(can('user.delete')).toBe(false)

    expect(canAny(['user.edit', 'user.delete'])).toBe(true)
    expect(canAll(['user.view', 'user.edit'])).toBe(true)
    expect(canAll(['user.view', 'user.delete'])).toBe(false)
})
```

---

## <a name="composable-notification"></a>Notification composable

**When to use**: Test a composable that displays notifications.

```js
import { useNotification } from '@/composables/useNotification'

test('shows notification', () => {
    const { showSuccess, showError, notifications } = useNotification()

    expect(notifications.value).toHaveLength(0)

    showSuccess('Operation successful')

    expect(notifications.value).toHaveLength(1)
    expect(notifications.value[0].type).toBe('success')
    expect(notifications.value[0].message).toBe('Operation successful')

    showError('Something went wrong')

    expect(notifications.value).toHaveLength(2)
    expect(notifications.value[1].type).toBe('error')
})
```

---

# Advanced Cases

## <a name="advanced-race-conditions"></a>Race conditions (concurrent requests)

**When to use**: Verify that only the last request updates the interface in case of concurrent requests.

```js
test('only last search request updates results', async () => {
    let resolveFirst
    let resolveSecond

    const firstPromise = new Promise(resolve => { resolveFirst = resolve })
    const secondPromise = new Promise(resolve => { resolveSecond = resolve })

    const mockSearch = vi.fn()
        .mockReturnValueOnce(firstPromise)
        .mockReturnValueOnce(secondPromise)

    mockNuxtImport('useSearch', () => {
        return () => ({
            search: mockSearch
        })
    })

    const wrapper = await mountSuspended(SearchComponent)

    await wrapper.find('[data-test-id="search-input"]').setValue('query1')
    await wrapper.find('[data-test-id="search-input"]').setValue('query2')

    resolveSecond([{ id: 2, name: 'Result 2' }])
    await flushPromises()

    expect(wrapper.text()).toContain('Result 2')

    resolveFirst([{ id: 1, name: 'Result 1' }])
    await flushPromises()

    expect(wrapper.text()).toContain('Result 2')
    expect(wrapper.text()).not.toContain('Result 1')
})
```

---

## <a name="advanced-csv-import"></a>CSV import with mapping

**When to use**: Test a complete CSV import workflow with column mapping.

```js
test('imports CSV with column mapping', async () => {
    registerEndpoint('/api/users/import', {
        method: 'POST',
        handler: () => ({ imported: 10, failed: 0 })
    })

    const wrapper = await mountSuspended(CsvImportPage)

    const file = new File(
        ['name,email\nJohn Doe,john@example.com'],
        'users.csv',
        { type: 'text/csv' }
    )

    await wrapper.find('[data-test-id="csv-file-input"]').setValue([file])
    await flushPromises()

    await wrapper.find('[data-test-id="csv-column-name"]').setValue('name')
    await wrapper.find('[data-test-id="csv-column-email"]').setValue('email')
    await wrapper.find('[data-test-id="mapping-next"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-test-id="preview-table"]').exists()).toBe(true)

    await wrapper.find('[data-test-id="import-confirm"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-test-id="import-success"]').text()).toContain('10 users imported')
})
```

---

## <a name="advanced-export-data"></a>Data export

**When to use**: Test exporting data to a CSV file.

```js
test('exports data to CSV', async () => {
    registerEndpoint('/api/users/export', {
        method: 'POST',
        handler: () => new Blob(['name,email\nJohn,john@example.com'])
    })

    const wrapper = await mountSuspended(UserTable, {
        props: {
            users: [{ id: 1, name: 'John', email: 'john@example.com' }]
        }
    })

    await wrapper.find('[data-test-id="export-csv-btn"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-test-id="export-success"]').exists()).toBe(true)
})
```

---

## <a name="advanced-multi-search"></a>Search with multiple filters

**When to use**: Test a search with multiple combined filters.

```js
test('searches with multiple filters', async () => {
    const wrapper = await mountSuspended(ProductSearch, {
        props: {
            products: [
                { id: 1, name: 'Laptop', category: 'electronics', price: 999 },
                { id: 2, name: 'Phone', category: 'electronics', price: 599 },
                { id: 3, name: 'Desk', category: 'furniture', price: 299 }
            ]
        }
    })

    await wrapper.find('[data-test-id="search-input"]').setValue('Laptop')

---

# Vuetify & Components (without data attributes)

> These patterns allow testing Vue/Vuetify components by relying on **props**, **emits**, **slots** and **findComponent** — without needing to add data attributes to the template.

---

## <a name="vuetify-props"></a>Testing component props

**When to use**: Verify that the props received by a component match the expected values.

```js
test('receives correct props', async () => {
    const wrapper = await mountSuspended(MyButton, {
        props: { label: 'Confirm', disabled: false }
    })

    expect(wrapper.props('label')).toBe('Confirm')
    expect(wrapper.props('disabled')).toBe(false)
})
```

---

## <a name="vuetify-find-component"></a>Finding a Vuetify component (findComponent)

**When to use**: Inspect props passed to a child Vuetify component without modifying the parent template.

```js
import { VBtn, VIcon } from 'vuetify/components'

test('passes correct color to VBtn', async () => {
    const wrapper = await mountSuspended(SaveButton, {
        props: { variant: 'primary' }
    })

    const btn = wrapper.findComponent(VBtn)
    expect(btn.props('color')).toBe('primary')
    expect(btn.exists()).toBe(true)
})

test('renders icon inside button', async () => {
    const wrapper = await mountSuspended(IconButton, {
        props: { icon: 'mdi-delete' }
    })

    const icon = wrapper.findComponent(VIcon)
    expect(icon.text()).toBe('mdi-delete')
})
```

---

## <a name="vuetify-set-props"></a>Updating props (setProps)

**When to use**: Verify that the component reacts correctly when its props change after mounting.

```js
import { VChip, VAlert } from 'vuetify/components'

test('updates chip color when status changes', async () => {
    const wrapper = await mountSuspended(StatusBadge, {
        props: { status: 'success' }
    })

    expect(wrapper.findComponent(VChip).props('color')).toBe('success')

    await wrapper.setProps({ status: 'error' })

    expect(wrapper.findComponent(VChip).props('color')).toBe('error')
})

test('shows alert only when error prop is set', async () => {
    const wrapper = await mountSuspended(MyForm, {
        props: { error: null }
    })

    expect(wrapper.findComponent(VAlert).exists()).toBe(false)

    await wrapper.setProps({ error: 'Server error' })

    expect(wrapper.findComponent(VAlert).exists()).toBe(true)
    expect(wrapper.findComponent(VAlert).props('text')).toBe('Server error')
})
```

---

## <a name="vuetify-emits"></a>Testing emits

**When to use**: Verify that a component emits the correct event with the correct payload after an interaction.

```js
import { VBtn } from 'vuetify/components'

test('emits delete event with item id', async () => {
    const wrapper = await mountSuspended(UserCard, {
        props: { user: { id: 42, name: 'John' } }
    })

    await wrapper.findComponent(VBtn).trigger('click')

    expect(wrapper.emitted('delete')).toBeTruthy()
    expect(wrapper.emitted('delete')[0]).toEqual([42])
})

test('emits confirm and cancel events', async () => {
    const wrapper = await mountSuspended(ConfirmCard)

    const btns = wrapper.findAllComponents(VBtn)

    await btns[0].trigger('click')
    expect(wrapper.emitted('confirm')).toBeTruthy()

    await btns[1].trigger('click')
    expect(wrapper.emitted('cancel')).toBeTruthy()
})
```

---

## <a name="vuetify-slots"></a>Testing slots

**When to use**: Verify that a component with slots correctly renders the injected content.

```js
test('renders default slot content', async () => {
    const wrapper = await mountSuspended(MyCard, {
        slots: {
            default: '<p>Custom content</p>'
        }
    })

    expect(wrapper.text()).toContain('Custom content')
})

test('renders named slots', async () => {
    const wrapper = await mountSuspended(MyCard, {
        slots: {
            title: 'My Title',
            actions: '<button>Validate</button>'
        }
    })

    expect(wrapper.text()).toContain('My Title')
    expect(wrapper.text()).toContain('Validate')
})
```

---

## <a name="vuetify-disabled-loading"></a>Disabled and loading state in Vuetify

**When to use**: Verify that loading or disabled states are correctly passed to Vuetify components.

```js
import { VBtn } from 'vuetify/components'

test('button is loading during submission', async () => {
    const wrapper = await mountSuspended(SubmitButton, {
        props: { isLoading: true }
    })

    const btn = wrapper.findComponent(VBtn)
    expect(btn.props('loading')).toBe(true)
})

test('button is disabled when form is invalid', async () => {
    const wrapper = await mountSuspended(MyForm, {
        props: { isValid: false }
    })

    const btn = wrapper.findComponent(VBtn)
    expect(btn.props('disabled')).toBe(true)
})

test('button becomes active when form is valid', async () => {
    const wrapper = await mountSuspended(MyForm, {
        props: { isValid: false }
    })

    expect(wrapper.findComponent(VBtn).props('disabled')).toBe(true)

    await wrapper.setProps({ isValid: true })

    expect(wrapper.findComponent(VBtn).props('disabled')).toBe(false)
})
```

---

## <a name="vuetify-v-model"></a>Testing v-model

**When to use**: Verify that a component emits `update:modelValue` at the right time and with the correct value.

```js
test('emits update:modelValue on input', async () => {
    const wrapper = await mountSuspended(MyTextField, {
        props: { modelValue: '' }
    })

    const input = wrapper.find('input')
    await input.setValue('new value')

    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')[0]).toEqual(['new value'])
})

test('reflects modelValue prop in input', async () => {
    const wrapper = await mountSuspended(MyTextField, {
        props: { modelValue: 'initial value' }
    })

    expect(wrapper.find('input').element.value).toBe('initial value')
})
```

---

## <a name="vuetify-dialog"></a>VDialog and overlays

**When to use**: Verify the opening/closing of a Vuetify modal or overlay via props.

```js
import { VDialog } from 'vuetify/components'

test('dialog is closed by default', async () => {
    const wrapper = await mountSuspended(ConfirmDialog, {
        props: { modelValue: false }
    })

    expect(wrapper.findComponent(VDialog).props('modelValue')).toBe(false)
})

test('dialog opens when modelValue is true', async () => {
    const wrapper = await mountSuspended(ConfirmDialog, {
        props: { modelValue: false }
    })

    await wrapper.setProps({ modelValue: true })

    expect(wrapper.findComponent(VDialog).props('modelValue')).toBe(true)
})

test('emits close event when dialog closes', async () => {
    const wrapper = await mountSuspended(ConfirmDialog, {
        props: { modelValue: true }
    })

    wrapper.findComponent(VDialog).vm.$emit('update:modelValue', false)
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')[0]).toEqual([false])
})
```

---

## <a name="vuetify-datatable"></a>VDataTable: items and headers

**When to use**: Verify that data and table configuration are correctly passed to VDataTable.

```js
import { VDataTable } from 'vuetify/components'

test('passes items to VDataTable', async () => {
    const items = [
        { id: 1, name: 'John', email: 'john@example.com' },
        { id: 2, name: 'Jane', email: 'jane@example.com' }
    ]

    const wrapper = await mountSuspended(UserTable, { props: { items } })

    const table = wrapper.findComponent(VDataTable)
    expect(table.props('items')).toHaveLength(2)
    expect(table.props('items')[0].name).toBe('John')
})

test('passes correct headers to VDataTable', async () => {
    const wrapper = await mountSuspended(UserTable)

    const table = wrapper.findComponent(VDataTable)
    const headers = table.props('headers')

    expect(headers.some(h => h.key === 'name')).toBe(true)
    expect(headers.some(h => h.key === 'email')).toBe(true)
})

test('passes loading prop to VDataTable', async () => {
    const wrapper = await mountSuspended(UserTable, {
        props: { isLoading: true }
    })

    expect(wrapper.findComponent(VDataTable).props('loading')).toBe(true)
})
```

---

## <a name="vuetify-classes"></a>CSS classes (classes())

**When to use**: Verify that dynamic CSS classes are correctly applied based on props or state.

```js
test('applies error class when status is error', async () => {
    const wrapper = await mountSuspended(StatusIndicator, {
        props: { status: 'error' }
    })

    expect(wrapper.classes()).toContain('text-error')
})

test('applies active class when item is selected', async () => {
    const wrapper = await mountSuspended(MenuItem, {
        props: { isActive: true }
    })

    expect(wrapper.classes()).toContain('v-list-item--active')
})

test('does not apply disabled class when enabled', async () => {
    const wrapper = await mountSuspended(MyButton, {
        props: { disabled: false }
    })

    expect(wrapper.classes()).not.toContain('v-btn--disabled')
})
```

---

## <a name="vuetify-attributes"></a>HTML attributes (attributes())

**When to use**: Verify native HTML attributes like `aria-*`, `type`, `href` or `data-*` on the root element.

```js
test('has correct aria-label', async () => {
    const wrapper = await mountSuspended(CloseButton, {
        props: { ariaLabel: 'Close dialog' }
    })

    expect(wrapper.attributes('aria-label')).toBe('Close dialog')
})

test('renders as link with correct href', async () => {
    const wrapper = await mountSuspended(NavLink, {
        props: { href: '/dashboard' }
    })

    expect(wrapper.attributes('href')).toBe('/dashboard')
})

test('button has correct type attribute', async () => {
    const wrapper = await mountSuspended(MyButton, {
        props: { type: 'submit' }
    })

    expect(wrapper.find('button').attributes('type')).toBe('submit')
})
```

---

# Components with Teleport (Portals)

> **Applicable to all frameworks** — The example below uses Vuetify, but the same problem can occur with any component that uses a teleport mechanism (`<Teleport>` Vue, `createPortal` React, etc.).

## <a name="teleport-problem"></a>The problem

Some components do not inject their content into the parent component's DOM, but directly into `document.body`. Result: `wrapper.find(...)` finds nothing, even if the component is visually present.

```js
// Returns exists() = false — content is teleported outside the wrapper
wrapper.find('[data-test-id="dialog-content"]')
```

**Warning sign:** if `find()` returns `exists() = false` on a component that displays correctly in dev, it's very likely a teleport problem.

---

## <a name="teleport-components"></a>Affected components (non-exhaustive list)

| Framework | Affected components |
|-----------|---------------------|
| **Vuetify** | `VDialog`, `VOverlay`, `VMenu`, `VTooltip`, `VSnackbar`, `VBottomSheet`, `VDatePicker` |
| **Native Vue** | Any component using `<Teleport to="body">` |
| **React** | Any component using `ReactDOM.createPortal(...)` |
| **Others** | Check component docs if `find()` fails inexplicably |

---

## <a name="teleport-method"></a>The method to apply

**1. Mount with `attachTo: document.body`**

```js
const wrapper = await mountSuspended(MyComponent, {
    attachTo: document.body  // required for teleports to work
})
```

**2. Wait for overlay render (triple await)**

```js
await wrapper.find('[data-test-id="open-dialog-btn"]').trigger('click')
await nextTick()       // Vue processes reactivity
await flushPromises()  // promises resolve
await nextTick()       // second tick for the teleport itself
```

**3. Search in `document.body` rather than `wrapper`**

```js
// Does not find — content teleported outside wrapper
wrapper.find('[data-test-id="dialog-title"]')

// Finds — searching in document.body
document.body.querySelector('[data-test-id="dialog-title"]')

// Or via findComponent + props if no data-test-id
import { VDialog } from 'vuetify/components'
const dialog = wrapper.findComponent(VDialog)
expect(dialog.props('modelValue')).toBe(true)
```

**4. Clean up after each test**

```js
afterEach(() => {
    wrapper.unmount()
    document.body.innerHTML = ''  // prevents leaks between tests
})
```

---

### Mnemonic rule

```
find() returns exists() = false on a Vuetify (or other) component?
  → 1. Add attachTo: document.body to mount
  → 2. Triple await: nextTick → flushPromises → nextTick
  → 3. Replace wrapper.find() with document.body.querySelector()
  → 4. Clean up with afterEach: unmount() + document.body.innerHTML = ''
```

---

## <a name="teleport-example"></a>Complete example — VDialog with form (Vuetify + Nuxt)

```js
import { describe, it, expect, afterEach } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
import { VDialog } from 'vuetify/components'
import UserCreateModal from '@/components/UserCreateModal.vue'

describe('UserCreateModal', () => {
    let wrapper

    afterEach(() => {
        wrapper?.unmount()
        document.body.innerHTML = ''
    })

    it('opens and displays the form', async () => {
        wrapper = await mountSuspended(UserCreateModal, {
            attachTo: document.body
        })

        // Before opening: dialog closed
        expect(wrapper.findComponent(VDialog).props('modelValue')).toBe(false)

        // Trigger opening
        await wrapper.find('[data-test-id="open-dialog-btn"]').trigger('click')
        await nextTick()
        await flushPromises()
        await nextTick()

        // Verify via VDialog props
        expect(wrapper.findComponent(VDialog).props('modelValue')).toBe(true)

        // Verify content via document.body
        const title = document.body.querySelector('[data-test-id="dialog-title"]')
        expect(title?.textContent).toContain('Create a user')
    })

    it('submits the form and closes the modal', async () => {
        wrapper = await mountSuspended(UserCreateModal, {
            attachTo: document.body,
            props: { modelValue: true }  // open directly without click
        })

        await nextTick()
        await flushPromises()
        await nextTick()

        // Interact via document.body
        const input = document.body.querySelector('[data-test-id="modal-form-name"]')
        input.value = 'John Doe'
        input.dispatchEvent(new Event('input'))
        await nextTick()

        const submitBtn = document.body.querySelector('[data-test-id="modal-form-submit"]')
        submitBtn.click()
        await flushPromises()

        // The modal must emit its closing
        expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false])
    })
})
```

---

## Roadmap

### Coming soon

- **Next.js Guide**: Adaptation of all cases for Next.js + Vitest
- **Debug Guide**: Debugging and troubleshooting techniques
- **E2E Guide**: End-to-end tests with Playwright/Cypress

### Contribute!

This guide evolves thanks to the community. Feel free to:
- Propose new use cases
- Improve existing snippets
- Report bugs or inaccuracies
- Share your experience

**Open an Issue or a Pull Request on the repository!**

---

## License

This guide is open-source and free to use. Share it, improve it, adapt it to your needs!

---

**Last updated**: February 2026
