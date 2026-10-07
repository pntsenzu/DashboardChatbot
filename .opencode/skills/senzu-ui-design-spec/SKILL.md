---
name: senzu-ui-design-spec
description: UI Design Specification rules and design system for Senzu Sale Hub Dashboard.
---

# Senzu UI Design Specification — Instructions

## Design Philosophy
1. **Neutral first, brand second**: Page background and cards use neutral grey/white. Brand color (`hsl(137 70% 29%)`) is reserved exclusively for primary action buttons and selected active menu/tab states.
2. **Hairline borders over heavy shadows**: Use `1px solid hsl(var(--border))` borders. Shadows are kept minimal (`shadow-xs` for cards/inputs, `shadow-md` for dropdowns/popovers, `shadow-lg` for modals).
3. **No box-in-box**: Use clear section spacing instead of nesting card containers unnecessarily.
4. **Single primary action per section**: At most ONE default primary button (`.b-default` / `bg-primary`) per view component.
5. **Fixed typography scale**: Exactly 7 text levels (`t-page`, `t-section`, `t-card`, `t-label`, `t-meta`, `t-overline`, `t-metric`).
6. **Tabular numbers for metrics**: All numbers, KPI metrics, percentages, timestamps, and table numbers must use `tabular-nums` (`.tabular`).

## CSS Variables (`app/globals.css`)
```css
:root {
  --background: 220 20% 97.5%;
  --foreground: 222 25% 11%;
  --card: 0 0% 100%;
  --popover: 0 0% 100%;
  --primary: 137 70% 29%;
  --primary-hover: 137 72% 25%;
  --primary-foreground: 0 0% 100%;
  --secondary: 220 14% 94%;
  --secondary-foreground: 222 20% 18%;
  --muted: 220 16% 96%;
  --muted-foreground: 220 9% 42%;
  --accent: 137 38% 95%;
  --accent-foreground: 137 70% 22%;
  --destructive: 0 72% 42%;
  --destructive-subtle: 0 80% 97%;
  --destructive-border: 0 60% 88%;
  --warning: 36 92% 30%;
  --warning-subtle: 42 90% 95%;
  --warning-border: 40 70% 82%;
  --success: 158 64% 28%;
  --success-subtle: 155 45% 95%;
  --success-border: 155 35% 82%;
  --info: 214 72% 42%;
  --info-subtle: 214 90% 97%;
  --info-border: 214 60% 87%;
  --priority: 20 85% 40%;
  --priority-subtle: 24 100% 96%;
  --priority-border: 24 80% 85%;
  --border: 220 14% 90%;
  --input: 220 13% 62%;
  --ring: 137 70% 34%;
  --sidebar: 220 18% 96.5%;
  --sidebar-foreground: 222 20% 22%;
  --sidebar-border: 220 14% 90%;
  --radius: .5rem;
}
```

## Typography Scale Classes
- `t-page`: 20px / font-semibold / line-height 28px
- `t-section`: 14px / font-semibold / line-height 20px
- `t-label`: 14px / font-medium / line-height 20px
- `t-meta`: 12px / line-height 20px / color muted-foreground
- `t-overline`: 11px / font-semibold / uppercase / tracking-wider
- `t-metric`: 28px / line-height 32px / font-semibold / tabular-nums

## NextAuth Google Provider Rule
Only allow users with `@senzu.co.jp` email addresses and `email_verified === true`. Reject all other emails during the `signIn` callback.
