# MUGRAD Practice Room

A dependency-free, single-learner practice app with six C1-level MUGRAD problem sets, immediate Thai explanations, linked grammar notes, flags, and a compact progress dashboard.

## Run

```bash
npm run serve
```

Then open <http://localhost:4173>. Any ordinary static web server works in production.

## Validate content

```bash
npm run validate
```

Each authored set is an editable JSON file in `data/problem-sets/`. The validator checks unique IDs, 20 questions per set, answer references, four choices/candidates, short error-recognition underlines, Thai explanations, and grammar-topic links.

## Persistence

Attempts and flags are stored in the current browser's `localStorage`. The Progress page can export or import a JSON backup. This static app does not write learner state to the VPS filesystem.

## Content included

- Synonyms in Context — Sets 16 and 17
- Precision Fill-in — Sets 14 and 15
- Mixed Error Recognition — Sets 14 and 15

All six sets contain 20 questions. Error-recognition choices underline only short candidates; the fill-in sets mix vocabulary, word forms, participles, verb patterns, tenses, and conditionals.
