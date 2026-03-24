> Back to [Roadmap Index](./README.md)

# Group S — Design System Foundation

> Scope: Establish a design system foundation for the Content Engine, including semantic design tokens, shared primitive components, page layout templates, consolidated organisms, and infrastructure fixes. This group addresses the accumulated visual and structural debt from the initial scaffolding, and creates the foundation for consistent, maintainable UI across all current and future modules.
> Dependencies: None. This group has no dependencies on other roadmap groups and can be built incrementally alongside feature work. However, all future UI work (Groups R, Q, and beyond) should consume the primitives established here rather than continuing to inline Tailwind classes with hardcoded values.

## Current State

### 1. Architecture Overview

Styling currently follows a **Tailwind v4 CSS-first** approach with a single global stylesheet and high inline utility usage in feature components. Tailwind is configured via `@import "tailwindcss"` and `@theme inline` in `app/globals.css`, with PostCSS configured through `@tailwindcss/postcss`. There is no `tailwind.config.*` file, no CSS Modules/CSS-in-JS layer, and no shared class composition utility (`cn`/`clsx`) in the app code.

### 2. Findings Table

| Severity | File | Pattern Found | Recommended Change |
|---|---|---|---|
| HIGH | `app/**/*.tsx` | Heavy repeated utility strings (`className=` used ~850 times across 48 files), especially for card/input/button shells | Introduce shared primitives (`Button`, `Input`, `Card`, `Badge`) and centralize repeated style recipes |
| HIGH | `app/**/*.tsx` | No `cn`/`clsx`/`twMerge` usage; template-literal class composition appears 44 times | Add `clsx` + `tailwind-merge` with a shared `cn()` helper and migrate high-churn components first |
| MEDIUM | `app/globals.css` | Minimal global architecture: no `@layer base/components/utilities`, no formal style sectioning beyond root/theme/body | Add structured `@layer` organization for base normalization and reusable semantic foundations |
| MEDIUM | `app/globals.css`; `app/layout.tsx` | `next/font` variables are configured in `layout.tsx`, but body font is hardcoded to Arial/Helvetica in globals | Switch body font to `var(--font-sans)` to align runtime rendering with font token intent |
| MEDIUM | `package.json`; repo root | No `prettier-plugin-tailwindcss` or tailwind class-order enforcement tooling present | Add Prettier + Tailwind plugin to normalize utility order and reduce style-review churn |
| MEDIUM | `app/**/*.tsx` | Responsive usage is sparse and uneven (`sm`: 8, `md`: 1, `lg`: 10, `xl`: 0) | Define and enforce a breakpoint strategy per component/layout type |
| LOW | `postcss.config.mjs` | PostCSS pipeline only includes `@tailwindcss/postcss` | Document expected plugin policy and add explicit plugins only if browser support requirements demand it |
| LOW | `app/layout.tsx` | Global CSS import is correctly centralized at root layout (`import "./globals.css"`) | Keep this pattern and codify “root-only global CSS imports” in standards docs |

### 3. Anti-Patterns Detected

- No shared class-composition utility (`cn`/`clsx`/`cva`) in active app code: **0** matches
- Repeated utility bundles (duplication hotspots):
  - `rounded-xl border border-gray-800 bg-gray-900`: **43** occurrences
  - `w-full rounded-lg border border-gray-700 bg-gray-800`: **31** occurrences
  - `transition-colors`: **69** occurrences
- Template-literal class composition (`className={\`...\`}`): **44** occurrences
- Utility-heavy styling footprint: `className=` in **48/49** TSX files, **~850** total occurrences
- Palette concentration on raw gray classes: **~791** `gray-*` class references
- Sparse upper-breakpoint usage: **0** `xl:` and **0** `2xl:` usage in scanned components

### 4. Quick Wins

1. Add `clsx` + `tailwind-merge` and a shared `cn()` helper.
2. Add Prettier with `prettier-plugin-tailwindcss` for deterministic class ordering.
3. Update `app/globals.css` body font to `var(--font-sans)` to match `next/font` configuration.
4. Extract high-repeat utility shells into low-risk primitives (`CardShell`, `FieldShell`, `PrimaryButton`).
5. Define a baseline responsive convention (`sm/md/lg`) and apply it to high-traffic surfaces first.

### 5. Architectural Recommendations

1. Establish a token-and-primitive styling layer (`globals.css` semantic tokens + `app/components/ui` primitives).
2. Move repeated visual variants to contract-driven APIs (size/intent/state variant maps) instead of ad hoc per-feature class strings.
3. Standardize styling governance:
   - class composition (`cn`)
   - class ordering enforcement (Prettier Tailwind plugin)
   - responsive conventions and accessibility style baselines
4. Execute a phased migration across high-change modules (`connections`, `queue`, `knowledge`) before long-tail cleanup.

## Architecture Decisions

**Token strategy**: Semantic tokens defined in `globals.css` via Tailwind v4's `@theme inline` directive. Tokens map Tailwind primitive values (e.g., `gray-900`) to semantic names (e.g., `surface-card`). Components consume semantic tokens via Tailwind utility classes (e.g., `bg-surface-card`). This avoids a separate token build step and stays within the existing Tailwind v4 workflow.

**Component location**: Shared primitives live in `app/components/ui/`. Feature-specific components remain in their feature directories but compose shared primitives. This follows the existing Next.js App Router convention where `app/components/` is the shared directory.

**Migration approach**: Incremental. New token classes and components are added first, then existing components are migrated file-by-file. No big-bang rewrite. The migration order is: tokens first (Phase 1), then atoms (Phase 2), then molecules and organisms (Phases 3-4). Each phase includes a migration sub-step that updates existing files to use the new primitives.

**Dark mode**: Removed. The app is internal-only and dark-mode-only. The dead `prefers-color-scheme` media query is removed and `globals.css` is simplified to a single dark theme. If light mode is ever needed, the semantic token layer makes it trivial to add later by swapping token values per media query.

**Interactive component foundation**: Complex interactive components (Dialog, Tabs, Listbox, Menu, Combobox, Popover, Switch, Disclosure, RadioGroup, Transition) use `@headlessui/react` from Tailwind Labs. Headless UI provides accessible behavior (focus trapping, keyboard navigation, ARIA roles, scroll locking) with zero styling opinions — components are styled directly with Tailwind utility classes and semantic tokens via `cn()`. Simple atoms (Button, Input, Badge, FormField) remain hand-rolled as thin wrappers around native HTML elements; Headless UI is only used where interactive behavior is too complex or accessibility-critical to implement correctly by hand. Alternative considered: shadcn/ui was evaluated but rejected due to its Radix UI dependency tree (10+ `@radix-ui/*` packages), its own CSS variable system that conflicts with the existing `@theme inline` token layer, and its Tailwind v3 origin. Headless UI is a single dependency built by the Tailwind team with first-class Tailwind v4 compatibility.

