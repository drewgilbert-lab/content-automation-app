> Back to [Roadmap Index](./README.md)

# Group S — Design System Foundation

> Scope: Establish a design system foundation for the Content Engine, including semantic design tokens, shared primitive components, page layout templates, consolidated organisms, and infrastructure fixes. This group addresses the accumulated visual and structural debt from the initial scaffolding, and creates the foundation for consistent, maintainable UI across all current and future modules.
> Dependencies: None. This group has no dependencies on other roadmap groups and can be built incrementally alongside feature work. However, all future UI work (Groups R, Q, and beyond) should consume the primitives established here rather than continuing to inline Tailwind classes with hardcoded values.

## Current State

The Content Engine has no design system. Every component uses inline Tailwind utility classes with hardcoded color, spacing, and typography values. There are no semantic tokens, no shared primitive components (buttons, inputs, badges), and no page layout abstractions. Components like `TypeBadge`, `StatCard`, and `ConfidenceBadge` show emergent patterns, but they are not formalized, not centralized, and not consistent with each other.

Specific issues:

- **Buttons** are rebuilt from scratch in every file with different padding, border-radius, font-size, and color combinations. At least 4 distinct button patterns exist across `skill-detail-actions.tsx`, `connection-form.tsx`, `document-review-card.tsx`, and `content-diff.tsx`.
- **Inputs** use 3 different styling patterns across `connection-form.tsx`, `document-review-card.tsx`, and `tag-editor.tsx` (different padding, focus ring behavior, border-radius).
- **Form labels** alternate between `text-xs text-gray-400` and `text-sm font-medium text-gray-300 mb-1.5` depending on which file you're in.
- **Status badges** (active/inactive/deprecated, confidence, type) all use different sizing, padding, and color logic.
- **Page templates** manually repeat `min-h-screen bg-gray-950` / `mx-auto max-w-5xl px-6 py-16` boilerplate on every page.
- **Cross-feature imports** already exist (`TypeBadge` is imported by `dashboard/stat-card.tsx` and `bulk-upload/document-review-card.tsx` from `knowledge/components/`) but components live in feature-scoped directories rather than a shared location.
- **`globals.css`** defines two CSS custom properties (`--background`, `--foreground`) that are mapped to Tailwind theme tokens but never actually used in any component.
- **Font stack is broken**: `layout.tsx` loads Geist Sans and Geist Mono via `next/font/google`, assigns CSS variables `--font-geist-sans` and `--font-geist-mono`, and `@theme inline` maps them to `--font-sans` and `--font-mono`. But `globals.css` overrides `body` with `font-family: Arial, Helvetica, sans-serif`, so Geist fonts are loaded but never rendered.
- **Dead dark mode code**: `globals.css` includes a `prefers-color-scheme: dark` media query, but the entire app is hardcoded to dark mode via Tailwind classes (`bg-gray-950`, `text-white`). The media query is unused.
- **No loading states**: No shared skeleton or loading indicator components exist. Each page handles loading differently or not at all.
- **No error boundaries**: No shared error state UI exists. Unhandled errors in server components produce default Next.js error pages.

## Architecture Decisions

**Token strategy**: Semantic tokens defined in `globals.css` via Tailwind v4's `@theme inline` directive. Tokens map Tailwind primitive values (e.g., `gray-900`) to semantic names (e.g., `surface-card`). Components consume semantic tokens via Tailwind utility classes (e.g., `bg-surface-card`). This avoids a separate token build step and stays within the existing Tailwind v4 workflow.

**Component location**: Shared primitives live in `app/components/ui/`. Feature-specific components remain in their feature directories but compose shared primitives. This follows the existing Next.js App Router convention where `app/components/` is the shared directory.

**Migration approach**: Incremental. New token classes and components are added first, then existing components are migrated file-by-file. No big-bang rewrite. The migration order is: tokens first (Phase 1), then atoms (Phase 2), then molecules and organisms (Phases 3-4). Each phase includes a migration sub-step that updates existing files to use the new primitives.

**Dark mode**: Removed. The app is internal-only and dark-mode-only. The dead `prefers-color-scheme` media query is removed and `globals.css` is simplified to a single dark theme. If light mode is ever needed, the semantic token layer makes it trivial to add later by swapping token values per media query.

---

## Phase 1 — Infrastructure Fixes and Semantic Tokens

**S1 — Fix Font Stack and Remove Dead Code**
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

**S2 — Semantic Design Token Layer**
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

