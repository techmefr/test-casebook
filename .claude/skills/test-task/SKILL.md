---
name: test-task
description: Use when a project manager wants to turn a story into a complete, shared test task before development — reads the story, reads the real permission/data model as source of truth, interviews the PM one question at a time to close gaps (personas, gated capabilities, regression surface, edge cases), and writes a test-task.md that both the front and back developers will execute. Triggers on "turn this story into a test task", "découper une tâche test", "plan the tests for this story", "what should we test for STK-xxxx", or a pasted/linked story.
---

# test-task — story → shared test task

You help a **project manager** turn one story into a single, complete **test task** — the contract that the front and back developers each hand to their own agent (the `test-casebook` skill) to validate their work. The point is to close the two holes a story alone leaves: **which actor** performs each action (permissions / multi-role), and **regressions** in adjacent areas.

The output is **`test-task.md`**: behavioural, layer-agnostic cases. It is *not* the per-unit `task-test.md` a developer's `test-casebook` run produces — it is the **intent** that run derives its expected outcomes from.

## Do this, in order

1. **Get the story.** If given an issue key, fetch it (Jira tool); otherwise ask the PM to paste it. Read acceptance criteria, scope, and linked context.
2. **Read the real model, don't just trust the story.** Open the relevant code — especially the **permission/role model** (the backend is the source of truth) and the data shapes. The PM knows the business need; the model tells you which roles, scopes, and capabilities actually exist. Enumerate from what you read, not from the story's prose.
3. **Interview the PM to close gaps — one question at a time.** Focus on what a story omits:
   - which **personas** are in play (each = a role set + scope: global / per-tenant-or-BU / resource-owner);
   - for each capability the story adds or touches, **who may and who must not** — get the *forbidden* side explicitly;
   - what **adjacent areas** this story could break (the regression surface);
   - edge cases, empty/error states, boundaries the criteria don't mention.
   Ask the highest-value ambiguity first; don't batch a wall of questions.
4. **Write `test-task.md`.** For every scenario × persona, state the **expected observable outcome** (allowed / refused), not "has permission X". Rules:
   - **Dense on the refused cells** — for each gated capability, at least one persona that must be denied.
   - **Both layers** for permission cases — the API must refuse (e.g. 403) **and** the UI must reflect it (control absent/disabled). Name the `data-test-*` hook each UI case will select on where known.
   - **Expected comes from intent** (this document), never to be recomputed from the app's own check downstream.
   - **Point outward for regressions** — list the adjacent flows to re-verify because this story touches them.
   - Note per case whether it's front, back, or both, so each developer sees their slice.
5. **Confirm with the PM**, then save `test-task.md`. This one file goes to both developers.

## Shape of `test-task.md`

```md
# Test task — <story>

## Personas
- member-simple: role "member" on BU-1
- bu-admin-multi: role "bu-admin" on BU-1 + "member" on BU-2

## Scenario: create a merge request
- [ ] bu-admin-multi → ALLOWED — MR created (back: 201 · front: create button visible, data-test: mr-create)
- [ ] member-simple → REFUSED — back: 403 · front: create button absent (data-test: mr-create) [front+back]

## Regression surface (re-verify — this story touches permissions on MR)
- [ ] MR list still loads for member-simple
- [ ] existing MR detail actions unchanged for bu-admin-multi
```

## Prerequisite

The refused/allowed cells are only real if each developer can **instantiate the personas** (a factory / token minter). If the project has none, flag it in `test-task.md` so it's built before the cells are trusted — see the persona matrix in `AGENTS.md` (Step 5.2). Do not paper over it.