---

## Phase 1 — Infrastructure Fixes and Semantic Tokens

**S1 — Fix Font Stack and Remove Dead Code** — ✅ Done (2026-03-24)
Fix the font stack mismatch in `app/globals.css`. Remove the `body { font-family: Arial, Helvetica, sans-serif; }` rule so that the Geist Sans font loaded in `layout.tsx` is actually applied via the `--font-sans` CSS variable. Remove the `@media (prefers-color-scheme: dark)` block and the light-mode `:root` values (`--background: #ffffff; --foreground: #171717`) since the app is dark-mode-only. Clean up the remaining `:root` to only declare dark-mode values. Remove the unused `--color-background` and `--color-foreground` theme tokens if no component references them after the token layer is in place.

Updated `globals.css` baseline after S1:

```css
@import "tailwindcss";

:root {
  --background: #0a0a0a;
  --foreground: #ededed;
}

@theme inline {
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}

body {
  background: var(--background);
  color: var(--foreground);
}
```

**S2 — Semantic Design Token Layer** — ✅ Done (2026-03-24)
Define semantic design tokens in `globals.css` via `@theme inline`. Tokens are organized into five categories: surfaces, borders, text, actions, and status. All tokens reference Tailwind v4 primitive values. After defining tokens, update `body` styles to use the new token names.

Token definitions:

```css
@theme inline {
  /* Fonts */
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);

  /* Surfaces */
  --color-surface-page: var(--color-gray-950);
  --color-surface-card: var(--color-gray-900);
  --color-surface-input: var(--color-gray-800);
  --color-surface-overlay: oklch(0 0 0 / 0.6);

  /* Borders */
  --color-border-default: var(--color-gray-800);
  --color-border-hover: var(--color-gray-700);
  --color-border-focus: var(--color-gray-600);

  /* Text */
  --color-text-primary: var(--color-white);
  --color-text-secondary: var(--color-gray-300);
  --color-text-tertiary: var(--color-gray-400);
  --color-text-muted: var(--color-gray-500);
  --color-text-link: var(--color-blue-400);

  /* Actions */
  --color-action-primary: var(--color-blue-600);
  --color-action-primary-hover: var(--color-blue-500);
  --color-action-danger: var(--color-red-600);
  --color-action-danger-hover: var(--color-red-500);

  /* Status */
  --color-status-success: var(--color-green-400);
  --color-status-success-bg: oklch(from var(--color-green-500) l c h / 0.15);
  --color-status-warning: var(--color-amber-400);
  --color-status-warning-bg: oklch(from var(--color-amber-500) l c h / 0.15);
  --color-status-danger: var(--color-red-400);
  --color-status-danger-bg: oklch(from var(--color-red-500) l c h / 0.15);
  --color-status-info: var(--color-blue-400);
  --color-status-info-bg: oklch(from var(--color-blue-500) l c h / 0.15);

  /* Spacing (layout-level) */
  --spacing-page-x: var(--spacing-6);
  --spacing-page-y: var(--spacing-16);

  /* Sizing */
  --size-content-max: 64rem;
  --size-sidebar: 20rem;

  /* Radii */
  --radius-sm: var(--radius-md);
  --radius-card: var(--radius-xl);
  --radius-pill: 9999px;
}
```

After defining tokens, verify they're available as Tailwind utility classes (e.g., `bg-surface-card`, `text-text-primary`, `border-border-default`). Create a `docs/DESIGN_TOKENS.md` reference file listing all tokens, their semantic purpose, and their resolved values.

**S3 — Phase 1 Testing and Validation** — ✅ Done (2026-03-24)
Verify: Geist Sans renders as the body font (not Arial). Verify: `prefers-color-scheme` media query is gone. Verify: all semantic token classes resolve correctly in Tailwind (test by temporarily applying `bg-surface-card` to a div and confirming the correct color renders). Verify: `npm run build` passes. Verify: no visual regressions on existing pages (the token layer is additive; existing hardcoded classes still work).

---

## Phase 2 — Shared Atom Components

**S3.5 — Install Headless UI** — ✅ Done (2026-03-24)
Add `@headlessui/react` as a project dependency. This is a foundation step that does not produce UI components on its own but makes Headless UI available for Phase 3-4 organisms (Dialog, Tabs) that require it. Verify the import resolves correctly and `npm run build` passes.

**S4 — Button Component** *(hand-rolled)* — ✅ Done (2026-03-24)
Create `app/components/ui/button.tsx`. Button is a thin wrapper around the native `<button>` element and does not use Headless UI — the native element already provides correct semantics, focus behavior, and keyboard interaction. A polymorphic button component with the following API:

```tsx
interface ButtonProps {
  variant: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md";
  disabled?: boolean;
  loading?: boolean;
  children: React.ReactNode;
}
```

Variant styles use semantic tokens:

| Variant | Background | Text | Border | Hover |
|---|---|---|---|---|
| `primary` | `bg-action-primary` | `text-text-primary` | none | `hover:bg-action-primary-hover` |
| `secondary` | transparent | `text-text-tertiary` | `border-border-default` | `hover:border-border-hover hover:text-text-secondary` |
| `danger` | transparent | `text-status-danger` | `border-border-default` | `hover:border-red-700 hover:text-red-300` |
| `ghost` | transparent | `text-text-tertiary` | none | `hover:text-text-secondary` |

Size styles:

| Size | Padding | Font | Border Radius |
|---|---|---|---|
| `sm` | `px-3 py-1.5` | `text-sm` | `rounded-lg` |
| `md` | `px-4 py-2.5` | `text-sm font-medium` | `rounded-lg` |

Loading state renders a spinner SVG and disables interaction. All buttons include `transition-colors` and `disabled:opacity-50 disabled:cursor-not-allowed`.

**S5 — Input, Select, and Textarea Components** *(hand-rolled)* — ✅ Done (2026-03-24)
Create `app/components/ui/input.tsx`, `app/components/ui/select.tsx`, and `app/components/ui/textarea.tsx`. All three are hand-rolled wrappers around native HTML elements and share consistent styling:

Base styles: `w-full rounded-lg border border-border-default bg-surface-input px-4 py-2.5 text-sm text-text-primary placeholder-text-muted focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-border-focus transition-colors`.