**S3 — Phase 1 Testing and Validation**
Verify: Geist Sans renders as the body font (not Arial). Verify: `prefers-color-scheme` media query is gone. Verify: all semantic token classes resolve correctly in Tailwind (test by temporarily applying `bg-surface-card` to a div and confirming the correct color renders). Verify: `npm run build` passes. Verify: no visual regressions on existing pages (the token layer is additive; existing hardcoded classes still work).

---

## Phase 2 — Shared Atom Components

**S4 — Button Component**
Create `app/components/ui/button.tsx`. A polymorphic button component with the following API:

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

**S5 — Input, Select, and Textarea Components**
Create `app/components/ui/input.tsx`, `app/components/ui/select.tsx`, and `app/components/ui/textarea.tsx`. All three share consistent styling:

Base styles: `w-full rounded-lg border border-border-default bg-surface-input px-4 py-2.5 text-sm text-text-primary placeholder-text-muted focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-border-focus transition-colors`.

`Input` forwards all native `<input>` props. `Select` forwards all native `<select>` props. `Textarea` forwards all native `<textarea>` props with a default `rows={4}`.

Error state: when an `error` prop is passed, border changes to `border-status-danger` and focus ring to `ring-status-danger`.

**S6 — FormField Component**
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

**S7 — Badge Component**
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

**S8 — Phase 2 Migration — Existing Components**
Migrate existing components to use the new atoms. Priority order:

1. `connection-form.tsx` — replace all inline button styles with `<Button>`, all input styles with `<Input>` / `<Select>`, and form label patterns with `<FormField>`.
2. `skill-detail-actions.tsx` — replace inline button styles with `<Button variant="secondary">`, `<Button variant="danger">`, etc.
3. `document-review-card.tsx` — replace inline input, select, and button styles. Replace `ConfidenceBadge` internal styles with `Badge`.
4. `content-diff.tsx` — replace toggle button styles with `<Button variant="ghost" size="sm">`.
5. `narrative-detail-actions.tsx` (if built by then) — same as skill-detail-actions pattern.

Migration rule: do not change component behavior or DOM structure. Only replace inline Tailwind class strings with the new shared component imports.

**S9 — Phase 2 Testing and Validation**
Verify: all migrated components render identically (within minor sub-pixel differences from consistent padding/sizing). Verify: Button loading state works (spinner + disabled). Verify: FormField error state renders correctly. Verify: Badge renders all variants at both sizes. Verify: `npm run build` passes. Browser smoke test: navigate all pages (`/knowledge`, `/skills`, `/connections`, `/bulk-upload`, `/queue`, `/dashboard`) and confirm no visual regressions.

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

The component renders: a tab bar with count badges, a search input using the shared `Input` component, and a list of items via the `renderItem` callback. It handles the empty state with a configurable message.

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

Uses the `Button` component for actions and the semantic overlay token (`bg-surface-overlay`) for the backdrop.

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

**Open Questions:**

| Question | Context |
|---|---|
| Should the token layer support a future light mode? | If yes, tokens should use CSS custom properties that can be swapped per media query rather than direct Tailwind color references. The current scope assumes dark-mode-only, but the token architecture should be extensible. Recommendation: use the `@theme inline` approach now; refactor to CSS custom properties if light mode is ever needed. |
| Should `FilterableList` use URL-based state (query params) or React state? | URL state enables shareable filtered views and survives page refreshes. React state is simpler. Existing list pages use React state. Recommendation: keep React state for now; add URL state as a future enhancement if users request shareable links. |
| Should shared components be published as a package? | For a single internal app, a package adds overhead. If the design system is ever shared across multiple apps, extract to a package then. Recommendation: no package for now. |

## Recommended Build Order

1. **S1 → S2 → S3** (Phase 1: fixes, tokens, validation) — prerequisite for everything; < 1 day
2. **S4 → S5 → S6 → S7 → S8 → S9** (Phase 2: atoms, migration, validation) — highest-impact visual consistency improvement; 1-2 days
3. **S10 → S11 → S12 → S13 → S14** (Phase 3: layout, loading, errors, migration, validation) — structural consistency; 1-2 days
4. **S15 → S16 → S17 → S18 → S19** (Phase 4: centralization, organisms, migration, validation) — consolidation; 1-2 days
5. **S20** (Phase 5: documentation) — after all other phases; < 1 day

Phases 1-2 are sequential (atoms consume tokens). Phases 3-4 can be done in parallel or in either order, as they are independent of each other. Both depend on Phase 2 (they use the atoms). Phase 5 runs last.

**Total estimated effort: 5-8 days**, spread across sprints or interleaved with feature work. Phase 1 should be done immediately as it fixes actual bugs (broken font stack) and unblocks all subsequent phases.
