# Panel design system (v2)

Rules for building any page under `/admin` and `/client`. The reference implementation is
`src/app/admin/malls/page.tsx` — read it first and match its structure and density.

## Building blocks

| Need | Use |
|---|---|
| Page frame (sidebar, top bar, mobile tab bar, content width/padding) | `PanelLayout` from `@/components/DashboardShell` (`role`, `title`, `subtitle`, `width="default" \| "wide" \| "narrow"`) |
| Page title + actions row | `PageHeader` |
| Surfaces | `Card` (`interactive` for clickable), `CardHeader` |
| Buttons | `Button` (`variant`: primary / secondary / ghost / danger, `size`: sm / md / lg, `icon`, `loading`), `IconButton` (needs `label`) |
| Forms | `Field` (label/hint/required) wrapping `Input`, `Select`, `Textarea`; `SearchInput` |
| Status | `Badge` (`tone`: neutral / primary / success / warning / info / danger) |
| Metrics | `StatCard`, `IconTile` |
| States | `LoadingState`, `EmptyState`, `ErrorBanner` |
| Dialogs | `Sheet` (bottom sheet on phones, modal on desktop; `title`, `description`, `footer`, `size`) |
| Misc | `SectionTitle`, `Segmented` |

All exported from `@/components/ui`. Plain CSS classes behind them live in `globals.css`
(`p-card`, `p-btn p-btn-primary`, `p-input`, `p-label`, `p-badge p-badge-success`, `p-table`, `p-kbd`, `p-icon-tile`) and can be used directly where a wrapper does not fit (e.g. a `<Link className="p-btn p-btn-secondary">`).

## Colors — tokens only

The panel has a dark and a light theme. Every color must come from a theme token so both work:

- Text: `text-foreground`, `text-muted-foreground`, `text-primary`, `text-success`, `text-warning`, `text-info`, `text-destructive`
- Backgrounds: `bg-background`, `bg-card`, `bg-surface` (hover / nested), `bg-muted`, `bg-primary`, `bg-primary/10`, `bg-success/10` …
- Borders: `border-border`, `border-border-strong`, `border-primary/25` …

**Do not use**: `text-white/…`, `bg-white/[…]`, `border-white/…`, `bg-black…`, `text-slate-…`, `text-red-400`, `bg-amoled*`, `glass`, `glass-strong`, `btn-primary`, `input-premium`, `card-elevated`, `stat-card*`, `bg-neutral-…`, hex colors.
Exceptions: `text-white` on a solid `bg-primary` / brand gradient; print-only / PDF output markup, which keeps its own fixed print colors.

## Layout & responsiveness

- Use responsive Tailwind classes (`sm:`, `md:`, `lg:`). Do **not** branch styling on `useIsMobile()`; remove it unless it changes behavior.
- Desktop lists of records → `p-table` inside a `Card` with `overflow-x-auto`; on phones (`md:hidden`) show the same rows as stacked cards.
- Spacing rhythm: sections `space-y-6`, card padding `p-4 sm:p-5`, grids `gap-3 sm:gap-4`.
- Bottom padding for the mobile tab bar is handled by `PanelLayout`.

## Typography & copy

- Sentence case Turkish ("Yeni kayıt ekle", not "YENİ KAYIT EKLE"). No `uppercase tracking-widest`, no `italic`, no `font-black`.
- Page title `text-2xl font-bold` (via `PageHeader`), card titles `text-[15px] font-semibold`, body `text-sm`, meta `text-xs text-muted-foreground`.
- Nothing smaller than `text-xs` (12px) for readable text.
- Numbers: `tabular-nums`.

## Behavior

Presentation only: keep every state variable, handler, Supabase query, realtime subscription, route and validation exactly as it was.
