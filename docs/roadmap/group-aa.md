> Back to [Roadmap Index](./README.md)

# Group AA — (TBD)
> Back to [Roadmap Index](./README.md)

# Group AA — HG Brand Theming (Dark)

> Scope: Adapt the HG Insights brand identity into a dark-mode design system for the Content Engine app. This group defines the complete visual language: an HG-branded dark color palette, typography scale, navigation chrome, page-level styling patterns, button/control appearance, data visualization colors, and motion conventions. It produces updated design tokens in `globals.css`, a branded navigation shell, and page-by-page migration of all existing surfaces to the new visual identity.
> Dependencies: [Group S](./group-s.md) Phase 1 (semantic token layer, `cn()` utility). Group S Phases 2+ (shared primitives) are recommended but not blocking; AA token updates will flow through primitives automatically once S4–S9 ship. If AA ships before S Phase 2, the token values still apply to inline Tailwind classes via the semantic token names.

## Why This Matters

The Content Engine currently uses a generic dark gray palette with default Tailwind blue accents. It works, but it looks like a developer prototype, not an HG Insights product. Every other HG-branded deliverable (battle cards, one-pagers, insight reports, solution briefs, decks) follows a cohesive visual identity. The app that produces those deliverables should feel like the same brand.

This isn't a cosmetic pass. A consistent brand layer:

1. **Builds internal credibility.** When leadership and cross-functional teams see the tool, it should look intentional and professional, not scaffolded.
2. **Reduces design drift.** With brand tokens defined once, every new page and component inherits the right colors, type scale, and spacing without per-feature decisions.
3. **Aligns the toolchain.** The same accent blue (`#2563EB`) that appears in battle card headers and insight report charts appears in the app's primary buttons and active nav states. One brand, one system.

## Contrast Audit Results

A programmatic WCAG contrast audit was run against the initial color proposal. The findings drove the consolidated palette below. Key issues caught and fixed:

1. **text-tertiary (`#64748B`) fails WCAG AA on all surfaces.** Ratio 3.19–3.93, needs 4.5:1. Fixed by bumping to `#7C8DA4` (ratio 5.0+ on all surfaces).
2. **text-muted (`#475569`) fails WCAG AA *and* AAA on all surfaces.** Ratio 2.0–2.47. This is intentional for placeholders and disabled text (WCAG allows sub-AA for disabled/inactive elements), but the original value was too dark even for that role. Fixed by bumping to `#556B82` (ratio 3.1+ on all surfaces, passing AA-large for any visible-but-deemphasized text).
3. **HG Blue (`#2563EB`) as text on dark surfaces fails AA.** Ratio 3.3–3.6. Blue text should only appear at heading/label size (16px+ bold), where AA-large (3:1) applies, or use `#60A5FA` for body-sized blue text.
4. **HG Navy (`#1B3A5C`) as text is invisible on dark surfaces.** Ratio 1.3–1.6. Navy must never be used as a text color in the dark theme. It is only valid as a decorative/background element.
5. **Button text on hover backgrounds fails AA.** `#F1F5F9` on `#3B82F6` = 3.36, on `#EF4444` = 3.44. Fixed by using `#FFFFFF` for button text (ratio 4.6+ on all button backgrounds).
6. **border-default is nearly invisible against card and input surfaces.** Ratio 1.11–1.25. Fixed by lightening to `#263A58` (ratio 1.5+ on all surfaces).
7. **Four surface levels are indistinguishable.** Page/card/elevated/input ratios are 1.06–1.13. Reduced to three surface levels and increased the spread between them.

## Consolidated Color Palette

Design principle: **fewer colors, more contrast.** The original proposal had 39 distinct color values with significant duplication and near-duplicates. The consolidated palette has **21 unique values** organized into 5 groups. Every combination has been validated for its intended use.

### Surfaces (3 levels)

