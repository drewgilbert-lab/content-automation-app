# Design Tokens

> Semantic design tokens for the Content Engine UI. All tokens are defined in `app/globals.css` via Tailwind v4's `@theme inline` directive and are available as standard Tailwind utility classes.
>
> Last updated: March 24, 2026

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

| Token | Tailwind Utility | Resolved Value | Purpose |
|---|---|---|---|
| `--color-surface-page` | `bg-surface-page` | `gray-950` | Page background |
| `--color-surface-card` | `bg-surface-card` | `gray-900` | Card / panel background |
| `--color-surface-input` | `bg-surface-input` | `gray-800` | Input / select / textarea background |
| `--color-surface-overlay` | `bg-surface-overlay` | `oklch(0 0 0 / 0.6)` | Modal / dialog backdrop |

## Borders

| Token | Tailwind Utility | Resolved Value | Purpose |
|---|---|---|---|
| `--color-border-default` | `border-border-default` | `gray-800` | Default border for cards, inputs, dividers |
| `--color-border-hover` | `border-border-hover` | `gray-700` | Border on hover state |
| `--color-border-focus` | `border-border-focus` | `gray-600` | Border on focus state, also used for focus rings |

## Text

| Token | Tailwind Utility | Resolved Value | Purpose |
|---|---|---|---|
| `--color-text-primary` | `text-text-primary` | `white` | Primary text (headings, body) |
| `--color-text-secondary` | `text-text-secondary` | `gray-300` | Secondary text (labels, descriptions) |
| `--color-text-tertiary` | `text-text-tertiary` | `gray-400` | Tertiary text (metadata, timestamps) |
| `--color-text-muted` | `text-text-muted` | `gray-500` | Muted text (placeholders, disabled) |
| `--color-text-link` | `text-text-link` | `blue-400` | Hyperlinks |

## Actions

| Token | Tailwind Utility | Resolved Value | Purpose |
|---|---|---|---|
| `--color-action-primary` | `bg-action-primary` | `blue-600` | Primary action button background |
| `--color-action-primary-hover` | `bg-action-primary-hover` | `blue-500` | Primary action button hover |
| `--color-action-danger` | `bg-action-danger` | `red-600` | Danger / destructive action background |
| `--color-action-danger-hover` | `bg-action-danger-hover` | `red-500` | Danger action hover |

## Status

| Token | Tailwind Utility | Resolved Value | Purpose |
|---|---|---|---|
| `--color-status-success` | `text-status-success` | `green-400` | Success text / icon |
| `--color-status-success-bg` | `bg-status-success-bg` | `green-500 @ 15% opacity` | Success background tint |
| `--color-status-warning` | `text-status-warning` | `amber-400` | Warning text / icon |
| `--color-status-warning-bg` | `bg-status-warning-bg` | `amber-500 @ 15% opacity` | Warning background tint |
| `--color-status-danger` | `text-status-danger` | `red-400` | Danger / error text / icon |
| `--color-status-danger-bg` | `bg-status-danger-bg` | `red-500 @ 15% opacity` | Danger background tint |
| `--color-status-info` | `text-status-info` | `blue-400` | Info text / icon |
| `--color-status-info-bg` | `bg-status-info-bg` | `blue-500 @ 15% opacity` | Info background tint |

## Spacing

| Token | Tailwind Utility | Resolved Value | Purpose |
|---|---|---|---|
| `--spacing-page-x` | `px-page-x` | `spacing-6` (1.5rem) | Horizontal page padding |
| `--spacing-page-y` | `py-page-y` | `spacing-16` (4rem) | Vertical page padding |

## Sizing

| Token | Tailwind Utility | Resolved Value | Purpose |
|---|---|---|---|
| `--size-content-max` | `max-w-content-max` | `64rem` (1024px) | Max width for page content |
| `--size-sidebar` | `w-sidebar` | `20rem` (320px) | Sidebar width on detail pages |

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

Variants use `bg-action-primary`, `border-border-default`, `text-status-danger`, and `text-text-tertiary` tokens internally.

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
2. Use an existing Tailwind primitive as the value (e.g., `var(--color-gray-700)`).
3. Update this document with the new token's name, utility class, resolved value, and purpose.
4. Use the semantic utility class in components — never the raw palette reference.
