# Design Tokens

> Semantic design tokens for the Content Engine UI. All tokens are defined in `app/globals.css` via Tailwind v4's `@theme inline` directive and are available as standard Tailwind utility classes.
>
> Last updated: March 24, 2026

---

## Brand Reference

The Content Engine uses a dark theme derived from the HG Insights brand identity. The palette is built on navy-tinted dark surfaces rather than neutral grays, creating a branded atmosphere that aligns with HG deliverables (battle cards, insight reports, solution briefs).

**Source palette**: HG Blue `#2563EB`, adapted for dark surfaces with three functional blue values. Surfaces use navy-tinted near-blacks (`#0B1121` base) instead of pure gray. The Slate text scale (`F1F5F9` → `556B82`) carries a cool blue undertone that harmonizes with the navy surfaces.

**Contrast standard**: Every text/surface combination has been validated for WCAG AA (4.5:1 for normal text, 3:1 for large text). See contrast ratios in the text token table below.

---

## Usage

Tokens map Tailwind primitive values to semantic names. Use the **Tailwind utility class** column in components — never reference raw gray/blue/red palette classes in new code.

```tsx
// Correct — semantic token
<div className="bg-surface-card border border-border-default rounded-card">

// Incorrect — raw palette
<div className="bg-gray-900 border border-gray-800 rounded-xl">
```

---

## Surfaces

| Token | Tailwind Utility | Hex Value | Purpose |
|---|---|---|---|
| `--color-surface-page` | `bg-surface-page` | `#0B1121` | Page background. Navy-tinted near-black. |
| `--color-surface-card` | `bg-surface-card` | `#162032` | Card / panel / sidebar background. |
| `--color-surface-input` | `bg-surface-input` | `#243550` | Input / select / textarea / dropdown / popover background. |
| `--color-surface-overlay` | `bg-surface-overlay` | `oklch(0 0 0 / 0.7)` | Modal / dialog backdrop. |
| `--color-surface-active` | `bg-surface-active` | `oklch(from #2563EB l c h / 0.10)` | Active/selected row or nav item tint. Applied on top of card surface. |

Page-to-input total contrast ratio is 1.52, providing three clearly distinguishable layers when stacked.

## Borders

| Token | Tailwind Utility | Hex Value | Purpose |
|---|---|---|---|
| `--color-border-default` | `border-border-default` | `#3A5070` | Default border for cards, inputs, dividers. Visible on every surface (2.29 vs page, 1.99 vs card, 1.51 vs input). |
| `--color-border-focus` | `border-border-focus` | `#2563EB` | Focus rings, active tab indicators, accent borders. Also used as hover border state. |

On hover, elements transition from `border-default` to `border-focus` (the accent blue). Two border states (resting and active/focused) are sufficient.

## Text

All ratios validated against `surface-card` (`#162032`), the most common text container.

| Token | Tailwind Utility | Hex Value | vs Card | vs Page | vs Input | Purpose |
|---|---|---|---|---|---|---|
| `--color-text-primary` | `text-text-primary` | `#F1F5F9` | 14.90 (AAA) | 17.17 (AAA) | 11.28 (AAA) | Headings, body text, primary labels. Safe everywhere. |
| `--color-text-secondary` | `text-text-secondary` | `#94A3B8` | 6.36 (AA) | 7.34 (AAA) | 4.82 (AA) | Descriptions, secondary labels. Safe everywhere. |
| `--color-text-tertiary` | `text-text-tertiary` | `#7C8DA4` | 4.82 (AA) | 5.56 (AA) | 3.65 (AA-lg) | Metadata, timestamps, captions. **On input surfaces: use only at 12px+ bold or pair with `text-secondary`.** |
| `--color-text-muted` | `text-text-muted` | `#556B82` | 2.96 (AA-lg) | 3.41 (AA-lg) | 2.24 (below AA-lg) | Placeholders and disabled text only. Never use inside input fields as readable content. |

**Links** use `hg-blue-bright` (`#60A5FA`) directly — no separate `text-link` token. Passes AA on all surfaces at 5.63–7.40.

## Actions