| Token | Hex | Step Ratio | Usage |
|---|---|---|---|
| `surface-page` | `#0B1121` | — | Page background. Navy-tinted near-black. |
| `surface-card` | `#162032` | 1.15 vs page | Cards, panels, sidebar. |
| `surface-input` | `#243550` | 1.32 vs card | Inputs, selects, textareas, dropdowns, popovers. |
| `surface-overlay` | `oklch(0 0 0 / 0.7)` | n/a | Modal/dialog backdrop. |
| `surface-active` | `oklch(from #2563EB l c h / 0.10)` | n/a | Active/selected row or nav item tint. Applied on top of card surface. |

Page-to-input total ratio is 1.52, which is enough for the eye to register three distinct layers when stacked (e.g., a form input inside a card on a page).

### Border (1 level + accent)

| Token | Hex | Visibility | Usage |
|---|---|---|---|
| `border-default` | `#3A5070` | 2.29 vs page, 1.99 vs card, 1.51 vs input | Single border value for cards, inputs, dividers. Visible on every surface. |
| `border-focus` | `#2563EB` | 3.16 vs card | Focus rings, active tab indicators, accent borders. HG Blue accent. |

`border-hover` is removed. On hover, elements transition from `border-default` to `border-focus` (the accent blue). This gives a clear, branded hover signal without needing a third border color that was previously only 1.44 ratio away from `border-default`. Two border states (resting and active/focused) are sufficient.

**Contrast budget note**: `border-default` at `#3A5070` is light enough that text should never be placed directly on top of it (text-secondary on border = 3.20, below AA). Borders are non-text elements, so WCAG text contrast does not apply to them, but this rules out using the border color as a background for any text-bearing element.

### Text (4 levels)

All validated against `surface-card` (`#162032`, the most common text container). Ratios against `surface-input` (`#243550`) are noted where they constrain usage.

| Token | Hex | Ratio vs card | Ratio vs page | Ratio vs input | Usage |
|---|---|---|---|---|---|
| `text-primary` | `#F1F5F9` | 14.90 (AAA) | 17.17 (AAA) | 11.28 (AAA) | Headings, body text, primary labels. Safe everywhere. |
| `text-secondary` | `#94A3B8` | 6.36 (AA) | 7.34 (AAA) | 4.82 (AA) | Descriptions, secondary labels. Safe everywhere. |
| `text-tertiary` | `#7C8DA4` | 4.82 (AA) | 5.56 (AA) | 3.65 (AA-lg only) | Metadata, timestamps, captions. On page and card surfaces: full AA pass. **On input surfaces: use only at 12px+ bold (AA-large) or pair with `text-secondary` instead.** |
| `text-muted` | `#556B82` | 2.96 (AA-lg) | 3.41 (AA-lg) | 2.24 (below AA-lg) | Placeholders and disabled text only. Never use inside input fields as readable content; input placeholder text should use `text-tertiary` instead. Muted is for decorative/disabled labels on card and page surfaces only. |

`text-link` is removed as a separate token. Links use `hg-blue-bright` (`#60A5FA`), which passes AA on all surfaces at 5.63–7.40.

**Usage constraint summary**: `text-tertiary` and `text-muted` should not appear as meaningful text on `surface-input`. Inside form fields, use `text-secondary` for help text and `text-tertiary` (bold only) for labels. Placeholder text inside inputs uses the browser's native placeholder rendering, which is expected to be lower-contrast.

### Accent (3 values, not 8)

The original proposal defined 8 blue values (`hg-blue`, `hg-navy`, `hg-navy-light`, `border-accent`, `chart-1` through `chart-4`) that resolved to just 4 unique hex codes, several of which were duplicates of existing tokens. Consolidated to 3 functional blues:

| Token | Hex | Role | Contrast vs card | Contrast vs input |
|---|---|---|---|---|
| `hg-blue` (accent) | `#2563EB` | Primary action buttons, focus rings, accent borders, active indicators, chart primary. The canonical HG brand color. | 3.16 (AA-large only) | 2.39 (below AA-lg; do not use as text on inputs) |
| `hg-blue-bright` | `#60A5FA` | Links, info status, chart secondary. Body-safe blue text on any surface. | 6.42 (AA) | 4.86 (AA) |
| `hg-blue-muted` | `#93C5FD` | Chart tertiary, decorative fills, light accents. | 9.06 (AAA) | 6.86 (AAA) |