`Input` forwards all native `<input>` props. `Select` wraps the native `<select>` element for Phase 2; if a fully custom-styled dropdown is needed later, it can be upgraded to Headless UI `Listbox` without changing the external component API. `Textarea` forwards all native `<textarea>` props with a default `rows={4}`.

Error state: when an `error` prop is passed, border changes to `border-status-danger` and focus ring to `ring-status-danger`.

**S6 — FormField Component** — ✅ Done (2026-03-24)
Create `app/components/ui/form-field.tsx`. A molecule that composes a label, any input component (via `children`), optional help text, and optional error message:

```tsx
interface FormFieldProps {
  label: string;
  htmlFor?: string;
  helpText?: string;
  error?: string;
  children: React.ReactNode;
}
```

Label style: `text-sm font-medium text-text-secondary mb-1.5`. Help text: `text-xs text-text-muted mt-1`. Error text: `text-xs text-status-danger mt-1` (replaces help text when present).

**S7 — Badge Component** — ✅ Done (2026-03-24)
Create `app/components/ui/badge.tsx`. A unified badge component that replaces the separate `TypeBadge`, `ConfidenceBadge`, and ad-hoc status pill patterns:

```tsx
interface BadgeProps {
  variant: "default" | "success" | "warning" | "danger" | "info" | "purple";
  size?: "sm" | "md";
  children: React.ReactNode;
}
```

Variant styles:

| Variant | Background | Text | Border |
|---|---|---|---|
| `default` | `bg-surface-input` | `text-text-tertiary` | `border-border-default` |
| `success` | `bg-status-success-bg` | `text-status-success` | `border-green-800` |
| `warning` | `bg-status-warning-bg` | `text-status-warning` | `border-amber-800` |
| `danger` | `bg-status-danger-bg` | `text-status-danger` | `border-red-800` |
| `info` | `bg-status-info-bg` | `text-status-info` | `border-blue-800` |
| `purple` | `bg-violet-900/30` | `text-violet-400` | `border-violet-800` |

Sizes: `sm` uses `px-2 py-0.5 text-[10px]`, `md` uses `px-2.5 py-0.5 text-xs`. Both include `rounded-full font-medium border`.

`TypeBadge` is kept as a thin wrapper around `Badge` that maps knowledge types to badge variants. It stays at `app/knowledge/components/type-badge.tsx` for backward compatibility but its internal implementation switches from raw Tailwind to `<Badge variant={...}>`. This avoids a mass import rewrite across the codebase.

**S8 — Phase 2 Migration — Existing Components** — ✅ Done (2026-03-24)
Migrate existing components to use the new atoms. Priority order:

1. `connection-form.tsx` — replace all inline button styles with `<Button>`, all input styles with `<Input>` / `<Select>`, and form label patterns with `<FormField>`.
2. `skill-detail-actions.tsx` — replace inline button styles with `<Button variant="secondary">`, `<Button variant="danger">`, etc.
3. `document-review-card.tsx` — replace inline input, select, and button styles. Replace `ConfidenceBadge` internal styles with `Badge`.
4. `content-diff.tsx` — replace toggle button styles with `<Button variant="ghost" size="sm">`.
5. `narrative-detail-actions.tsx` (if built by then) — same as skill-detail-actions pattern.

Migration rule: do not change component behavior or DOM structure. Only replace inline Tailwind class strings with the new shared component imports.

**S9 — Phase 2 Testing and Validation** — ✅ Done (2026-03-24)
Verify: `@headlessui/react` is installed and importable (no runtime errors on import). Verify: all migrated components render identically (within minor sub-pixel differences from consistent padding/sizing). Verify: Button loading state works (spinner + disabled). Verify: FormField error state renders correctly. Verify: Badge renders all variants at both sizes. Verify: `npm run build` passes. Browser smoke test: navigate all pages (`/knowledge`, `/skills`, `/connections`, `/bulk-upload`, `/queue`, `/dashboard`) and confirm no visual regressions.

---

## Phase 3 — Page Layout and Shared Infrastructure

**S10 — PageLayout Component**
Create `app/components/layout/page-layout.tsx`. Extracts the page wrapper boilerplate repeated on every page:

```tsx
interface PageLayoutProps {
  backHref?: string;
  backLabel?: string;
  title?: string;
  titleExtra?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
}
```

Implementation renders: `<main>` with `min-h-screen bg-surface-page text-text-primary`, a max-width container with semantic spacing tokens, an optional back link, an optional title row with `titleExtra` (for badges/status pills) and `actions` (for buttons aligned right), and `children` for page content.

This replaces the identical boilerplate in `knowledge/[id]/page.tsx`, `skills/[id]/page.tsx`, `knowledge/page.tsx`, `skills/page.tsx`, `connections/page.tsx`, `bulk-upload/page.tsx`, `queue/page.tsx`, and `dashboard/page.tsx`.

**S11 — LoadingSpinner and PageSkeleton Components**
Create `app/components/ui/loading-spinner.tsx` — a reusable SVG spinner with `sm` (16px), `md` (24px), and `lg` (32px) sizes. Uses `animate-spin` and `text-text-muted` by default.

Create `app/components/ui/page-skeleton.tsx` — a full-page loading skeleton that uses the `PageLayout` structure with animated placeholder blocks for the title, action bar, and content area. Accepts a `variant` prop to handle common layouts:

| Variant | Skeleton Shape |
|---|---|
| `list` | Title bar + 6 card-shaped blocks |
| `detail` | Title bar + content block (left) + sidebar block (right) |
| `form` | Title bar + 4 form field blocks |

Skeleton blocks use `bg-surface-card animate-pulse rounded-xl` styling.

**S12 — ErrorBoundary and ErrorState Components**
Create `app/components/ui/error-state.tsx` — a presentational component for error states:

```tsx
interface ErrorStateProps {
  title?: string;
  message?: string;
  retryAction?: () => void;
  retryLabel?: string;
}
```

Renders a centered card with an error icon, title (defaults to "Something went wrong"), message (defaults to "An unexpected error occurred. Please try again."), and optional retry button using the `Button` component.

Create `app/error.tsx` (App Router global error boundary) and `app/not-found.tsx` (global 404 page), both using the `ErrorState` component. Also create route-level error boundaries at `app/knowledge/error.tsx`, `app/skills/error.tsx`, `app/queue/error.tsx`, `app/dashboard/error.tsx`, and `app/connections/error.tsx` so errors in one module don't break the whole app.

Error boundaries must be `"use client"` components (Next.js requirement). They receive `error` and `reset` props and render `ErrorState` with the `reset` function wired to the retry button.

