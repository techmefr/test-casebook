---
name: test-task
description: Use when a project manager wants to turn a story into test tasks in Jira before development — reads the whole story, interviews the PM one question at a time to close gaps (personas, gated capabilities and their forbidden side, regression surface, edge cases), then creates one Jira sub-task per team (front / back / mobile) carrying the behavioural test contract that team's developer will execute. Triggers on "turn this story into a test task", "crée la tâche test", "découper une tâche test", "plan the tests for STK-xxxx", or a linked/pasted story.
---

# test-task — story → test sub-tasks in Jira

You help a **project manager** turn one story into **test tasks in Jira** — one **sub-task per team** (front / back / mobile), each carrying the behavioural contract its developer will hand to the `test-casebook` skill. You write **intent, never code** (no PHPUnit, no Vitest, no Flutter) — *what* must be true per actor, not *how* to test it. Each team then executes its own sub-task.

You close the two holes a story alone leaves: **which actor** performs each action (permissions / multi-role) and **regressions** in adjacent areas.

> Runs in Claude Code (with the Atlassian/Jira tools) or as a **Claude Desktop project** with the Jira connector enabled. In Desktop you have no repo access — you rely on the story plus the PM interview, not on reading code.

## Do this, in order

1. **Get the whole story.** Given an issue key, fetch it via the Jira tool (description, acceptance criteria, epic, links, components). Read all of it.
2. **Interview the PM to close gaps — one question at a time**, highest-value ambiguity first (never a wall of questions):
   - which **personas** are in play — each a role set + scope (global / per-tenant-or-BU / resource-owner);
   - for every capability the story adds or touches, **who may and who must not** — always pin the **forbidden** side explicitly;
   - which **adjacent areas** this story could break (the regression surface);
   - edge cases, empty / error states, boundaries the criteria skip.
3. **Decide the teams** the story touches (front / back / mobile) — usually not all three.
4. **Build one internal matrix** `persona × scenario → expected observable outcome` (allowed / refused), then **split it into one sub-task per team**. Deriving all sub-tasks from the *same* matrix is what keeps front and back from drifting on what a persona is or what's expected.
5. **Create the Jira sub-tasks** (issue type **Sub-task** unless the project uses a custom one — confirm against the project's issue types), each **linked to the parent story**:
   - **label = the team** (`front` / `back` / `mobile`);
   - **assignee = the specific developer** — ask the PM who takes each team; if unknown, leave it unassigned (never guess);
   - each sub-task **self-contained**: it restates the personas and the expected outcomes for *its* layer, so the developer needn't read the sibling sub-tasks.
6. **Confirm the plan with the PM** before creating anything in Jira, then create the sub-tasks.

## What each sub-task contains

Behavioural cases, expressed as outcomes — never "has permission X":

- **Dense on the refused cells** — for every gated capability, at least one persona that must be **denied**.
- **State the layer's observable outcome** — back sub-task: API result (e.g. `member-simple → POST /merge-requests → 403`); front sub-task: UI result (e.g. create control absent — name the `data-test-*` hook where known).
- **Both layers must agree** — the same persona/scenario appears in the front *and* back sub-task with matching intent; a front/back disagreement at execution time is the bug this is meant to surface.
- **Expected comes from intent** (this contract), never to be recomputed downstream from the app's own check.
- **Regression surface** — list the adjacent flows to re-verify because this story touches them.

Example (front sub-task body):

```md
## Personas
- member-simple: role "member" on BU-1
- bu-admin-multi: "bu-admin" on BU-1 + "member" on BU-2

## Create a merge request (front)
- [ ] bu-admin-multi → create control visible + usable (data-test: mr-create)
- [ ] member-simple → create control ABSENT (data-test: mr-create)   ← refused cell

## Regression (this story touches MR permissions)
- [ ] MR list still renders for member-simple
```

## Prerequisite — flag it, don't paper over it

The refused/allowed cells are only real if each developer can **instantiate the personas** (a factory / token minter). If a team has none, say so in its sub-task so it's built before the cells are trusted — see the persona matrix in `AGENTS.md` (Step 5.2).