`hg-navy` and `hg-navy-light` are removed as text/UI tokens. Navy is baked into the surface tints; it should never appear as a foreground color on dark backgrounds (contrast ratio 1.3–1.6, completely unreadable). If the logo requires navy rendering, use an SVG with the navy fill on a white or light badge element.

### Status (4 hues, no separate "danger" in actions)

| Role | Text | Background Tint | Text vs card |
|---|---|---|---|
| Success | `#34D399` | `oklch(from #059669 l c h / 0.12)` | 8.95 (AAA) |
| Warning | `#FBBF24` | `oklch(from #D97706 l c h / 0.12)` | 10.31 (AAA) |
| Danger | `#F87171` | `oklch(from #DC2626 l c h / 0.12)` | 5.90 (AA). Note: 4.47 on `surface-input`; danger status text on input backgrounds should use `text-primary` for the message and `status-danger` only for icons/indicators. |
| Info | `#60A5FA` | `oklch(from #2563EB l c h / 0.12)` | 7.09 (AAA) |

Action buttons for destructive actions reuse `status-danger` for text and `status-danger-bg` for tinted backgrounds (ghost/secondary variants), or `#DC2626` as the solid button background with `#FFFFFF` text (contrast 4.63, AA pass). The separate `action-danger` / `action-danger-hover` tokens are removed; use `danger` status tokens instead.

### Actions (simplified)

| Token | Value | Text Color | Text Contrast | Usage |
|---|---|---|---|---|
| `action-primary` | `#2563EB` | `#FFFFFF` | 4.72 (AA) | Primary button background |
| `action-primary-hover` | `#3B82F6` | `#FFFFFF` | 3.97 (AA-lg) | Primary button hover. Button text is large/bold, so AA-large (3:1) applies. |
| `action-danger` | `#DC2626` | `#FFFFFF` | 4.63 (AA) | Destructive button background |
| `action-danger-hover` | `#EF4444` | `#FFFFFF` | 3.59 (AA-lg) | Destructive button hover. Same AA-large rationale. |

Button text is always `#FFFFFF`, not `#F1F5F9`. The extra 0.3 contrast points matter at the AA threshold.

---

## Token Count: Before vs After

| Category | Original Proposal | Consolidated | Removed / Merged |
|---|---|---|---|
| Surfaces | 5 (`page`, `card`, `input`, `elevated`, `active`) | 4 (`page`, `card`, `input`, `active`) | `elevated` merged into `input` |
| Borders | 4 (`default`, `hover`, `focus`, `accent`) | 2 (`default`, `focus`) | `hover` removed (use `focus` on hover); `accent` merged into `focus` |
| Text | 5 (`primary`, `secondary`, `tertiary`, `muted`, `link`) | 4 (`primary`, `secondary`, `tertiary`, `muted`) | `link` uses `hg-blue-bright` directly |
| Accent/Brand | 7 (`hg-navy`, `hg-navy-light`, `hg-blue`, `chart-1` to `chart-4`) | 3 (`hg-blue`, `hg-blue-bright`, `hg-blue-muted`) | Navy tokens removed; chart tokens use accent tokens directly |
| Actions | 4 | 4 | Same count, but text changed to `#FFFFFF` |
| Status | 8 (4 text + 4 bg) | 8 (4 text + 4 bg) | Unchanged |
| **Total unique hex values** | **39** | **20** | **19 removed** |

---

## Architecture Decisions

**Navy-tinted surfaces, not pure gray.** The biggest visual shift. Pure gray surfaces (`gray-950`, `gray-900`) feel generic. Navy-tinted darks (`#0B1121`, `#162032`) create a branded atmosphere without being distracting. The tint is subtle enough that content remains the focus, but screenshots and demos immediately read as "HG."