**S13 — Phase 3 Migration — Page Layouts**
Migrate existing pages to use `PageLayout`. Priority order:

1. `knowledge/[id]/page.tsx` — replace boilerplate with `<PageLayout>` using `backHref`, `title`, and `actions` props.
2. `skills/[id]/page.tsx` — same pattern.
3. `knowledge/page.tsx` — replace outer wrapper; title and filter bar become children.
4. `skills/page.tsx` — same pattern.
5. `connections/page.tsx` — same pattern.
6. `queue/page.tsx` — same pattern.
7. `dashboard/page.tsx` — same pattern.
8. `bulk-upload/page.tsx` — same pattern.

Migration rule: the `PageLayout` component handles the outer `<main>`, max-width container, back link, and title/actions row. Everything below that remains as-is in the page component's `children`.

**S14 — Phase 3 Testing and Validation**
Verify: all pages render correctly with `PageLayout`. Verify: error boundaries catch thrown errors and render `ErrorState` (test by temporarily throwing in a server component). Verify: `app/not-found.tsx` renders for invalid routes. Verify: skeleton loading states render correctly. Verify: `npm run build` passes. Browser smoke test all pages.

---

## Phase 4 — Organism Consolidation and Cross-Feature Centralization

**S15 — Centralize Cross-Feature Components**
Move components that are already imported across feature boundaries to `app/components/ui/`:

| Component | Current Location | New Location |
|---|---|---|
| `TagEditor` | `app/bulk-upload/components/tag-editor.tsx` | `app/components/ui/tag-editor.tsx` |
| `MarkdownRenderer` | `app/knowledge/components/markdown-renderer.tsx` | `app/components/ui/markdown-renderer.tsx` |
| `VisualDiff` | `app/queue/components/visual-diff.tsx` | `app/components/ui/visual-diff.tsx` |

For each moved component: update all imports across the codebase. Leave re-export stubs at the old locations to avoid breaking any imports that might be missed (the stub file simply re-exports from the new location). The re-export stubs can be removed in a future cleanup pass.

`TypeBadge` stays at `app/knowledge/components/type-badge.tsx` because it is knowledge-domain-specific (it maps `KnowledgeType` to badge variants). It imports from `app/components/ui/badge.tsx` internally (done in S7).

**S16 — FilterableList Organism**
Create `app/components/ui/filterable-list.tsx` — a shared organism for list pages with filter tabs, search, and paginated card list. This pattern is repeated across `/knowledge`, `/skills`, `/queue`, and the upcoming `/narratives`.

```tsx
interface FilterableListProps<T> {
  items: T[];
  tabs: { label: string; value: string; count?: number }[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchPlaceholder?: string;
  renderItem: (item: T) => React.ReactNode;
  emptyMessage?: string;
}
```

The component renders: a tab bar with count badges, a search input using the shared `Input` component, and a list of items via the `renderItem` callback. It handles the empty state with a configurable message. The tab bar uses Headless UI `TabGroup` for accessible keyboard navigation (arrow-key switching, ARIA tab/tabpanel roles) while styling is applied via semantic tokens and `cn()`.

This is an optional composition helper, not a requirement. Feature pages can still build custom list UIs when the pattern doesn't fit.

**S17 — ConfirmDialog Component**
Create `app/components/ui/confirm-dialog.tsx`. Multiple detail pages implement the same modal confirmation pattern (e.g., `skill-detail-actions.tsx` delete confirmation, `detail-actions.tsx` deprecation confirmation). Extract into a shared component:

```tsx
interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  confirmVariant?: "primary" | "danger";
  loading?: boolean;
}
```

Built on Headless UI `Dialog` and `Transition` components, which provide focus trapping, scroll locking, Escape-to-close, and correct ARIA `dialog`/`alertdialog` roles. Uses the `Button` component for actions and the semantic overlay token (`bg-surface-overlay`) for the backdrop. Styling is applied via semantic tokens and `cn()` — Headless UI handles only the interactive behavior.

**S18 — Phase 4 Migration — Organisms**
Migrate existing pages to use the new organisms where applicable:

1. `skill-detail-actions.tsx` — replace inline delete confirm modal with `<ConfirmDialog>`.
2. `detail-actions.tsx` (knowledge) — replace inline confirm modal with `<ConfirmDialog>`.
3. `knowledge/page.tsx` — evaluate whether `FilterableList` fits; if so, migrate.
4. `skills/page.tsx` — evaluate whether `FilterableList` fits; if so, migrate.
5. `queue/page.tsx` — evaluate whether `FilterableList` fits; if so, migrate.

Migration rule: only adopt `FilterableList` where it fits without forcing the existing UI into an unnatural shape. If a page has unique filtering or layout needs that would require contorting the component, leave it alone and note the divergence.

**S19 — Phase 4 Testing and Validation**
Verify: centralized components work from their new locations. Verify: re-export stubs resolve correctly. Verify: ConfirmDialog opens, closes, and triggers the confirm action. Verify: FilterableList renders tabs, search, and item list correctly. Verify: `npm run build` passes. Browser smoke test all migrated pages.

---

## Phase 5 — Documentation and Standards

**S20 — Design System Documentation**
Create or update the following documentation:

- `docs/DESIGN_TOKENS.md` (created in S2, finalize here) — complete token reference with semantic purpose, resolved values, and usage examples.
- `docs/COMPONENTS.md` — shared component catalog listing every component in `app/components/ui/` and `app/components/layout/`, with props, variants, and usage examples. Include a "When to use" and "When not to use" section for each component.
- `docs/CHANGELOG.md` — add Group S entry summarizing all phases.
- `docs/SCOPE.md` — update development status table with "Design System Foundation" row.
- `.cursor/rules/start.mdc` — regenerate to include the new `app/components/ui/` and `app/components/layout/` paths and the design token file.

Establish coding standard in `docs/UI_STANDARDS.md`:

1. **Token-first rule**: new components must use semantic tokens, not hardcoded Tailwind color classes. `bg-gray-900` in new code is a review flag; `bg-surface-card` is correct.
2. **Primitive-first rule**: new UI must compose shared atoms (`Button`, `Input`, `Badge`, `FormField`) rather than writing inline button/input styles.
3. **Cross-feature threshold**: if a component is imported by 2+ feature directories, it should be moved to `app/components/ui/`.
4. **Page layout rule**: all new pages must use `PageLayout` and include a route-level `error.tsx`.

**S21 — Visual Design Audit Remediation Sprint**
Validate and close remaining gaps from the top 5 visual design audit improvements after S1-S20, and track measurable outcomes:

1. **Primitive extraction pass**: ship `Button`, `Input`, `Select`, `Textarea`, and `Badge` primitives and migrate the highest-traffic forms/actions in `knowledge`, `skills`, and `connections`.
2. **Semantic token pass**: expand `app/globals.css` token coverage (surface, border, text hierarchy, status) and replace repeated raw palette class recipes in shared surfaces.
3. **Page shell normalization pass**: introduce a shared page layout/container wrapper and migrate page-level shells that currently duplicate `max-w-*` + spacing boilerplate.
4. **Accessibility baseline pass**: enforce focus-visible styling, label-control association, and required ARIA states for custom interactive controls (including drop zones, tab-like filters, and icon actions).
5. **Badge/status consolidation pass**: centralize status/type badge styling into one shared mapping component to eliminate cross-feature drift.

Acceptance checks for S21:

- Repeated button/input class recipes in targeted modules reduced by at least 60%.
- At least 80% of page shells use the shared layout/container abstraction.
- `aria-*` coverage on custom interactive controls increased and validated via automated checks (axe/lighthouse) plus keyboard smoke test.
- Contrast-risk combinations flagged by static scan reduced in affected components.
- `docs/UI_STANDARDS.md` updated with enforceable review rules tied to this audit.

**S22 — UX Pattern Remediation Execution**
Implement the missing UX patterns identified in the UX audit and normalize interaction behavior across feature-local components.

Execution scope:

1. **State coverage parity**: add consistent loading, empty, error, and success states for list/detail/form surfaces that currently diverge by feature.
2. **Interaction baseline**: standardize button/control behavior across hover, focus-visible, active, disabled, and loading states.
3. **Responsive hardening**: apply consistent breakpoint strategy for dense form/review/table-like layouts and add mobile-safe interaction spacing.
4. **Accessibility primitives**: introduce shared accessible dialog, tabs/filter controls, and field validation semantics.
5. **Feedback infrastructure**: establish reusable dynamic status announcements for async operations and define a standard global notification approach.

Acceptance checks for S22:

- Critical accessibility gaps in drop zones and modal dialogs are resolved with keyboard and assistive-technology-compatible patterns.
- At least 3 high-traffic feature areas (`knowledge`, `queue`, `connections`) adopt shared UX primitives for forms/actions/dialogs.
- Breakpoint coverage expands beyond sparse `sm`/`lg` usage in key workflow components.
- Dynamic async workflows expose standardized status feedback for both visual users and screen readers.
- `docs/UI_STANDARDS.md` includes enforceable UX pattern requirements derived from this audit.

**S23 — CSS and Styling Architecture Remediation**
Implement the styling architecture improvements identified in the CSS audit so the codebase moves from repeated inline utility strings to a maintainable token-and-primitive model.

Execution scope:

1. **Class composition standardization**: add a shared `cn()` utility based on `clsx` + `tailwind-merge` and migrate high-change components first.
2. **Duplication reduction**: extract repeated shell patterns (inputs/cards/buttons) into shared primitives and reduce literal class string duplication across feature modules.
3. **Class ordering enforcement**: add `prettier-plugin-tailwindcss` and project formatting config for deterministic utility ordering.
4. **Global style architecture hardening**: align `globals.css` with structured base/component conventions and ensure `next/font` token usage is applied consistently.
5. **Responsive and accessibility styling baseline**: standardize breakpoint usage and focus-visible patterns in shared primitives and high-traffic forms.

Acceptance checks for S23:

- A shared `cn()` utility is introduced and adopted in targeted high-churn components.
- Repeated input/card/button class recipes are reduced by at least 50% in `knowledge`, `skills`, and `connections` components.
- Class-order tooling is configured and active in local formatting workflow.
- Body font stack uses font tokens from `next/font` (no conflicting hardcoded fallback override).
- Responsive and focus-visible conventions are documented in `docs/UI_STANDARDS.md` and applied to migrated primitives.

