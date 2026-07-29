# Architecture decision — one repo per (front/back × ecosystem)

## Decision

Three sibling repos, split on the axis that actually creates friction (testing philosophy front/back, tooling JS/PHP on the back side) rather than on framework:

- **`test-casebook`** (this repo, unchanged name/history) — front, JS/TS (Nuxt, React, Vue…). npm, Vitest/Playwright, tsc/ESLint.
- **`test-casebook-back`** (existing, currently the `back/` folder on `back-doctrine-exploration` in this repo, to be split out) — back, PHP (Laravel, Symfony…). Composer, PHPUnit/Pest, Larastan/PHPStan.
- **`test-casebook-back-js`** (new) — back, JS/TS (NestJS, AdonisJS, Express…). npm, Vitest/Jest. No browser/UI concerns — persona-matrix and permission-gated-unit testing, same spirit as `test-casebook-back` rather than `test-casebook`.

## Why not other splits

- **One repo per framework** (Laravel repo, Symfony repo, Nest repo, Adonis repo…) — rejected: would duplicate the same core doctrine (plan first, exhaustive not happy-path, persona matrix, coverage floor, review gate) four or five times over just to vary Lomkit-vs-API-Platform-style details. Each ecosystem repo instead holds multiple frameworks internally as `docs/testing-guide/<framework>.md` + conditional detection in its `AGENTS.md`.
- **One repo for front, one for back (ignoring JS/PHP)** — rejected: there's no "front PHP" to pair with back PHP, so this axis doesn't cut the real problem, and it would force Laravel and NestJS testing doctrine into the same repo despite sharing no runner or package manager.
- **Renaming `test-casebook` to `test-casebook-frontend`** — rejected: this repo is already cloned/referenced by name in other projects (Skera front, the Laravel formation repo). Renaming breaks those references for a purely cosmetic gain. Instead, `test-casebook`'s own README will gain a line pointing at its two back siblings so anyone landing on it understands the landscape.

## Status

Decision recorded only — no repo has been split out yet. `test-casebook-back` still lives as the `back/` folder on `back-doctrine-exploration` pending the split. `test-casebook-back-js` doesn't exist yet.