**Three surface levels, one border.** Four dark values total, each clearly distinguishable. Page-to-card (1.15), card-to-input (1.32), input-to-border (1.51). The border value (`#3A5070`) is visible on every surface at 1.5+ ratio. Hover state uses the accent blue instead of a separate border-hover color.

**Three blues, not eight.** `#2563EB` (accent, large text only), `#60A5FA` (body-safe blue text), `#93C5FD` (decorative/chart fills). Charts use these same three values in order; no separate chart token namespace needed.

**No navy as foreground.** HG Navy (`#1B3A5C`) has a luminance of 0.04, which is nearly identical to the dark surfaces. It cannot function as text or icon color. Navy is encoded in the surface tints instead.

**White button text, always.** `#FFFFFF` on action backgrounds instead of `#F1F5F9`. The 0.3 ratio difference pushes `action-primary` from borderline to solid AA pass.

**Slate scale for text hierarchy.** The Slate scale (`F1F5F9`, `94A3B8`, `7C8DA4`, `556B82`) carries a cool blue undertone that harmonizes with the navy surfaces. `text-tertiary` was bumped from Slate 500 to a custom midpoint to clear the AA 4.5:1 threshold.

**12% opacity status backgrounds.** Reduced from the current 15%. On navy-tinted surfaces, 15% tints look too saturated. 12% provides the same visual signal with better balance.

**Inter font consideration.** HG branded deliverables use Inter. The app uses Geist Sans. This group does NOT change the app font. Geist is purpose-built for UI; Inter is optimized for print/document rendering. If font alignment becomes a priority, it can be handled in a future group by swapping the `next/font` import. The token layer makes this trivial.

---

## Phase 1 — Token Migration and Brand Foundation — **Done**

**AA1 — Update Semantic Token Values** — ✅ Done (2026-03-24)
Update the `@theme inline` block in `app/globals.css` to use the consolidated HG-branded dark values from the palette tables above. This is a token-value swap; no structural changes to the CSS. Every component already consuming semantic tokens (e.g., `bg-surface-card`, `text-text-primary`, `border-border-default`) will automatically pick up the new colors.

Remove `surface-elevated` (use `surface-input` instead). Remove `border-accent` and `border-hover` (use `border-focus` for both hover and accent). Remove `text-link` (use `hg-blue-bright` directly).

Update the `:root` block:
```css
:root {
  --background: #0B1121;
  --foreground: #F1F5F9;
}
```

**Acceptance**: `npm run build` passes. All pages render with navy-tinted surfaces instead of neutral gray. Programmatically verify: `text-primary` on `surface-input` >= 4.5:1, `text-tertiary` on `surface-input` >= 4.5:1, `#FFFFFF` on `action-primary` >= 4.5:1.

**AA2 — Add New Brand Tokens** — ✅ Done (2026-03-24)
Add only the new tokens needed: `hg-blue` (`#2563EB`), `hg-blue-bright` (`#60A5FA`), `hg-blue-muted` (`#93C5FD`), `surface-active`. Total of 4 new tokens.

**Acceptance**: New tokens resolve as Tailwind utility classes. Verify with a temporary test element.

**AA3 — Update DESIGN_TOKENS.md** — ✅ Done (2026-03-24)
Update `docs/DESIGN_TOKENS.md` to reflect all changed token values and new tokens. Add a "Brand Reference" section at the top documenting the HG source palette and the dark adaptation rationale.

**AA4 — Phase 1 Validation** — ✅ Done (2026-03-24)
Visual smoke test: navigate all pages (`/`, `/knowledge`, `/skills`, `/connections`, `/bulk-upload`, `/queue`, `/dashboard`, `/admin/users`, `/workflows`, `/auth/signin`). Verify navy-tinted backgrounds render. Verify no text readability regressions. Verify status badges and action buttons use updated accent/status colors. Run `npm run build`. Spot-check three pages for WCAG AA contrast on primary text against card and page surfaces.

