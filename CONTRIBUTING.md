# Contributing

Contributions are very welcome — this doctrine only gets sharper by running into real projects, and every one of them surfaces something worth fixing or adding. No permission or big change needed: a one-line fix, a missing case, a new guide all count. If you're not sure whether something is worth raising, open the issue anyway.

Ideas for where to start:

- **Write the cookbook your stack is missing.** Vue (no Nuxt), Svelte, Astro and Bun are auto-detected (`AGENTS.md` Step 1/3) but only follow the general playbook — Nuxt, React and Laravel are the only ones with a dedicated `docs/testing-guide/*.md` so far. Highest-value contribution right now.
- **Fix a snippet or command that's drifted.** Every code example here should reflect the real API of the tool it names.
- **Tell us where a rule doesn't fit.** If a Guardrail or a Step in `AGENTS.md` conflicts with something you can't avoid in a real codebase, open an issue — the doctrine should describe what actually works, not what sounds right on paper.
- **Report scaffolder or hook bugs.** `bin/test-casebook.mjs` and `.claude/hooks/test-casebook-gate.mjs` are plain Node scripts — wrong file matched/missed, a flag that doesn't do what it says, anything.
- **Share a worked example.** The Laravel guide's permission-matrix example (roles + a private article, run for real, 28/28 green) started as exactly this kind of contribution.

No process beyond that: fork, branch, PR against `main`. Mention what you verified it against (a real running project beats reasoning from the docs) so reviewers can move fast — but don't let an imperfect PR stop you from opening it.

## Releasing (maintainers)

Publishing is automated. Bump `version` in `package.json`, add the matching entry to `CHANGELOG.md`, and open a PR against `main` — once it's merged, CI publishes that version to npm on its own (`.github/workflows/publish.yml`), by comparing `package.json`'s version against what's currently on the registry. Nothing to run by hand, and nothing publishes if the version didn't change.
