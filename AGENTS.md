# MUGRAD Practice Room

## Product contract

Keep this a dependency-free static app for one learner preparing for a MUGRAD score above 90. The interface is English-first with immediate Thai explanations. Authored English should be academically themed, understandable without specialist knowledge, and C1-level where appropriate.

Use browser `localStorage` for attempts and flags. The app cannot write state to the VPS filesystem. Preserve JSON export/import and the confirmation-gated progress reset.

## Pages and routes

- `#/sets`: landing page, progress per set, and filters for all/synonym/fill-in/error-recognition sets.
- `#/practice/:setId`: one question at a time, locked submission, immediate answer, Thai explanation, grammar links, flags, and question navigation. After submission, synonym and fill-in feedback shows Thai definitions for all four choices.
- `#/solutions/:setId`: read-only all-in-one review with every question, answer, and Thai explanation. Synonym and fill-in items also show all four choice definitions.
- `#/grammar` and `#/grammar/:topicId`: searchable Thai grammar reference, examples, topic flags, and focused topic routing.
- `#/dashboard`: attempts, accuracy, minimum-three-attempt proficiency labels, flagged items, JSON backup/restore, and progress reset.

## Content contracts

Authored problem sets live in `data/problem-sets/`; one JSON file equals one 20-question set. Add every set filename to `data/manifest.json`. IDs must be stable and globally unique.

### Synonyms

- Use `type: "synonym"` and exactly four choices.
- Bold the target word in `prompt` with `**word**`.
- Use C1 academic vocabulary without repeatedly recycling a narrow word pool.
- Set `correctChoiceId`, a Thai explanation, and suitable tags.

### Fill in

- Use `type: "fill-in"`, `__` for the blank, and exactly four choices.
- Mix lexical selection with adjective/adverb/noun forms, -ed/-ing forms, verb patterns, tenses, and conditionals.
- Set relevant `grammarTopicIds`; every referenced ID must exist in `data/grammar-topics.json`.

### Error recognition

- Use `type: "error-recognition"` and ordered `segments`.
- Provide exactly four underlined candidates, each no longer than five words. Underline short words or phrases rather than clauses.
- Mix nuanced grammar concepts across a set.
- `correctSegmentId` must identify an underlined segment. Include corrected wording in `correction` and a Thai explanation.

### Choice definitions

Every distinct synonym and fill-in choice must have a concise Thai gloss in `data/choice-definitions.json`, keyed by the exact choice text. For inflected or multiword grammar choices, explain both meaning and grammatical form where useful. Reuse an existing entry only when its meaning remains accurate in context.

## Grammar topics

Maintain the single source of truth in `data/grammar-topics.json`. Each topic needs a stable ID, English and Thai names, Thai explanation, English rule, correct examples, incorrect examples, and valid related-topic IDs.

## Implementation boundaries

Use vanilla HTML, CSS, and ES modules. Extend the existing warm editorial design and accessibility patterns: semantic controls, visible focus, keyboard operation, meaningful labels, color-independent feedback, responsive layouts, and reduced-motion support. Keep features small and avoid introducing a framework or build step.

Route links must use the `#/page/parameter` format understood by `js/app.js`; plain fragment links such as `#topic-id` are interpreted as routes and will fall back to the landing page.

## Deployment cache

When changing `index.html`, `assets/styles.css`, or `js/*.js`, bump the `?v=` query string for each changed CSS/JS asset in `index.html` before publishing. Verify the deployed `index.html` references the new version; if an HTML cache or proxy serves an older entry document, purge it or configure it to revalidate.

## Adding a set

1. Author a 20-question JSON file under `data/problem-sets/` using the matching type contract.
2. Add all new vocabulary-choice glosses to `data/choice-definitions.json`.
3. Add any genuinely required grammar topics to `data/grammar-topics.json`.
4. Add the filename to `data/manifest.json`.
5. Run `npm test` and `npm run validate`; both must pass.
6. Serve locally and verify set card → practice submission → explanation/grammar link → flag → refresh → dashboard, plus set card → complete solutions.

## Completion gate

Before publishing, require a clean `git diff --check`, passing tests, passing content validation, and a browser check of every changed user flow. Preserve unrelated authored content and learner-state behavior.