---

## Phase 2 — Navigation Shell and App Chrome — **Done**

**AA5 — Sidebar Navigation Component** — ✅ Done (2026-03-24)
Create `app/components/layout/sidebar-nav.tsx`. The Content Engine currently has no persistent navigation; each page has its own back-link and the home page is a card grid. As the app grows, a sidebar is necessary.

```tsx
interface SidebarNavProps {
  currentPath: string;
}
```

Design spec:

| Element | Style |
|---|---|
| Sidebar container | `w-sidebar bg-surface-card border-r border-border-default` fixed left, full height |
| Logo area | "Content Engine" wordmark in `text-text-primary font-semibold`, with a small "HG" mark rendered in `text-hg-navy` or as an SVG. Top of sidebar, `px-5 py-6`. |
| Nav group label | `text-[11px] font-semibold uppercase tracking-widest text-text-muted px-5 mt-6 mb-2` |
| Nav item (default) | `flex items-center gap-3 px-5 py-2.5 text-sm text-text-secondary rounded-lg mx-2 transition-colors` |
| Nav item (hover) | `hover:bg-surface-input hover:text-text-primary` |
| Nav item (active) | `bg-surface-active text-hg-blue-bright border-l-2 border-border-focus` |
| Nav item icon | 18px, `text-text-tertiary` (default), `text-hg-blue-bright` (active). Replace Unicode glyphs with Lucide icons. |
| User menu area | Bottom of sidebar, `border-t border-border-default px-5 py-4`. Shows avatar/initials, name, role. |

Nav groups and items:

| Group | Items |
|---|---|
| Core | Knowledge Base, Skills Library, Content (coming soon), Generate (coming soon) |
| Operations | Review Queue, Bulk Upload, Workflows, Connected Systems |
| Intelligence | Dashboard |
| Admin | User Management, Roles & Permissions, Audit Log |

Admin group only renders for users with admin role.

**AA6 — App Shell Layout** — ✅ Done (2026-03-24)
Create `app/components/layout/app-shell.tsx`. Wraps the sidebar and main content area:

```tsx
interface AppShellProps {
  children: React.ReactNode;
}
```

Renders: `<div className="flex min-h-screen">` containing the `SidebarNav` (fixed, `w-sidebar`) and a `<main>` area (`flex-1 ml-sidebar`). The main area applies `bg-surface-page min-h-screen`.

Integrate into `app/layout.tsx` so all authenticated routes get the shell. The `/auth/signin` route renders without the shell (full-page layout).

**AA7 — Top Bar Component** — ✅ Done (2026-03-24)
Create `app/components/layout/top-bar.tsx`. A slim top bar inside the main content area (not the sidebar) that provides:

| Element | Style |
|---|---|
| Container | `h-14 border-b border-border-default bg-surface-card px-6 flex items-center justify-between` |
| Breadcrumb | `text-sm text-text-tertiary` with `>` separators; current page segment in `text-text-primary font-medium` |
| Right actions | Role toggle, global search (placeholder), user quick-actions |

The top bar replaces the per-page header boilerplate currently duplicated in every page. Pages still define their own title and actions (via `PageLayout` from Group S), but the top bar handles global chrome.

**AA8 — Accent Bar** — ✅ Done (2026-03-24)
Add a `4px` accent bar at the very top of the viewport, full-width, `bg-hg-blue`. This mirrors the accent bar in every HG branded deliverable (one-pagers, insight reports, battle cards). It's a subtle brand signal that ties the app to the rest of the HG visual ecosystem.

Implementation: a `<div className="h-1 bg-hg-blue fixed top-0 left-0 right-0 z-50" />` in the root layout.

**AA9 — Phase 2 Validation** — ✅ Done (2026-03-24)
Verify: sidebar renders with correct nav groups and items. Verify: active state highlights current route. Verify: admin nav group is hidden for non-admin users. Verify: top bar breadcrumb updates on navigation. Verify: accent bar is visible at the top of every page. Verify: `npm run build` passes. Verify: sidebar collapses gracefully on narrow viewports (responsive behavior; may defer to Phase 4).

