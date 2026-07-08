
# Strategy - Why Data Attributes for Testing

## The Problem

Traditional selectors are **fragile**:

```ts
// Breaks when CSS changes
cy.get('.btn-primary')

// Breaks when structure changes
cy.get('form > div:nth-child(2) > button')

// Breaks when text changes
cy.get('button').contains('Envoyer')
```

## The Solution

Data attributes are **stable**:

```ts
// Never breaks unless intentionally changed
cy.get('[data-test-id="submit-button"]')
```

## Why It Works

| Selector type | Stability | Readability |
|---------------|-----------|-------------|
| CSS classes | Low | Medium |
| DOM structure | Very low | Low |
| Text content | Low | High |
| `data-test-*` | **High** | **High** |

## Conventions

### `data-test-id` - Target a unique element

```html
<button data-test-id="login-submit">Connexion</button>
```

```ts
page.locator('[data-test-id="login-submit"]')
```

### `data-test-class` - Group elements

```html
<div data-test-class="product-card">Produit 1</div>
<div data-test-class="product-card">Produit 2</div>
<div data-test-class="product-card">Produit 3</div>
```

```ts
const cards = page.locator('[data-test-class="product-card"]')
await expect(cards).toHaveCount(3)
```

## Adoption Roadmap

### Phase 1 - Testing (immediate value)

```
data-test-id      -> unique element targeting
data-test-class   -> group counting and filtering
```

### Phase 2 - Debug (developer productivity)

```
data-state        -> visible business state
data-error        -> error context
data-last-action  -> last user action
```

### Phase 3 - Feature Flags / A/B Testing

```
data-present      -> element presence tracking
data-experiment   -> A/B test name
data-variant      -> active variant
```

### Phase 4 - Analytics

```
data-analytics-event     -> event name
data-analytics-category  -> category
data-analytics-label     -> custom label
```

## Key Message

> Start by testing better.
> End up understanding and controlling your application.

Data attributes become a **common language** for the entire frontend: testing, debug, observability, analytics.