| Token | Tailwind Utility | Hex Value | Text Color | Text Contrast | Purpose |
|---|---|---|---|---|---|
| `--color-action-primary` | `bg-action-primary` | `#2563EB` | `#FFFFFF` | 4.72 (AA) | Primary action button background |
| `--color-action-primary-hover` | `bg-action-primary-hover` | `#3B82F6` | `#FFFFFF` | 3.97 (AA-lg) | Primary action button hover |
| `--color-action-danger` | `bg-action-danger` | `#DC2626` | `#FFFFFF` | 4.63 (AA) | Destructive action button background |
| `--color-action-danger-hover` | `bg-action-danger-hover` | `#EF4444` | `#FFFFFF` | 3.59 (AA-lg) | Destructive action button hover |

Button text is always `#FFFFFF`, not `#F1F5F9`. The extra 0.3 contrast points matter at the AA threshold.

## Status

| Role | Text Token | Text Hex | Background Tint | Text vs Card |
|---|---|---|---|---|
| Success | `text-status-success` / `bg-status-success-bg` | `#34D399` | `oklch(from #059669 l c h / 0.12)` | 8.95 (AAA) |
| Warning | `text-status-warning` / `bg-status-warning-bg` | `#FBBF24` | `oklch(from #D97706 l c h / 0.12)` | 10.31 (AAA) |
| Danger | `text-status-danger` / `bg-status-danger-bg` | `#F87171` | `oklch(from #DC2626 l c h / 0.12)` | 5.90 (AA) |
| Info | `text-status-info` / `bg-status-info-bg` | `#60A5FA` | `oklch(from #2563EB l c h / 0.12)` | 7.09 (AAA) |

Status background tints use 12% opacity (reduced from 15%) for better balance on navy-tinted surfaces.

## Brand / Accent

| Token | Tailwind Utility | Hex Value | vs Card | vs Input | Purpose |
|---|---|---|---|---|---|
| `--color-hg-blue` | `bg-hg-blue` / `text-hg-blue` | `#2563EB` | 3.16 (AA-lg) | 2.39 | Primary accent. Buttons, focus rings, accent borders. **Large text only on dark surfaces.** |
| `--color-hg-blue-bright` | `text-hg-blue-bright` | `#60A5FA` | 6.42 (AA) | 4.86 (AA) | Links, info status, body-safe blue text on any surface. |
| `--color-hg-blue-muted` | `text-hg-blue-muted` | `#93C5FD` | 9.06 (AAA) | 6.86 (AAA) | Chart tertiary, decorative fills, light accents. |

Charts use these three values in order; no separate chart token namespace needed.

---

## Spacing

| Token | Tailwind Utility | Resolved Value | Purpose |
|---|---|---|---|
| `--spacing-page-x` | `px-page-x` | `spacing-6` (1.5rem) | Horizontal page padding |
| `--spacing-page-y` | `py-page-y` | `spacing-16` (4rem) | Vertical page padding |

## Sizing

| Token | Tailwind Utility | Resolved Value | Purpose |
|---|---|---|---|
| `--size-content-max` | `max-w-content-max` | `64rem` (1024px) | Max width for page content |
| `--size-sidebar` | `w-sidebar` / `ml-sidebar` | `20rem` (320px) | Sidebar width; also used as main content left margin |

**Navigation shell usage**: The `--size-sidebar` token is actively consumed by the navigation shell layout. `app/components/layout/sidebar-nav.tsx` uses `w-sidebar` for the fixed sidebar width, and `app/components/layout/app-shell.tsx` uses `ml-sidebar` on the main content area to offset it from the sidebar.

## Radii

| Token | Tailwind Utility | Resolved Value | Purpose |
|---|---|---|---|
| `--radius-sm` | `rounded-sm` | `radius-md` (0.375rem) | Small radius (overrides Tailwind default) |
| `--radius-card` | `rounded-card` | `radius-xl` (0.75rem) | Card / panel corners |
| `--radius-pill` | `rounded-pill` | `9999px` | Pill / badge shape |

---

## Fonts

| Token | Tailwind Utility | Resolved Value | Purpose |
|---|---|---|---|
| `--font-sans` | `font-sans` | Geist Sans (via `--font-geist-sans`) | Body and UI text |
| `--font-mono` | `font-mono` | Geist Mono (via `--font-geist-mono`) | Code and monospace text |