---

## Phase 3 — Typography Scale and Content Styling — **Done**

**AA10 — Define Typography Scale** — ✅ Done (2026-03-24)
Establish a formal type scale in `globals.css` tokens. The current app uses ad-hoc `text-sm`, `text-xs`, `text-3xl` classes without a system. Define a scale that aligns with HG brand typography proportions:

| Token | Tailwind Utility | Size | Weight | Line Height | Usage |
|---|---|---|---|---|---|
| `--text-display` | `text-display` | `30px` | `800` | `1.2` | Page titles (one per page) |
| `--text-heading` | `text-heading` | `20px` | `700` | `1.3` | Section headings |
| `--text-subheading` | `text-subheading` | `16px` | `600` | `1.4` | Card titles, sub-sections |
| `--text-body` | `text-body` | `14px` | `400` | `1.6` | Default body text |
| `--text-body-sm` | `text-body-sm` | `13px` | `400` | `1.55` | Dense body text, table cells |
| `--text-caption` | `text-caption` | `12px` | `500` | `1.4` | Metadata, timestamps, badges |
| `--text-micro` | `text-micro` | `11px` | `500` | `1.3` | Fine print, footnotes |
| `--text-label` | `text-label` | `11px` | `700` | `1.0` | Uppercase labels, nav group headers |

These are semantic aliases, not replacements for Tailwind's type scale. They exist so builders can use `text-display` instead of remembering `text-[30px] font-extrabold leading-[1.2]`.

**AA11 — Heading and Label Styling Conventions** — ✅ Done (2026-03-24)
Define how headings and labels render across the app:

- Page title: `text-display text-text-primary` (only one per page, rendered by `PageLayout`)
- Section heading: `text-heading text-text-primary`
- Card title: `text-subheading text-text-primary`
- Section label (e.g., "System Status", "Modules"): `text-label uppercase tracking-widest text-text-muted`
- Form label: `text-caption font-medium text-text-secondary`
- Metadata: `text-caption text-text-tertiary`

