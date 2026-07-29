# Next session — split repos into their own history

Picks up from [`architecture-decision.md`](architecture-decision.md). `test-casebook-back-js` (steps 2–3 of the original plan) is now built, under `back-js/` on this same branch, at the same rigor as the PHP side — see its own `README.md`/`CHANGELOG.md`. What's left is purely mechanical: splitting `back/` and `back-js/` out into their own repos.

## 1. Split `test-casebook-back` (PHP) out into its own repo

- The content currently lives as the `back/` folder on the `back-doctrine-exploration` branch of this repo (`test-casebook`).
- Create a new `test-casebook-back` repo (empty, own history) and copy `back/`'s contents (`AGENTS.md`, `docs/`, `.claude/`, `bin/`, `README.md`, `CHANGELOG.md`) into its root — don't carry over this repo's git history, start clean since `back/` was always meant to become independent.
- Once copied and verified, the `back/` folder and `back-doctrine-exploration` branch in this repo can be deleted.

## 2. Split `test-casebook-back-js` out into its own repo

- The content lives as the `back-js/` folder on the `repo-architecture-decision` branch of this repo.
- Create a new `test-casebook-back-js` repo (empty, own history) and copy `back-js/`'s contents into its root — same reasoning as step 1, clean history.
- Once copied and verified, the `back-js/` folder can be deleted from this repo (the `repo-architecture-decision` branch itself can also go, or be kept as a record of the decision — your call).

## 3. Update `test-casebook`'s own README

Add a short "sibling repos" pointer to `test-casebook-back` (PHP) and `test-casebook-back-js` (JS) once both exist as independent repos, so anyone landing on the frontend repo understands the landscape without asking.

## Open question for next session

Whether to keep `AdonisJS`/`Express` worked examples in `test-casebook-back-js`'s scope for a near-term follow-up, or leave that for whoever picks up work on that repo next — the NestJS one (the first, already built) is enough to prove the doctrine works end to end.
