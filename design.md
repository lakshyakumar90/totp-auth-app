# Clears — Design System

Extracted from the marketing site (clears.ai). Dark, technical, "engineering tool" aesthetic — think terminal/IDE meets SaaS landing page.

---

## 1. Design Philosophy

- **Mood**: Dark, precise, technical, quietly confident. No gradients-as-decoration, no stock illustration — everything reads like a product screenshot or a system diagram.
- **Voice**: Lowercase body copy mixed with UPPERCASE tracked-out labels (like terminal/CLI tags). Feels engineered, not "marketed."
- **Density**: Generous negative space around a tight, structured core (nav, hero, cards). Sections breathe with large vertical rhythm.
- **Motif**: Nodes, connectors, dotted grid lines, small squares/diamonds as bullets — visual language borrowed from flowcharts and agent/graph diagrams (fits the "agentic workflow" product).

---

## 2. Color Palette

| Token | Hex (approx) | Usage |
|---|---|---|
| `--bg-primary` | `#0A0A0B` | Page background, near-black |
| `--bg-surface` | `#141416` | Card/panel background |
| `--bg-surface-alt` | `#1A1A1D` | Nested panels, code-window chrome |
| `--border-subtle` | `#2A2A2E` | 1px card/divider borders |
| `--accent-primary` | `#8B5CF6` (violet) | CTAs, links, star ratings, active states, glowing node dots |
| `--accent-primary-hover` | `#7C3AED` | Button hover/darker violet |
| `--text-primary` | `#F5F5F7` | Headlines, high-emphasis text |
| `--text-secondary` | `#A1A1AA` | Body copy, subheads |
| `--text-muted` | `#6B6B70` | Captions, footer text, timestamps |
| `--success/status` | small colored dots (green/amber) | Status indicators inside mock UI panels |

**Accent usage rule**: violet is used sparingly and consistently — only for primary CTA fill, star icons, small "active" node dots, and link/nav hover. Everything else stays grayscale. This restraint is what makes the accent feel premium rather than decorative.

---

## 3. Typography

- **Primary typeface**: Clean geometric/grotesk sans-serif (e.g. Inter, Söhne, or similar) for all UI text and body copy.
- **Label/tag typeface**: Monospace (e.g. JetBrains Mono, IBM Plex Mono) for small uppercase tags — `TRUSTED BY`, `BACKGROUND FLOWS`, `PAGE BOARD`, `OPEN OVER MCP` — always letter-spaced (~0.1–0.15em tracking).

| Style | Size (desktop) | Weight | Case | Notes |
|---|---|---|---|---|
| Hero H1 | ~56–64px | 500–600 | Sentence case | Tight line-height (~1.1), light gray-white |
| Section H2 | ~32–40px | 500–600 | Sentence case | e.g. "An Execution Layer That Carries..." |
| Card/Feature H3 | ~18–20px | 600 | Sentence case | e.g. "Agentic Workflows" |
| Body / paragraph | 15–16px | 400 | Sentence case | Muted gray, ~1.6 line-height, max-width ~600px for readability |
| Eyebrow/label tag | 11–12px | 500 | UPPERCASE | Monospace, wide letter-spacing, often in a bordered pill |
| Nav links | 13–14px | 400–500 | UPPERCASE | Small tracked-out caps |
| Button text | 13–14px | 500–600 | UPPERCASE | Small tracked caps, prefixed with a small ◆/• glyph on primary CTA |

---

## 4. Layout & Spacing

- **Grid**: Centered single-column content max-width ~1200px, generous side margins (~10–15% on desktop).
- **Nav bar**: Fixed/top, logo left, nav links + Login + primary CTA button right. Height ~64–72px. Transparent/dark, sits directly on page background (no strong separation line, maybe 1px hairline).
- **Hero**: Centered text block, eyebrow pill → H1 → subhead paragraph → dual CTA buttons (primary filled + secondary outlined), all centered.
- **Vertical rhythm**: Large section padding — roughly 120–160px between major sections. Content within a section is tighter (24–48px gaps).
- **Cards/panels**: Rounded corners (~8–12px radius), 1px subtle border, slightly lighter fill than page background, subtle inner content padding (~24px).
- **Feature grid**: 3-column grid on desktop (icon block → heading → description), equal-width cards with generous gutter (~24–32px).
- **Diagram/mock UI panels**: Nested "window" style panels with their own mini chrome (dots/icons top-left like traffic lights or a small logo), dotted connector lines linking outer icon nodes to a central panel — visualizes the product's own architecture.

---

## 5. Components

### Buttons
- **Primary**: Solid violet fill, black/dark text or white text, small square/diamond bullet before label, uppercase tracked text, fully rounded or 6–8px radius, compact padding (~10px 20px).
- **Secondary**: Transparent/dark fill, 1px subtle border, same text treatment, no bullet glyph.

### Cards
- Dark surface (`--bg-surface`) on dark background (`--bg-primary`) — separation achieved via subtle border + very slight elevation, not shadow-heavy.
- Icon block at top (small dark square containing a simple line icon or 3D-ish cube/layer glyph).
- Heading + 1–2 line muted description below.

### Testimonial / avatar rows
- Circular avatar, 5-star rating row in violet above name, bold name + muted role/company line below. Laid out in a 2×2 or horizontal row grid.

### Logo strip ("Trusted by")
- Monochrome/low-opacity wordmark logos, evenly spaced, small uppercase "TRUSTED BY" label above in muted tracked type.

### Diagram / node visuals
- Small squares as node markers, thin dotted lines as connectors, violet dot accents at connection points — used repeatedly (hero diagram, feature icons) as the site's core visual signature.

### Section labels (eyebrow tags)
- Small bordered pill or plain tracked monospace caps preceding every section heading (e.g. `BACKGROUND FLOWS`, `PAGE BOARD`, `OPEN OVER MCP`) — gives each section a "system log" feel.

---

## 6. Imagery Style

- No photography except small circular testimonial headshots.
- All other visuals are UI screenshots/mockups of the actual product (dark-themed dashboards, kanban-like boards, terminal panels) or abstract line-diagram illustrations (nodes, layered cubes, connectors) rendered flat in violet/gray on dark backgrounds.

---

## 7. Motion & Detail Cues (inferred)

- Likely subtle: dotted-line "flow" animations along connectors, glowing violet node pulses, soft fade-ins on scroll for section reveals — consistent with the "flows that run themselves" narrative.
- Dotted background texture appears near CTA sections (subtle grid-of-dots pattern) for added technical texture without noise.

---

## 8. Quick Reference (CSS variables)

```css
:root {
  --bg-primary: #0A0A0B;
  --bg-surface: #141416;
  --bg-surface-alt: #1A1A1D;
  --border-subtle: #2A2A2E;
  --accent-primary: #8B5CF6;
  --accent-primary-hover: #7C3AED;
  --text-primary: #F5F5F7;
  --text-secondary: #A1A1AA;
  --text-muted: #6B6B70;

  --font-sans: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', 'IBM Plex Mono', monospace;

  --radius-card: 10px;
  --radius-button: 6px;
  --section-padding-y: 140px;
}
```