Document these in `docs/UI_STANDARDS.md` (created by Group S Phase 5, or created here if S20 hasn't shipped yet).

**AA12 — Phase 3 Validation** — ✅ Done (2026-03-24)
Verify: type scale tokens resolve as Tailwind utilities. Spot-check three pages to confirm heading hierarchy is visually clear (display > heading > subheading > body). Verify: no type scale token conflicts with existing Tailwind classes.

---

## Phase 4 — Page-Level Styling Migration — **Done**

**AA13 — Home Page Rebrand** — ✅ Done (2026-03-24)
Restyle `app/page.tsx` to use the new brand tokens and navigation shell:

- Remove the inline nav card grid (sidebar handles navigation now)
- Redesign as a dashboard landing: system status card, recent activity summary, quick-action buttons
- Apply `bg-surface-page`, `bg-surface-card` surfaces
- Replace Unicode icon glyphs with Lucide icons
- Apply type scale tokens to all headings and labels
- Status badges: use `bg-status-success-bg text-status-success` / danger variants with updated brand colors

**AA14 — Auth/Sign-In Page** — ✅ Done (2026-03-24)
Restyle `app/auth/signin/page.tsx`:

- Full-page centered layout (no sidebar)
- `bg-surface-page` background
- Centered card: `bg-surface-card border border-border-default rounded-card` with `max-w-sm`
- "Content Engine" wordmark + "by HG Insights" subtext
- 4px accent bar at top of card (matching global accent bar pattern)
- Google OAuth button: `bg-surface-input border border-border-default hover:border-border-focus`

**AA15 — List Page Pattern (Knowledge, Skills, Queue)** — ✅ Done (2026-03-24)
Apply a consistent list-page treatment to `/knowledge`, `/skills`, `/queue`:

- Page title via `PageLayout` with `text-display`
- Filter tabs: `bg-surface-card border border-border-default rounded-card p-1` container; active tab `bg-surface-active text-hg-blue-bright border-b-2 border-border-focus`
- Search input: uses semantic input tokens (already defined)
- Card items: `bg-surface-card border border-border-default rounded-card hover:border-border-focus transition-colors`
- Empty state: centered `text-text-muted` message with subtle illustration or icon

**AA16 — Detail Page Pattern (Knowledge/[id], Skills/[id], Queue/[id])** — ✅ Done (2026-03-24)
Apply a consistent detail-page treatment:

- Back link: `text-hg-blue-bright hover:text-hg-blue-muted` with left arrow icon
- Title row: `text-display` title + status badge + action buttons
- Content area: two-column layout on `lg:` breakpoint (content left, metadata sidebar right)
- Metadata sidebar: `bg-surface-card border border-border-default rounded-card p-5` with `text-caption` labels and `text-body-sm` values
- Markdown content: apply branded markdown styles (headings in `text-text-primary`, code blocks in `bg-surface-input border border-border-default rounded-lg`, links in `text-hg-blue-bright`)

**AA17 — Form Page Pattern (New/Edit pages)** — ✅ Done (2026-03-24)
Apply a consistent form-page treatment to `/knowledge/new`, `/knowledge/[id]/edit`, `/skills/new`, `/skills/[id]/edit`, `/connections/new`, `/connections/[id]/edit`:

- Form container: `bg-surface-card border border-border-default rounded-card p-6`
- Form sections: separated by `border-t border-border-default pt-6 mt-6`
- Submit button: `bg-action-primary hover:bg-action-primary-hover text-text-primary`
- Cancel button: secondary variant (transparent, `border-border-default`)

**AA18 — Admin Pages** — ✅ Done (2026-03-24)
Apply brand treatment to `/admin/users`, `/admin/roles`, `/admin/audit`:

- Table styling: `bg-surface-card` container, `border-border-default` row borders, `bg-surface-elevated` header row, `text-text-secondary` header text, `text-text-primary` cell text
- Action buttons in table rows: ghost variant, `text-text-tertiary hover:text-text-primary`

**AA19 — Phase 4 Validation** — ✅ Done (2026-03-24)
Full smoke test of all pages. Verify: consistent surface/border/text token usage across all migrated pages. Verify: no remaining raw `gray-*` class references in migrated files. Verify: navigation shell integrates cleanly. Verify: responsive behavior is acceptable on `md:` and `lg:` breakpoints (detailed responsive work can be a follow-up). Verify: `npm run build` passes.

---

## Phase 5 — Data Visualization and Status Styling — **Done**

**AA20 — Chart Color Conventions** — ✅ Done (2026-03-24)
Charts use the three accent blues directly (`hg-blue`, `hg-blue-bright`, `hg-blue-muted`) plus `status-success` for positive/green data. No separate chart token namespace; this keeps the palette tight. If more than 4 series are needed in a single chart, add opacity variants of the existing blues (e.g., `hg-blue` at 50%).

Recommended chart backgrounds: `bg-surface-card` container with subtle `border-border-default`. Chart grid lines: `border-border-default` at 50% opacity. Axis labels: `text-text-tertiary text-caption`.

**AA21 — Status Badge Palette Validation** — ✅ Done (2026-03-24)
Verify that all status badge combinations (success, warning, danger, info, default, purple) render correctly against the new navy-tinted surfaces. The `oklch` opacity-based backgrounds may need fine-tuning once they're rendered against `#111B2E` (card) and `#0C1220` (page). Adjust opacity values if any badge variant lacks sufficient contrast.

**AA22 — Phase 5 Validation** — ✅ Done (2026-03-24)
Verify: dashboard page charts/metrics use chart tokens. Verify: all badge variants are legible on both page and card surfaces. Verify: contrast ratios pass WCAG AA for all status text colors against their respective background tints.

---

## Risks and Gaps

| Risk | Impact | Mitigation |
|---|---|---|
| Navy-tinted surfaces look too blue on certain monitors | Users perceive the UI as "blue" rather than "dark" | Keep the tint subtle (5-8% lightness with low chroma). Validate on at least two different display profiles. Provide a fallback path to pure gray if feedback is negative. |
| Contrast regressions on text-muted and text-tertiary | Placeholder text or metadata becomes unreadable on navy surfaces | Validate WCAG AA contrast for every text token against every surface token. The Slate scale was chosen specifically for its blue undertone compatibility. |
| Sidebar width consumes too much horizontal space | Content area feels cramped on 1280px screens | Use `w-sidebar` (320px) on `xl:` and above; collapse to icon-only (64px) on smaller viewports. Full collapse logic may require a separate task. |
| Group S Phase 2 ships after AA | Primitives won't exist yet to consume the new tokens | AA is designed to be token-first. Updated token values apply to inline Tailwind classes as well. When S Phase 2 ships, primitives automatically inherit AA colors. |
| Purple badge variant on navy surfaces | Purple badges may look muddy against navy-tinted surfaces | Test the `purple` badge variant specifically. May need to shift its background tint lighter or increase opacity. |

## Open Questions

| Question | Context |
|---|---|
| Sidebar collapse behavior | Should the sidebar collapse to icons on `md:` breakpoint, or use a hamburger-menu overlay on mobile? The app is internal-only and primarily used on desktops, but tablet access may grow. |
| Logo asset | Should the sidebar display an SVG version of the HG Insights logo, or a text-only "Content Engine" wordmark? If SVG, the logo needs a light/white variant since HG Navy is invisible on dark surfaces. |
| Font alignment | Geist Sans (app) vs. Inter (HG brand deliverables). Keep Geist for now, or switch to Inter for full brand alignment? Switching is trivial via `next/font` but changes the feel of the UI. |
| Accent bar scope | The 4px accent bar is in every HG deliverable. Should it also appear inside modal dialogs and slide-over panels, or only at the page level? |

## Recommended Build Order

| Step | Effort | Dependencies |
|---|---|---|
| AA1 — Update Semantic Token Values | S  | Group S Phase 1 (done) |
| AA2 — Add New Brand Tokens | S  | AA1 |
| AA3 — Update DESIGN_TOKENS.md | S  | AA2 |
| AA4 — Phase 1 Validation | S  | AA1-AA3 |
| AA5 — Sidebar Navigation Component | M  | AA2 |
| AA6 — App Shell Layout | M  | AA5 |
| AA7 — Top Bar Component | S  | AA6 |
| AA8 — Accent Bar | XS | None |
| AA9 — Phase 2 Validation | S | AA5-AA8 |
| AA10 — Define Typography Scale | S  | AA1 |
| AA11 — Heading and Label Conventions | S  | AA10 |
| AA12 — Phase 3 Validation | S  | AA10-AA11 |
| AA13 — Home Page Rebrand | M  | AA6, AA10 |
| AA14 — Auth/Sign-In Page | S | AA1 |
| AA15 — List Page Pattern | M  | AA6, AA10 |
| AA16 — Detail Page Pattern | M  | AA6, AA10 |
| AA17 — Form Page Pattern | M  | AA6, AA10 |
| AA18 — Admin Pages | M  | AA6, AA10 |
| AA19 — Phase 4 Validation | M  | AA13-AA18 |
| AA20 — Chart Color Tokens | S | AA2 |
| AA21 — Status Badge Palette Validation | S  | AA1 |
| AA22 — Phase 5 Validation | S  | AA20-AA21 |

Total estimated effort: ~30-40 hours across 5 phases.

Phases 1 and 3 can run in parallel (tokens and type scale are independent). Phase 2 (navigation shell) can start as soon as AA2 is complete. Phase 4 depends on both Phase 2 (shell) and Phase 3 (type scale). Phase 5 can run any time after Phase 1.