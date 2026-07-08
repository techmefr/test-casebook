---
name: test-casebook
description: Use when asked to write, complete, or harden a project's test suite the test-casebook way — exhaustive, strictly-typed, data-test-driven tests with a task-test.md plan, block-by-block execution, and a review gate. Triggers on "write tests", "cover this", "add tests", "test suite", "task-test.md", "improve coverage", "test this feature/component". Orchestrates the test-writer and test-reviewer sub-agents.
---

# test-casebook — test suite orchestrator

You drive the test-casebook methodology on the **current (target) project**. The full doctrine is the test-casebook playbook `AGENTS.md` (at the project root) — it is the **single source of truth**. Read it first and follow it; this skill only orchestrates, it does not restate the rules.

## What this skill does

1. **Read `AGENTS.md`** end to end. It defines the conventions, the `task-test.md` plan, strict typing, determinism, the persona matrix (Step 5.2), the anti-mock-drift rules, coverage floor, and verification.
2. **Steps 1–3 yourself** (they need judgement, not delegation): detect the stack, run the Step 2 opt-in gate for `env-attr-cleaner` (ask the user; never install autonomously), install/configure the runner(s).
3. **Build the plan** (`task-test.md`, Step 5.0 Pass A): list every unit, read each unit's source end to end, enumerate every case as a checkbox, reconcile against existing tests. Do this yourself — it is the backbone everything else hangs on.
4. **Execute block by block** (Step 5.0 Pass B) by delegating each block:
   - hand the block to the **`test-writer`** sub-agent (one unit, its cases, the `data-test-*` hooks);
   - hand the written block to the **`test-reviewer`** sub-agent (independent — never the agent that wrote it) before any commit;
   - if the reviewer rejects, send its findings back to `test-writer`, then re-review. Do **not** commit a rejected block.
   - commit one focused commit per approved block (test file + `data-test-*` hooks + ticked `task-test.md`).
5. **Verify** (Step 6): run tests, enforce the 90% floor, run E2E, and — if the cleaner was installed — confirm the production strip by grep.

## Delegation rules

- Blocks are independent: you may run several `test-writer` → `test-reviewer` chains concurrently, but keep **one reviewer per block, distinct from its writer** (independent perspective is the point).
- Pass each sub-agent only what it needs: the unit's path, its enumerated cases from `task-test.md`, and the relevant `data-test-*` hooks. The sub-agents do not re-plan; they execute their block against the doctrine.
- Permission-gated units carry a **persona matrix** (Step 5.2). If the target project has no way to instantiate the required personas (a factory / token minter), **stop and tell the user** — do not fabricate a green test run as a single user.

## Definition of done

Every box in `task-test.md` ticked, reviewed, and committed; coverage ≥ 90% and enforced; production build free of `data-test-*` (if the cleaner is used); every permission-gated unit covered by its persona matrix. See `AGENTS.md` → "Definition of done".
