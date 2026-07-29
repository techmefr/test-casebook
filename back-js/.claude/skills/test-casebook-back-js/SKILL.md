---
name: test-casebook-back-js
description: Use when asked to write, complete, or harden a Node/TS backend's test suite the test-casebook-back-js way — exhaustive, strictly-typed, persona-matrix-driven tests with a task-test.md plan, block-by-block execution, and a review gate. Triggers on "write tests" / "cover this" / "test this Guard/Service/Controller" in a NestJS/AdonisJS/Express project. Orchestrates the test-writer-back-js and test-reviewer-back-js sub-agents.
---

# test-casebook-back-js — test suite orchestrator (Node/TS backend)

You drive the test-casebook-back-js methodology on the **current (target) Node/TS backend project**. The full doctrine is `AGENTS.md` (at the project root, or in this repo if invoked directly) — it is the **single source of truth**. Read it first; this skill only orchestrates.

## What this skill does

1. **Read `AGENTS.md`** end to end, including the "Core vs optional" table at the top.
2. **Step 1 yourself**: read the target project's `package.json`, detect the framework (NestJS/AdonisJS/Express), Jest vs Vitest, whether `tsconfig.json` has `strict: true`, which ORM (if any) is present, and how personas/roles are actually enforced (Nest Guards, Adonis Bouncer, bespoke middleware).
3. **Build the plan** (`task-test.md`, Step 5.0): list every unit, read each one's source end to end, enumerate every case, reconcile against existing tests (same audit rule as the front and PHP-back doctrines — an existing test isn't automatically "done").
4. **Execute block by block** (Step 5.1) by delegating each block:
   - hand the block to the **`test-writer-back-js`** sub-agent (the unit's path, its enumerated cases, whether it's permission-gated);
   - hand the written block to the **`test-reviewer-back-js`** sub-agent (independent — never the agent that wrote it) before any commit;
   - if rejected, send findings back to `test-writer-back-js`, then re-review — do **not** commit a rejected block;
   - commit one focused commit per approved block (test file(s) + ticked `task-test.md`).
5. **Verify** (Step 6): run the test suite (unit + e2e), run `tsc --noEmit` and ESLint, enforce the coverage floor from whichever run actually exercises the business logic.

## Delegation rules

- Blocks are independent — several `test-writer-back-js` → `test-reviewer-back-js` chains may run concurrently, but keep one reviewer per block, distinct from its writer.
- Permission-gated units (any Guard/Policy check) carry a **persona matrix** (Step 5.2). If the target project has no way to mint a persona with a specific role/permission state, **stop and tell the user** — don't fabricate a green run locked to a single default persona.
- If a test advances the fake clock forward (`jest.setSystemTime`), remind the writer that any token minted before the jump may now be expired — re-mint after the jump, don't reuse (see `AGENTS.md` Step 4).

## Definition of done

Every box in `task-test.md` ticked, reviewed, and committed; coverage at or above the project's floor; `tsc --noEmit`/ESLint clean; every permission-gated unit covered by its persona matrix, dense on the refused cells. See `AGENTS.md` → "Definition of done".
