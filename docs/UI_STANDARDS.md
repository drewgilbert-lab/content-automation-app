# UI Standards

> Back to [Roadmap Index](./roadmap/README.md)

This doc defines UI coding standards for the Content Engine app. It covers typography conventions and heading hierarchy. For design token values, see [DESIGN_TOKENS.md](./DESIGN_TOKENS.md). For component APIs, see [COMPONENTS.md](./COMPONENTS.md) (planned).

## Typography Scale

| Token | Tailwind utility | Size | Weight | Line height | Usage |
| --- | --- | --- | --- | --- | --- |
| `--text-display` | `text-display` | 30px | 800 (extrabold) | 1.2 | Primary page title; one per page. |
| `--text-heading` | `text-heading` | 20px | 700 (bold) | 1.3 | Major content sections. |
| `--text-subheading` | `text-subheading` | 16px | 600 (semibold) | 1.4 | Card headers, sub-sections, dialog titles. |
| `--text-body` | `text-body` | 14px | 400 (normal) | 1.6 | Default paragraph and primary body copy. |
| `--text-body-sm` | `text-body-sm` | 13px | 400 (normal) | 1.55 | Table cells, compact lists, sidebar content. |
| `--text-caption` | `text-caption` | 12px | 500 (medium) | 1.4 | Secondary labels, metadata, form labels, table headers. |
| `--text-micro` | `text-micro` | 11px | 500 (medium) | 1.3 | Fine print, footnotes, smallest readable UI text. |
| `--text-label` | `text-label` | 11px | 700 (bold) | 1.0 | Uppercase section labels (eyebrows), nav group headers, category labels. |

**Important note:** These tokens encode size, line-height, and font-weight together. Using `text-display` applies all three properties. You do **not** need to add separate `font-*` or `leading-*` classes when using these tokens.

**Note about overlap with built-in Tailwind utilities:** `text-body` (14px) is the same size as Tailwind’s built-in `text-sm`, and `text-caption` (12px) matches `text-xs`. The semantic tokens should be preferred for new code because they include the correct line-height and weight for their role. Built-in utilities like `text-sm` remain valid for inline/ad-hoc usage but lack the semantic weight/line-height pairing.

## Heading Hierarchy

1. **Page title** — `text-display text-text-primary tracking-tight` — One per page. Maps to `<h1>`. The weight (800) is built into the token.
2. **Section heading** — `text-heading text-text-primary` — Major content sections. Maps to `<h2>`.
3. **Card title** — `text-subheading text-text-primary` — Card headers, sub-sections, dialog titles. Maps to `<h3>` or styled div.
4. **Body text** — `text-body text-text-primary` or `text-body text-text-secondary` — Default paragraph text. No heading element.
5. **Dense body text** — `text-body-sm text-text-primary` — Table cells, compact lists, sidebar content.
6. **Metadata** — `text-caption text-text-tertiary` — Timestamps, counts, supplementary info.
7. **Fine print** — `text-micro text-text-muted` — Footnotes, legal text, decorative labels.
8. **Section label (eyebrow)** — `text-label uppercase tracking-widest text-text-muted` — Uppercase section dividers, nav group headers, category labels. The weight (700) and line-height (1.0) are built into the token.

## Label Conventions

- **Form label**: `text-caption font-medium text-text-secondary` — Note: `text-caption` includes weight 500, but form labels override to `font-medium` (500) explicitly for clarity. If the built-in weight matches the desired weight, the explicit class is redundant but harmless.
- **Form help text**: `text-caption text-text-muted`
- **Form error text**: `text-caption text-status-danger`
- **Table header**: `text-caption text-text-secondary uppercase tracking-wider`
- **Badge text**: `text-caption` or `text-micro`, depending on badge size

## Usage Rules

1. **Semantic tokens first**: New components must use the typography scale tokens (`text-display`, `text-heading`, etc.) rather than raw Tailwind size classes (`text-3xl`, `text-xl`). Raw size classes in new code are a review flag.
2. **One `text-display` per page**: The display size is reserved for the primary page title. Using it for multiple headings on the same page dilutes the visual hierarchy.
3. **Don’t fight the weight**: The tokens include font-weight. If you need a different weight for a specific case, override with an explicit `font-*` class, but this should be rare. If it happens frequently, the token definition may need adjustment.
4. **Color is separate**: Typography tokens handle size, weight, and line-height. Text color is always applied separately via `text-text-primary`, `text-text-secondary`, and related utilities.
5. **Tracking is separate**: `tracking-tight` and `tracking-widest` are not built into the tokens. Apply them explicitly where the heading hierarchy specifies them (display titles get `tracking-tight`, labels get `tracking-widest`).

## Migration Notes

Existing pages used ad-hoc typography (e.g., `text-3xl font-semibold tracking-tight` for page titles). These were migrated to the semantic tokens in AA Phase 4 (AA13-AA18), completed 2026-03-24. The ad-hoc patterns below should no longer appear in migrated files. The mapping remains as a reference for any future migrations:

| Current pattern | Replacement |
| --- | --- |
| `text-3xl font-semibold tracking-tight` | `text-display tracking-tight` |
| `text-xl font-semibold` or `text-xl font-bold` | `text-heading` |
| `text-lg font-medium` | `text-subheading` |
| `text-sm` (body context) | `text-body` |
| `text-xs font-medium uppercase tracking-wider` | `text-label uppercase tracking-widest` |
| `text-[11px] font-semibold uppercase tracking-widest` | `text-label uppercase tracking-widest` |
| `text-[10px] font-medium` | `text-micro` |