**S24 — Vibe Code Design Drift Audit (Prompt #5)**
Analyze design drift and inconsistency patterns commonly introduced during rapid AI-assisted coding.

### Drift Score

**8/10**

The UI layer shows high drift: inline utility duplication (`className=` in 48/49 TSX files; ~850 total), no shared `app/components/ui` primitives, repeated modal/button/form recipes across features, and sparse shared accessibility conventions (`focus-visible` usage absent in scanned components).

### Consolidation Opportunities

- **Detail action bars + confirm flows**
  - `app/knowledge/components/detail-actions.tsx`
  - `app/skills/components/skill-detail-actions.tsx`
  - `app/connections/components/connection-detail-actions.tsx`
- **Form shell patterns**
  - `app/knowledge/components/knowledge-form.tsx`
  - `app/skills/components/skill-form.tsx`
  - `app/connections/components/connection-form.tsx`
- **Badge family unification**
  - `app/knowledge/components/type-badge.tsx`
  - `app/bulk-upload/components/confidence-badge.tsx`
  - status pill variants in queue/details pages
- **Cross-feature reusable components stranded in feature dirs**
  - `app/knowledge/components/markdown-renderer.tsx`
  - `app/queue/components/visual-diff.tsx`
  - `app/bulk-upload/components/file-drop-zone.tsx`

### Convention Violations

- **Design-system bypass / inline utility sprawl**
  - `className=` in **48/49** TSX files; template-literal composition in **44** instances
- **Missing shared primitive layer**
  - `app/components/ui` primitive files: effectively absent for production use
  - repeated card/input style recipes across feature directories
- **Accessibility convention drift**
  - `focus-visible` pattern absent in scanned app TSX
  - limited ARIA state patterns for dynamic/modality flows
- **Cross-feature coupling**
  - reusable UI imported across feature boundaries from feature-local folders

### Recommended Component Library Extractions (3+ usage)

- `Card` / `Surface` primitive
- `Input` / `Select` / `Textarea` primitives
- `Button` variant system (`primary/secondary/danger/ghost`)
- `ConfirmDialog`
- `AlertBanner` (`error/warning/success/info`)

### Priority Actions (Top 5, impact-to-effort)

1. Ship `Button/Input/Select/Textarea/FormField` primitives and migrate top 3 forms.
2. Extract `ConfirmDialog` and `AlertBanner` for all destructive/review flows.
3. Centralize cross-feature shared components into `app/components/ui`.
4. Add `cn()` utility (`clsx` + `tailwind-merge`) and class-order tooling.
5. Establish accessibility baseline in primitives (`focus-visible`, dialog semantics, async announcements).

**S25 — Comprehensive Design Audit (Prompt #6)**
Perform a full design + frontend architecture audit across A-F areas.

### Summary Dashboard

| Audit Area | Score (1-10) | Critical Issues | Key Strength |
|---|---:|---:|---|
| A Design System Foundation | 3 | 4 | Group S roadmap is explicit and phased |
| B Visual Consistency | 5 | 3 | Dark visual direction is mostly coherent |
| C UX Implementation | 5 | 3 | Core workflows are functionally complete |
| D Accessibility | 3 | 5 | Some local accessibility patterns exist |
| E Styling Architecture | 4 | 4 | Tailwind v4 baseline is cleanly centralized |
| F Vibe Code Quality | 6 | 2 | Strong TypeScript/domain logic quality |

### Detailed Findings

#### A. Design System Foundation (3/10)
- **Score justification**: no shared primitives/layout layer implemented yet; token architecture remains partial despite roadmap design.
- **Critical findings (must fix)**:
  - missing core primitives and layout abstractions
  - token intent not consistently enforced in implementation
  - global error/not-found boundaries missing
- **Improvement opportunities (should fix)**:
  - formalize docs (`DESIGN_TOKENS`, `COMPONENTS`, `UI_STANDARDS`)
  - keep domain wrappers but back them with shared primitives
- **Nice-to-haves (could fix)**:
  - visual references and migration helper scripts

#### B. Visual Consistency (5/10)
- **Score justification**: shared dark style exists, but repeated per-feature style recipes diverge in details.
- **Critical findings (must fix)**:
  - duplicate button/input/badge implementations for similar intent
  - inconsistent status styling across modules
- **Improvement opportunities (should fix)**:
  - unify action variants and status badges via shared primitives
- **Nice-to-haves (could fix)**:
  - visual regression checks for high-traffic workflows

#### C. UX Implementation (5/10)
- **Score justification**: workflows are complete, but loading/empty/error/success patterns are inconsistent by feature.
- **Critical findings (must fix)**:
  - no shared loading/error-state system
  - confirmation UX duplicated in multiple modules
- **Improvement opportunities (should fix)**:
  - normalize state matrix and async feedback patterns
- **Nice-to-haves (could fix)**:
  - URL-persisted filters/search and richer success feedback

#### D. Accessibility (3/10)
- **Score justification**: some labels/aria use exists, but baseline contracts are incomplete for forms/modals/custom interactions.
- **Critical findings (must fix)**:
  - weak label-control linkage consistency
  - custom modal semantics/focus handling not standardized
  - no explicit async live announcements pattern
- **Improvement opportunities (should fix)**:
  - accessible primitives and automated a11y validation checks
- **Nice-to-haves (could fix)**:
  - reduced-motion support and skip-link/landmark improvements

#### E. Styling Architecture (4/10)
- **Score justification**: single global CSS + Tailwind v4 setup is clean, but governance/tooling/composition patterns are missing.
- **Critical findings (must fix)**:
  - copy/paste utility bundles dominate styling composition
  - missing class composition utility and class ordering enforcement
- **Improvement opportunities (should fix)**:
  - semantic token expansion + `cn()` adoption in high-churn components
- **Nice-to-haves (could fix)**:
  - static checks for forbidden raw palette patterns in new code

#### F. Vibe Code Quality (6/10)
- **Score justification**: functional correctness and TS quality are reasonable, but UI composition is too monolithic/duplicated.
- **Critical findings (must fix)**:
  - oversized workflow components reduce maintainability
- **Improvement opportunities (should fix)**:
  - split presentational vs orchestration concerns
  - centralize repeated maps/constants
- **Nice-to-haves (could fix)**:
  - fixture/story-driven regression safeguards

### Action Plan

#### This Week (critical fixes, quick wins)

| Description | Files Affected | Effort | Expected Impact |
|---|---|---|---|
| Fix font stack mismatch and baseline theme usage | `app/globals.css`, `app/layout.tsx` | S | Immediate visual correctness |
| Add semantic token baseline | `app/globals.css` | M | Foundation for consistent styling |
| Create core primitives | `app/components/ui/*` | M | Reduces drift and duplication |
| Add baseline a11y contracts in primitives | `app/components/ui/*`, key forms | M | Closes high-risk usability gaps |

#### This Sprint (medium-effort improvements)

| Description | Files Affected | Effort | Expected Impact |
|---|---|---|---|
| Add `PageLayout`, loading/error shared states | `app/components/layout/*`, `app/components/ui/*`, route error files | M | UX consistency + resilience |
| Migrate high-traffic pages/forms to shared patterns | `knowledge/skills/connections/queue/dashboard` pages/components | M | Consistent structure and behavior |
| Standardize confirm dialogs and async status feedback | detail actions, queue flows | S | Reliable destructive/review UX |
| Add styling governance tooling (`cn`, class order) | `package.json`, utils + formatting config | S | Prevents future drift |

#### This Quarter (architectural changes)

| Description | Files Affected | Effort | Expected Impact |
|---|---|---|---|
| Consolidate cross-feature organisms/components | `app/components/ui/*` + feature imports | L | Long-term maintainability |
| Accessibility hardening pass with measurable checks | high-traffic interactive surfaces | L | Compliance + usability gains |
| Complete design system governance docs | docs + rules files | M | Durable standards enforcement |
| Refactor oversized workflow components | bulk-upload and queue review components | L | Better change safety and velocity |

**S26 — Design Debt Backlog Translation (Prompt #7)**
Translate audit findings into a deduplicated, dependency-aware backlog.

### Backlog Summary

- **Total items**: 12
- **Workstream breakdown**:
  - WS1: 2
  - WS2: 2
  - WS3: 2
  - WS4: 2
  - WS5: 3
  - WS6: 1
- **Estimated total effort**: ~8-14 working days (parallelizable)
- **Critical path**: token and baseline foundation -> class/tooling guardrails -> shared primitives -> a11y contracts + migration -> layout normalization -> cross-feature consolidation.

### Quick Wins (No Dependencies, Effort <= 2)

- `WS1-001` Fix font/theme baseline in globals/layout
- `WS5-001` Add shared `cn()` utility (`clsx` + `tailwind-merge`)
- `WS5-002` Add Tailwind class-order formatting plugin

### Prioritized Backlog

---
**WS1-001: Fix font/theme baseline in globals** — ✅ Done (2026-03-24)
- **Workstream**: WS1
- **Impact**: 5 ; resolves active typography mismatch and baseline drift
- **Effort**: 1 ; focused `globals.css`/`layout.tsx` update
- **Priority Score**: 5.0
- **Blocked By**: None
- **Files Affected**: `app/globals.css`, `app/layout.tsx`
- **Definition of Done**:
  - body uses tokenized font path (`var(--font-sans)`)
  - baseline theme declarations are simplified and coherent
  - build and core routes render correctly
- **Implementation Notes**: keep non-visual behavior unchanged.
---

---
**WS5-001: Add shared `cn()` class composition utility** — ✅ Done (2026-03-24)
- **Workstream**: WS5
- **Impact**: 5 ; reduces divergence in conditional styling patterns
- **Effort**: 1 ; add deps + helper and migrate first wave
- **Priority Score**: 5.0
- **Blocked By**: None
- **Files Affected**: `package.json`, shared utils file, high-churn components
- **Definition of Done**:
  - `clsx` + `tailwind-merge` installed
  - shared `cn()` helper exists and is used in at least 3 target components
  - no UI regressions in migrated files
- **Implementation Notes**: target template-literal heavy components first.
---

---
**WS5-002: Enforce Tailwind class ordering in formatter** — ✅ Done (2026-03-24)
- **Workstream**: WS5
- **Impact**: 4 ; stabilizes code review and style consistency
- **Effort**: 1 ; minimal config + tooling rollout
- **Priority Score**: 4.0
- **Blocked By**: None
- **Files Affected**: `package.json`, Prettier config, docs standards
- **Definition of Done**:
  - formatter plugin is configured and usable
  - class ordering is deterministic in changed files
  - standards doc references formatting expectation
- **Implementation Notes**: avoid whole-repo reformat in same PR.
---

---
**WS1-002: Define semantic token taxonomy and token docs** — ✅ Done (2026-03-24)
- **Workstream**: WS1
- **Impact**: 5 ; unlocks consistent component standardization
- **Effort**: 2 ; token model + documentation
- **Priority Score**: 2.5
- **Blocked By**: WS1-001
- **Files Affected**: `app/globals.css`, `docs/DESIGN_TOKENS.md`
- **Definition of Done**:
  - semantic token categories exist (surface/border/text/action/status)
  - token utilities resolve in app styles
  - documentation maps intent to values
- **Implementation Notes**: additive rollout before broad migrations.
---

---
**WS2-001: Build core primitives** — ✅ Done (2026-03-24)
- **Workstream**: WS2
- **Impact**: 5 ; largest reduction in duplicated UI patterns
- **Effort**: 3 ; implement and type core primitive set
- **Priority Score**: 1.67
- **Blocked By**: WS1-002, WS5-001
- **Files Affected**: `app/components/ui/{button,input,select,textarea,form-field,badge}.tsx`
- **Definition of Done**:
  - primitives support baseline variants/states
  - primitives consume semantic tokens
  - examples/usage references are available
- **Implementation Notes**: keep API surface minimal but extensible.
---

---
**WS3-001: Apply accessibility baseline to primitives**
- **Workstream**: WS3
- **Impact**: 5 ; closes highest-risk keyboard/screen-reader gaps
- **Effort**: 2 ; semantic wiring + focus contracts
- **Priority Score**: 2.5
- **Blocked By**: WS2-001
- **Files Affected**: `app/components/ui/*`, key form modules
- **Definition of Done**:
  - focus-visible standard is applied
  - label/input associations are correct in migrated forms
  - error semantics include ARIA-invalid/description links
- **Implementation Notes**: solve at primitive layer to propagate fixes.
---

---
**WS2-002: Migrate high-traffic forms/actions to primitives**
- **Workstream**: WS2
- **Impact**: 5 ; removes majority of duplicated ad hoc form/action styling
- **Effort**: 3 ; targeted migrations with behavior parity checks
- **Priority Score**: 1.67
- **Blocked By**: WS2-001, WS3-001
- **Files Affected**: `knowledge-form`, `skill-form`, `connection-form`, detail action components
- **Definition of Done**:
  - targeted modules use shared primitives
  - repeated style recipe count drops significantly (>=60% in target files)
  - user workflows remain functionally identical
- **Implementation Notes**: preserve DOM/logic where possible.
---

---
**WS4-001: Introduce shared page shell and state components**
- **Workstream**: WS4
- **Impact**: 4 ; normalizes loading/error/layout experience
- **Effort**: 3 ; add layout + loading/error primitives + route boundaries
- **Priority Score**: 1.33
- **Blocked By**: WS2-001
- **Files Affected**: layout/ui shared components + route error/not-found files
- **Definition of Done**:
  - `PageLayout`, spinner/skeleton/error components are implemented
  - global error and not-found handlers use shared patterns
  - core routes render with shared shell support
- **Implementation Notes**: align styles with tokenized design direction.
---

---
**WS4-002: Migrate pages to shared layout and responsive standards**
- **Workstream**: WS4
- **Impact**: 4 ; improves consistency and mobile behavior predictability
- **Effort**: 3 ; page-level migration + breakpoint normalization
- **Priority Score**: 1.33
- **Blocked By**: WS4-001, WS2-002
- **Files Affected**: `knowledge`, `skills`, `connections`, `queue`, `dashboard`, `bulk-upload` page files
- **Definition of Done**:
  - most core pages use shared layout abstraction (>=80%)
  - explicit `sm/md/lg` behavior exists for dense workflows
  - smoke checks pass at primary viewport sizes
- **Implementation Notes**: prioritize queue/bulk-upload/connection forms first.
---

---
**WS3-002: Standardize accessible dialogs and async status feedback**
- **Workstream**: WS3
- **Impact**: 4 ; resolves repeated modal and async a11y drift
- **Effort**: 2 ; shared dialog + live status pattern
- **Priority Score**: 2.0
- **Blocked By**: WS2-001, WS3-001
- **Files Affected**: confirm/action components + async workflow modules
- **Definition of Done**:
  - destructive flows use one dialog pattern with keyboard/focus semantics
  - async operations expose standardized status announcements
  - behavior is consistent across targeted features
- **Implementation Notes**: migrate highest-risk destructive flows first.
---

---
**WS6-001: Consolidate cross-feature shared components into common UI**
- **Workstream**: WS6
- **Impact**: 4 ; reduces coupling and long-term maintenance overhead
- **Effort**: 2 ; move components + update imports + temporary shims
- **Priority Score**: 2.0
- **Blocked By**: WS2-002, WS4-002
- **Files Affected**: `markdown-renderer`, `visual-diff`, `tag-editor` + import sites
- **Definition of Done**:
  - shared components live in `app/components/ui`
  - old feature paths have safe re-export compatibility during migration
  - no broken imports/build failures
- **Implementation Notes**: move highest reuse components first.
---

---
**WS5-003: Codify governance and enforcement rules**
- **Workstream**: WS5
- **Impact**: 3 ; prevents reintroduction of drift post-migration
- **Effort**: 2 ; standards docs + enforcement guidance
- **Priority Score**: 1.5
- **Blocked By**: WS1-002, WS2-002, WS3-002
- **Files Affected**: `docs/UI_STANDARDS.md`, `docs/COMPONENTS.md`, `docs/CHANGELOG.md`, `.cursor/rules/start.mdc`
- **Definition of Done**:
  - token-first and primitive-first rules are documented and actionable
  - accessibility/responsive baseline requirements are explicit
  - docs reflect shipped primitives and migration status
- **Implementation Notes**: use as closure gate for S21-S26 completion.
---

### Dependency Map

WS1-001: Fix font/theme baseline  
└── WS1-002: Define semantic token taxonomy  
    └── WS2-001: Build core primitives  
        ├── WS3-001: Apply accessibility baseline to primitives  
        │   ├── WS2-002: Migrate high-traffic forms/actions  
        │   │   └── WS4-002: Migrate pages to shared layout/responsive standards  
        │   │       └── WS6-001: Consolidate cross-feature shared components  
        │   └── WS3-002: Standardize accessible dialogs and async status feedback  
        └── WS4-001: Introduce shared page shell and state components  
            └── WS4-002: Migrate pages to shared layout/responsive standards  

WS5-001: Add `cn()` utility  
└── WS2-001: Build core primitives  

WS5-002: Enforce class ordering (parallel guardrail)  

WS5-003: Codify governance and enforcement rules  
└── Blocked by WS1-002, WS2-002, WS3-002

---

## Risks and Gaps

| Risk | Impact | Mitigation |
|---|---|---|
| Token migration causes subtle visual regressions | Colors or spacing shift slightly when switching from hardcoded to token values | Phase 1 is additive only (tokens exist alongside hardcoded classes). Migration in Phases 2-4 is file-by-file with visual comparison at each step. |
| Tailwind v4 `@theme inline` token resolution differs from expected behavior | Semantic token classes may not generate correctly | S3 validates token resolution before any migration begins. If `@theme inline` cannot handle the full token set, fall back to CSS custom properties with `@apply` or a `tailwind.config.ts` extension. |
| Shared components become too rigid for edge cases | Future features need button/input variants that don't fit the shared component API | Design atoms to be flexible (accept `className` override prop). Feature-specific components can always compose atoms with additional styling. The `FilterableList` organism is explicitly optional. |
| Migration effort competes with feature work | Group S delays Groups R, Q, or other priorities | Phases are independent. Phase 1 (tokens + fixes) is < 1 day of work. Phase 2 (atoms) is 1-2 days. Phases 3-4 can be deferred or done incrementally as part of feature work. |
| `TypeBadge` wrapper approach adds indirection | Two components (`Badge` + `TypeBadge`) for one visual element | The indirection is minimal (TypeBadge becomes ~10 lines) and avoids a mass import rewrite. Long-term, callers can switch to `<Badge>` directly if they prefer. |
| Error boundaries mask bugs during development | Developers might not notice errors during local dev | Error boundaries log to console before rendering the fallback. In development mode, Next.js already shows its error overlay before the boundary catches. |
| UX remediation scope grows beyond targeted high-impact components | S22 could expand into an open-ended refactor and delay roadmap delivery | Time-box S22 to critical/high findings first, apply feature-by-feature rollout, and require measurable acceptance checks before expanding scope. |
| CSS architecture remediation introduces broad churn in frequently edited components | Large-scale class refactors can create regressions and merge friction | Sequence S23 after S21/S22 foundations, prioritize high-duplication components first, and enforce incremental migration with visual and lint verification per batch. |
| Backlog translation scope sprawl across overlapping audits | S24-S26 can duplicate findings and dilute execution focus | Enforce deduplication in S26, keep a single prioritized backlog, and map every item to WS1-WS6 with explicit dependency chains. |
| Headless UI major version changes break component APIs | Dialog/Tabs/Listbox implementations need updates | Pin to a specific major version. Headless UI has a stable API with infrequent breaking changes. The dependency is isolated to organism-level components (S16, S17), not atoms. |

**Open Questions:**

| Question | Context |
|---|---|
| Should the token layer support a future light mode? | If yes, tokens should use CSS custom properties that can be swapped per media query rather than direct Tailwind color references. The current scope assumes dark-mode-only, but the token architecture should be extensible. Recommendation: use the `@theme inline` approach now; refactor to CSS custom properties if light mode is ever needed. |
| Should `FilterableList` use URL-based state (query params) or React state? | URL state enables shareable filtered views and survives page refreshes. React state is simpler. Existing list pages use React state. Recommendation: keep React state for now; add URL state as a future enhancement if users request shareable links. |
| Should shared components be published as a package? | For a single internal app, a package adds overhead. If the design system is ever shared across multiple apps, extract to a package then. Recommendation: no package for now. |
| Should Select use Headless UI Listbox from the start? | Native `<select>` is simpler and accessible by default but cannot be fully styled. Headless UI Listbox allows custom dropdown styling but adds complexity. Recommendation: start with native `<select>` in Phase 2; upgrade to Listbox only if custom styling is needed. |

## Recommended Build Order

1. **S1 → S2 → S3** (Phase 1: fixes, tokens, validation) — prerequisite for everything; < 1 day
2. **S3.5 → S4 → S5 → S6 → S7 → S8 → S9** (Phase 2: Headless UI install, atoms, migration, validation) — highest-impact visual consistency improvement; 1-2 days
3. **S10 → S11 → S12 → S13 → S14** (Phase 3: layout, loading, errors, migration, validation) — structural consistency; 1-2 days
4. **S15 → S16 → S17 → S18 → S19** (Phase 4: centralization, organisms, migration, validation) — consolidation; 1-2 days
5. **S20 → S21 → S22 → S23 → S24 → S25 → S26** (Phase 5: documentation + audit closure + UX remediation + CSS architecture hardening + drift/comprehensive/backlog synthesis) — after Phases 1-4; 5-7 days

Phases 1-2 are sequential (atoms consume tokens). Phases 3-4 can be done in parallel or in either order, as they are independent of each other. Both depend on Phase 2 (they use the atoms). Phase 5 (S20 + S21 + S22 + S23 + S24 + S25 + S26) runs last.

**Total estimated effort: 10-17 days**, spread across sprints or interleaved with feature work. Phase 1 should be done immediately as it fixes actual bugs (broken font stack) and unblocks all subsequent phases.
