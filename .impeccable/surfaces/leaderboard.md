# Leaderboard

Mode: Operate. Route: `/leaderboard`. This extends smallbyte's existing learning interface.

## Direction contract

THESIS: Make the most active learners immediately discoverable in one concise ranked table. The user approved a table rather than podiums or summary cards.

OWN-WORLD: Inherit the existing paper background, white surfaces, ink rules, purple selected state, Display headings, system body font, and illustrated avatars. Preserve the existing design system.

STORY: Signed-in, onboarded learners see activity totals for the latest seven Korean calendar days, understand the counting rules, and recognize their own row when present. Ties share competition ranks, with GitHub-handle ordering.

FIRST VIEWPORT: Existing header gains the leaderboard link after history. Below the page heading and explanation, a date range precedes aligned rank, identity, and activity columns. The current learner is marked with a purple-tinted row and a textual “나” label. Loading, empty, and retry states occupy the table area.

FORM: User-approved compact ranked list within the existing interface; seed: none (unavailable). Mobile retains all columns and puts header navigation on its own row.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

Ordinary extension: compare against the incumbent interface; do not create or rewrite global DESIGN.md. No new shipping raster assets.

## Finish review

- Independent visual review: **ship**, with no material fixes. Compared desktop (1440px), mobile (390px), narrow (320px), loading, empty, and error captures against the incumbent history interface.
- Preserved existing typography, paper/white surfaces, purple own-row state, avatars, and navigation. Long synthetic test identities wrap fully at narrow widths.
- Compose browser verification covered navigation, history/back/reload, keyboard focus, own-row/tied-rank display, error recovery, empty-state action, loading, and authentication guards. Axe WCAG A/AA checks found no violations at all three widths; Impeccable's mechanical detector returned no findings.
- Captures used development-only synthetic activity data; no synthetic records or screenshots ship with the application.