## Typography Scale

Semantic type scale tokens defined in `@theme inline`. Each token generates a Tailwind utility class that applies font-size, line-height, and font-weight together.

| Token | Tailwind Utility | Size | Weight | Line Height | Usage |
|---|---|---|---|---|---|
| `--text-display` | `text-display` | 30px | 800 (extrabold) | 1.2 | Primary page title; one per page |
| `--text-heading` | `text-heading` | 20px | 700 (bold) | 1.3 | Major content sections |
| `--text-subheading` | `text-subheading` | 16px | 600 (semibold) | 1.4 | Card headers, sub-sections, dialog titles |
| `--text-body` | `text-body` | 14px | 400 (normal) | 1.6 | Default paragraph and body copy |
| `--text-body-sm` | `text-body-sm` | 13px | 400 (normal) | 1.55 | Table cells, compact lists, sidebar content |
| `--text-caption` | `text-caption` | 12px | 500 (medium) | 1.4 | Metadata, timestamps, form labels, table headers |
| `--text-micro` | `text-micro` | 11px | 500 (medium) | 1.3 | Fine print, footnotes, smallest readable UI text |
| `--text-label` | `text-label` | 11px | 700 (bold) | 1.0 | Uppercase section labels, nav group headers |

Using `text-display` applies all three properties (size, line-height, weight). Separate `font-*` or `leading-*` classes are not needed. Text color is always applied separately via `text-text-primary`, `text-text-secondary`, etc.

`text-body` (14px) overlaps with Tailwind's built-in `text-sm`, and `text-caption` (12px) matches `text-xs`. Prefer the semantic tokens for new code — they include the correct weight and line-height for their role.

For heading hierarchy and label conventions, see [UI_STANDARDS.md](./UI_STANDARDS.md).

---

## Component Usage Examples

The shared atom components in `app/components/ui/` consume semantic tokens internally. Use the component API instead of raw token classes for buttons, inputs, badges, and form fields.

### Button

```tsx
import { Button } from "@/app/components/ui/button";

<Button variant="primary">Save</Button>
<Button variant="secondary">Cancel</Button>
<Button variant="danger">Delete</Button>
<Button variant="ghost" size="sm">Toggle</Button>
<Button loading>Saving...</Button>
```

Variants use `bg-action-primary`, `border-border-default`, `text-status-danger`, and `text-text-tertiary` tokens internally. Button text on primary/danger backgrounds is always `#FFFFFF`.

### Input / Select / Textarea

```tsx
import { Input } from "@/app/components/ui/input";
import { Select } from "@/app/components/ui/select";
import { Textarea } from "@/app/components/ui/textarea";

<Input placeholder="Name" />
<Input error="Required" />
<Select><option>Choose...</option></Select>
<Textarea rows={3} />
```

All form controls use `bg-surface-input`, `border-border-default`, `text-text-primary`, `placeholder-text-muted`, and `border-border-focus` / `ring-border-focus` tokens.

### FormField

```tsx
import { FormField } from "@/app/components/ui/form-field";
import { Input } from "@/app/components/ui/input";

<FormField label="Name" helpText="Required">
  <Input placeholder="Enter name" />
</FormField>
```

Labels use `text-text-secondary`. Help text uses `text-text-muted`. Error text uses `text-status-danger`.

### Badge

```tsx
import { Badge } from "@/app/components/ui/badge";

<Badge variant="success">Active</Badge>
<Badge variant="warning" size="sm">Review</Badge>
<Badge variant="danger">Failed</Badge>
<Badge variant="info">New</Badge>
<Badge variant="purple">MCP</Badge>
```

Badge variants use `bg-status-*-bg`, `text-status-*`, and `border-*-800` tokens.

---

## Adding New Tokens

1. Add the token to the `@theme inline` block in `app/globals.css` under the appropriate category.
2. Use a direct hex value or an existing Tailwind primitive as the value.
3. Update this document with the new token's name, utility class, hex value, contrast ratios (for color tokens), and purpose.
4. Use the semantic utility class in components — never the raw palette reference.
