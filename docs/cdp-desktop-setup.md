# Agent « tâche test » — mise en place (chef de projet)

Cet agent transforme **une story en tâches de test dans Jira** : il lit la story, te pose quelques questions, puis crée **une sous-tâche par équipe** (front / back / mobile) reliée à la story. Chaque dev exécute ensuite sa sous-tâche de son côté. L'agent écrit **l'intention** (qui peut faire quoi, ce qui est interdit, ce qu'il faut re-vérifier) — jamais du code.

## Deux façons de l'utiliser dans Claude Desktop

### A. Rapide (pour tester) — donner le lien à lire
Dans Claude Desktop, avec le **connecteur Jira activé**, dis simplement :

> Lis ces instructions et applique-les pour créer la tâche test de STK-1234 :
> https://raw.githubusercontent.com/techmefr/test-casebook/main/.claude/skills/test-task/SKILL.md

Ton Claude lit le fichier et déroule le process.

### B. Durable — un Projet dédié
1. Claude Desktop → **nouveau Projet** (ex. « Tâche test »).
2. **Instructions du projet** : colle le contenu du skill (tout ce qui est **sous** le `---` du frontmatter) — fichier : [`.claude/skills/test-task/SKILL.md`](../.claude/skills/test-task/SKILL.md).
3. **Active le connecteur Atlassian / Jira** sur ce projet, **en écriture** (il doit pouvoir *créer* des sous-tâches).
4. Ouvre une story et dis : « crée la tâche test pour STK-1234 ».

## Ce qui va se passer

- Il **pose des questions**, une à la fois (états de permission / rôles, qui peut et **qui ne doit pas**, zones à risque de régression). Réponds au mieux — en Desktop il ne lit pas le code, il s'appuie sur la story + tes réponses.
- Il **confirme le plan** avant de créer quoi que ce soit dans Jira.
- Il crée **une sous-tâche par équipe** : label = l'équipe (`front` / `back` / `mobile`), assignee = le dev si tu le donnes, reliée à la story.

## À savoir pour un premier essai

- **Teste d'abord sur une story bac-à-sable**, pas sur un vrai ticket en cours : l'agent crée de **vraies** sous-tâches Jira.
- Le connecteur Jira doit avoir le **droit d'écriture** (création d'issues), sinon il ne pourra que lire.
- Si une équipe n'a pas encore de moyen de **piloter l'état de permission** dans ses tests (fournir le gate / la permission en entrée, ou de vrais comptes de test en E2E), l'agent le **signale** dans la sous-tâche plutôt que de faire semblant.
