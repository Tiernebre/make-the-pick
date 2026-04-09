# ADR-006: Data Table Library for Draft Pool and Live Draft

## Status

Accepted (2026-04-09)

## Context

The draft pool page currently uses a basic Mantine `Table` component with
hard-coded columns and no interactivity beyond display. As the app grows toward
an ESPN/Yahoo Fantasy Football level of detail, we need a data-driven table that
supports:

- **Multi-column sorting** (e.g., sort by ATK descending, then SPE descending)
- **Per-column filtering** (e.g., filter by Pokemon type, stat thresholds)
- **Global search** (quick-find a Pokemon by name)
- **Pagination or virtual scrolling** (draft pools can be 150+ Pokemon)
- **Column visibility toggling** (users may not care about every stat)
- **Column resizing/reordering** (personal preference)
- **Responsive/mobile support** (drafts happen on phones)

This table will be reused across at least two surfaces:

1. **Draft pool browser** — pre-draft research and during-draft player selection
2. **Live draft board** — showing available/drafted players in real time

The current UI stack is **React 19 + Mantine 7**. Any solution must integrate
cleanly with Mantine's design system (dark mode, theme tokens, component
consistency).

## Options Considered

### Option A: TanStack Table (headless) + custom Mantine rendering

[TanStack Table](https://tanstack.com/table/latest) (formerly React Table v8) is
a headless, framework-agnostic table engine. It provides the logic (sorting,
filtering, pagination, column management) and you render the UI yourself.

**Pros:**

- Fully headless — zero styling opinions, full control over Mantine integration
- Tiny bundle (~15 KB gzipped)
- MIT license, completely free
- Massive community (24k+ GitHub stars), excellent docs
- First-party support for React 19
- Feature-complete: sorting, filtering, pagination, column pinning, row
  selection, column visibility, virtual scrolling (via TanStack Virtual)
- Can build exactly the ESPN/Yahoo aesthetic without fighting a library's
  opinions
- AG Grid recently partnered with TanStack, validating its architecture

**Cons:**

- Requires building all table UI from scratch using Mantine components
- More initial development effort (column headers, filter inputs, pagination
  controls)
- No pre-built "data table" component — you own the full rendering layer

### Option B: Mantine React Table

[Mantine React Table](https://www.mantine-react-table.com/) is a batteries-
included wrapper around TanStack Table that renders with Mantine components.

**Pros:**

- Built on TanStack Table — same powerful engine under the hood
- Renders with Mantine components out of the box (inputs, menus, badges, etc.)
- Built-in column filter UI, search bar, pagination, toolbar, density toggle
- Dark mode works automatically via Mantine theme
- MIT license, free
- Less boilerplate than raw TanStack Table — faster to get a working table
- Custom cell renderers still supported for Pokemon-specific formatting (type
  badges, stat highlighting)

**Cons:**

- Adds an abstraction layer over TanStack Table that can be harder to customize
  when you need pixel-perfect control
- Smaller community (~2.5k GitHub stars) — fewer examples, slower issue response
- Opinionated about toolbar layout and filter UX — customizing beyond its
  defaults can mean fighting the library
- Version coupling risk: depends on both TanStack Table and Mantine major
  versions aligning
- Bundle size is larger than raw TanStack Table (ships its own component layer)
- Currently at v2 beta for Mantine 7 support (v1 targets Mantine 6)

### Option C: AG Grid (Community Edition)

[AG Grid](https://www.ag-grid.com/) is a full-featured enterprise grid with a
free community tier.

**Pros:**

- Extremely feature-rich out of the box (grouping, aggregation, tree data,
  clipboard, Excel export)
- Handles massive datasets (100k+ rows) with virtualization by default
- Strong enterprise adoption and long-term maintenance

**Cons:**

- Desktop-first — mobile experience is poor without significant custom work
- Brings its own styling system that conflicts with Mantine's design tokens
- Large bundle size
- Community edition lacks key features (row grouping, server-side row model)
  that require a $999+/year enterprise license
- Overkill for our dataset sizes (draft pools are ~150-300 rows, not 100k)
- Does not integrate with Mantine's theme or dark mode without extensive
  overrides

### Option D: MUI DataGrid

[MUI X DataGrid](https://mui.com/x/react-data-grid/) is the Material UI
ecosystem's data grid.

**Pros:**

- Well-documented, strong TypeScript support
- Built-in sorting, filtering, pagination

**Cons:**

- We don't use MUI — introducing it alongside Mantine creates two competing
  design systems
- Material Design aesthetic clashes with our existing Mantine look
- Paid tiers for advanced features ($180+/year per developer)
- Would require maintaining two sets of theme tokens

## Decision

**Option B: Mantine React Table (`mantine-react-table@2.0.0-beta.9`).**

### Why Mantine React Table over raw TanStack Table?

We already use Mantine 7 across the entire app. Mantine React Table gives us
enterprise-grade table features (sorting, filtering, pagination, global search,
column visibility, density toggle, sticky headers) out of the box with zero
custom rendering for standard controls. We still get full custom cell rendering
for domain-specific needs (Pokemon type badges, stat formatting) via the `Cell`
property on column definitions.

The productivity gain of not building filter inputs, sort indicators,
pagination, toolbar, and column visibility toggles from scratch outweighs the
minor loss of control over those UI elements. If we ever hit a wall with
customization, we can drop down to raw TanStack Table since Mantine React Table
is built on it — the column definitions and data model transfer directly.

### Why the v2 beta?

Mantine React Table v1 targets Mantine 6. Our project uses Mantine 7. The v2
line is the only version compatible with our stack. The beta is stable enough
for our use case (basic sorting, filtering, pagination) and is actively
maintained.

### Dependencies added

```
mantine-react-table@2.0.0-beta.9  (MIT, wraps @tanstack/react-table)
@mantine/dates@^7.17              (peer dependency)
@tabler/icons-react@>=2.23.0      (peer dependency — toolbar icons)
clsx@>=2                           (peer dependency)
dayjs@>=1.11                       (peer dependency — date filters)
```

## Consequences

### What becomes easier

- **Rapid feature delivery** — sorting, filtering, pagination, global search,
  and column visibility work immediately with zero custom UI code
- **Design consistency** — the table uses Mantine components for all controls,
  matching the rest of the app automatically (including dark mode)
- **Custom cell rendering** — Pokemon type badges, stat formatting, and draft
  status indicators are supported via the `Cell` column property
- **Reuse across surfaces** — the same column definitions work for draft pool
  browsing and live draft with different table options
- **ESPN/Yahoo-style features** — dense mode toggle, sticky headers, column
  resizing, and per-column range filters give the "enterprise data table" feel

### What becomes harder

- **Deep UI customization** — if we need to fundamentally change the toolbar
  layout or filter UX, we'll be working against the library's opinions
- **Version management** — we depend on a beta version; we'll need to track
  updates and test upgrades as v2 stabilizes
- **Bundle size** — larger than raw TanStack Table, though acceptable for a
  feature-rich table component
