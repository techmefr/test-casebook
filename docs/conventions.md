
# Conventions - Data Attributes

## Test Attributes

### `data-test-id`

Unique identifier for a specific element.

```html
<button data-test-id="login-submit">Connexion</button>
<input data-test-id="login-email" type="email">
<form data-test-id="login-form">
```

**Naming**: `context-element` or `context-action`

```
login-submit
login-email
cart-checkout-button
product-123-add-to-cart
```

### `data-test-class`

Group similar elements for counting or filtering.

```html
<div data-test-class="product-card">...</div>
<div data-test-class="product-card">...</div>
<div data-test-class="product-card featured">...</div>
```

**Usage in tests**:

```ts
// Compter
const cards = page.locator('[data-test-class~="product-card"]')
await expect(cards).toHaveCount(3)

// Filtrer
const featured = page.locator('[data-test-class~="featured"]')
```

## Debug Attributes (Phase 2)

### `data-state`

Current business state of a component.

```html
<form data-state="idle">
<form data-state="loading">
<form data-state="success">
<form data-state="error">
```

### `data-error`

Error context for debugging.

```html
<div data-error="validation-failed">
<div data-error="network-timeout">
```

### `data-last-action`

Last user action for debugging.

```html
<div data-last-action="submit-clicked">
<div data-last-action="field-focused">
```

## Feature Flags (Phase 3)

### `data-present`

Track if an element should be present.

```html
<div data-present="premium-feature">
```

### `data-experiment` / `data-variant`

A/B test tracking.

```html
<button data-experiment="checkout-flow" data-variant="one-click">
```

## Analytics (Phase 4)

### `data-analytics-*`

Analytics event tracking.

```html
<button
    data-analytics-event="click"
    data-analytics-category="checkout"
    data-analytics-label="buy-now"
>
```

## Configuration by Environment

```ts
envAttrCleaner({
    environments: {
        // Tous les attributs en developpement
        development: ['data-test-*', 'data-debug-*', 'data-analytics-*'],

        // Uniquement les attributs de test en CI
        test: ['data-test-*'],

        // Test + analytics en staging
        staging: ['data-test-*', 'data-analytics-*'],

        // Uniquement analytics en production (ou rien)
        production: ['data-analytics-*']
    }
})
```
