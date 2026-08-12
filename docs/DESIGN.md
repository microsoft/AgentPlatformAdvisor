# Design System — Agent Platform Advisor

## Product Context

- **What this is:** A static, YAML-driven decision-support web app that recommends the right Microsoft agent experience for a scenario.
- **Who it's for:** Microsoft enterprise customers, business users, IT pros, professional developers, architects, and data/ML engineers choosing how to use, delegate, or build agents.
- **Space/industry:** Microsoft productivity, Copilot, enterprise AI tooling, and platform-selection guidance.
- **Project type:** Single-page web app with a prescreen flow, scored wizard, recommendation results, and exploratory guidance.
- **Distribution:** Static site on GitHub Pages, published by Robert Standefer.
- **Memorable thing:** Serious decision software for Microsoft AI builders and buyers.

## Aesthetic Direction

- **Direction:** Warm Charcoal Instrument.
- **Decoration level:** Intentional. Use thin dividers, score rails, subtle grid texture, and diagnostic readouts. Do not use decorative blobs, gradient hero sections, glows, or icon-in-circle ornament.
- **Mood:** The app should feel like an engineered decision console. Users should feel the tool is measuring their scenario, not selling them a generic AI product.
- **Category stance:** Stay Microsoft-literate through trust, clarity, and accessibility. Depart from the default AI-tool look (near-black canvas + blue signal glow) by using a warm, matte charcoal workspace with a single restrained Microsoft blue signal — no glows.
- **Reference sources:** Fluent 2 design principles, Microsoft 365 Copilot product pages, Copilot Studio product pages, Microsoft Foundry surfaces, and current enterprise AI dashboard guidance.

## Typography

- **Display/Hero:** `"IBM Plex Sans", sans-serif` at 600-700 weight.
  - Use for the product title, question text, recommendation headings, and large decision statements.
  - Rationale: engineered, serious, and readable without falling into the default Segoe/Inter/Roboto convergence trap.
- **Body/UI:** `"IBM Plex Sans", sans-serif` at 400-500 weight.
  - Use for all body copy, option text, explanations, buttons, and UI labels that are not diagnostic metadata.
- **Data/Tables/Labels:** `"IBM Plex Mono", "Geist Mono", "Cascadia Code", monospace`.
  - Use for score numbers, platform IDs, step counters, fit deltas, diagnostic metadata, and compact labels.
  - Always use `font-variant-numeric: tabular-nums` for numeric scores and score comparisons.
- **Fallback:** Aptos or Segoe UI may appear after IBM Plex in the stack for Microsoft environments, but they are fallbacks, not the visual signature.
- **Loading:** Use Google Fonts or a self-hosted font strategy with `font-display: swap`.
  - `https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap`

### Type Scale

| Token | CSS variable | Size | Weight | Use |
|---|---|---:|---:|---|
| display | `--fs-display` | 3rem / 48px | 700 | First screen thesis, final recommendation headline |
| title | `--fs-title` | 2.25rem / 36px | 700 | Page headings, major result titles |
| heading | `--fs-heading` | 1.625rem / 26px | 600 | Question text, section headings |
| subhead | `--fs-subhead` | 1.25rem / 20px | 600 | Card titles, panel headings |
| body-lg | `--fs-body-lg` | 1.125rem / 18px | 400 | Lead copy, important explanations |
| body | `--fs-body` | 1rem / 16px | 400 | Standard UI copy, option labels |
| body-sm | `--fs-body-sm` | .9375rem / 15px | 400-500 | Supporting copy, option descriptions, buttons |
| caption | `--fs-caption` | .875rem / 14px | 400 | Secondary details |
| mono | `--fs-mono` | .8125rem / 13px | 500-600 | Platform IDs, counters, score labels |
| mono-sm | `--fs-mono-sm` | .75rem / 12px | 500-600 | Badges and legends — **the smallest size permitted** |

- **Always use `rem`, never `px`, for `font-size`.** Sizes are declared once as `--fs-*` tokens on `:root` and referenced everywhere else, so a user's browser font-size preference scales the whole app. `html { font-size: 100% }` — do not reset it to `62.5%` or a fixed px value.
- **12px is the floor.** No text below `--fs-mono-sm`, including badges, eyebrows, and legends. Small + uppercase + letter-spaced + `--muted-foreground` is the least legible combination in the system; do not stack all four below 13px.
- **Never shrink type at mobile breakpoints.** Responsive overrides may reduce display/title sizes for line-length reasons, but body, caption, and mono sizes hold at every viewport.
- **Measure:** cap running prose at ~70ch. The container is 1024px wide, which yields ~95ch lines at body size.

## Color

- **Approach:** Restrained warm-charcoal dark-primary system. One saturated signal color (blue), warm matte neutrals (no blue-black), no glows, semantic colors reserved for actual state.

| Token | Hex | Use |
|---|---|---|
| `--canvas` | `#1A1714` | Page background (warm matte charcoal) |
| `--surface` | `#221E1A` | Main panels and cards |
| `--surface-raised` | `#2A241F` | Active panels, selected options, result readouts |
| `--surface-hot` | `#332E28` | Hover/active surface state |
| `--text` | `#ECE6DC` | Primary text (warm off-white) |
| `--muted` | `#9C9384` | Secondary text and explanatory copy |
| `--border` | `#332E28` | Default borders and dividers |
| `--border-hot` | `#453E35` | Active borders and panel edges |
| `--accent` | `#0078D4` | Primary signal: winner, progress, focus, score rails, primary CTA |
| `--accent-strong` | `#2B9AEE` | Hover/focus highlights and high-emphasis labels |
| `--accent-dim` | `#0B5187` | Low-emphasis progress fills and quiet data visualization |
| `--success` | `#35C08A` | Strong fit, positive delta, success |
| `--warning` | `#E0B24B` | Caveats, close calls, confidence warnings |
| `--error` | `#E5695E` | Hard-rule conflicts and failures |

- **Light mode:** Optional secondary mode, not the identity. If retained, invert the system deliberately instead of flattening to white cards. Use `#F4F7FB` canvas, `#FFFFFF` surface, `#172033` text, `#5D6B80` muted, and keep a deep blue `#005A9E` as the signal color.
- **No glows:** Do not add colored `box-shadow` glows or `text-shadow` on the accent. The signal reads through hue and placement, not bloom.
- **Contrast:** Body text must meet WCAG AA. Accent text on dark surfaces must be tested, not assumed.

## Spacing

- **Base unit:** 4px.
- **Density:** Compact-comfortable. Tighter than a marketing page, less dense than a monitoring dashboard.

| Token | Value | Use |
|---|---:|---|
| 2xs | 2px | Fine borders, tiny offsets |
| xs | 4px | Tight inline gaps |
| sm | 8px | Label gaps, compact padding |
| md | 16px | Option padding, form rhythm |
| lg | 24px | Panel padding, section internals |
| xl | 32px | Major content spacing |
| 2xl | 48px | Screen section gaps |
| 3xl | 64px | First viewport rhythm |

## Layout

- **Approach:** Hybrid instrument layout. Use grid discipline for readability, but avoid symmetric card catalogs as the primary mental model.
- **Primary workspace:** A decision workspace with three zones when space allows:
  - Left: intent or live fit rail.
  - Center: current question, recommendation, or scenario explanation.
  - Right: evidence panel, score rationale, warnings, or next-step details.
- **Explore page:** Group by mental model, not a flat gallery.
  - Use agents: Microsoft 365 Copilot, Copilot Cowork, Microsoft Scout.
  - Build agents: Agent Builder, Copilot Studio, Microsoft Foundry.
- **Wizard:** The user should always know the current question, current progress, and how each answer affects recommendation confidence.
- **Results:** The winning recommendation should feel like a diagnostic report: score delta, why it won, hard-rule notes, and next steps.
- **Grid:** 12-column desktop grid, 8-column tablet grid, single-column mobile layout.
- **Max content width:** 1200px for instrument workspace, 1024px for prose-heavy wizard panels.
- **Border radius:** `sm: 4px`, `md: 8px`, `lg: 12px`, `full: 9999px`. Radius should express containment hierarchy, not bubbly decoration.
- **Elevation:** Prefer borders, lit edges, and surface contrast over large shadows. Shadows may be used sparingly for modals.

## Motion

- **Approach:** Minimal-functional with one signature behavior: score/readout calibration.
- **Easing:** enter `ease-out`, exit `ease-in`, move `cubic-bezier(0.4, 0, 0.2, 1)`.
- **Duration:**
  - micro: 50-100ms for hovers and focus.
  - short: 150-220ms for option selection and panel changes.
  - medium: 250-400ms for section transitions.
  - long: 600-900ms for score rail calibration.
- **Rules:**
  - Animate transform, opacity, and score widths only.
  - Do not use `transition: all`.
  - Respect `prefers-reduced-motion`.
  - Motion must explain state change. No decorative shimmer, bounce, or scroll theater.

## Components and Patterns

### Decision Rail

Use a persistent or contextual rail to show current platform fit. Each row includes:
- Mono platform ID.
- Current score or fit label.
- Thin signal bar.
- Optional delta from leader.

The rail turns the advisor into an instrument and reduces the generic quiz feel.

### Evidence Panel

Use a side panel or expandable section for:
- Why the leading recommendation changed.
- Hard-rule exclusions.
- Confidence warnings.
- Source/rationale links.
- Next actions.

### Option Cards

Option cards are allowed only when they are the interaction. They must include a clear label, concise explanation, visible selected state, keyboard focus, and enough hit area for touch.

### Explore Groups

Explore should not be one undifferentiated six-card gallery. It must preserve the decision model:
- Use agents.
- Build agents.

Each group needs a short explanation of what the group means before listing products.

## Anti-Slop Rules

Never introduce these patterns without explicit approval:

- Purple/violet gradients as the default AI signal.
- Generic three-column feature grids with icon, title, and two-line description.
- Icons in colored circles as decoration.
- Centered-everything hero sections.
- Decorative blobs, waves, floating orbs, or soft abstract AI shapes.
- Uniform large border radius on every element.
- Gradient CTA buttons.
- Stock-photo-style hero imagery.
- Vague marketing copy like "unlock the power of AI" or "built for the future."
- Flat white card galleries as the primary information architecture.

## Accessibility

- All interactive targets must be at least 44px tall or wide.
- Every custom interactive element must have keyboard support and visible `:focus-visible`.
- Body text contrast must meet 4.5:1. Large text and UI components must meet 3:1.
- Do not encode status with color alone. Pair color with label, icon, or text.
- Preserve visible labels. Never use placeholders as labels.
- Support reduced motion.

## Migration Guidance

The current implementation may still use the older Fluent-light system until a redesign lands. Future visual work should migrate toward this system in coherent sections, not one token at a time. Prioritize:

1. Explore page grouping and decision-model language.
2. Result page diagnostic report styling.
3. Wizard progress and score calibration behavior.
4. Dark graphite token implementation.
5. Typography migration to IBM Plex Sans and IBM Plex Mono.

## Decisions Log

| Date | Decision | Rationale |
|---|---|---|
| 2026-07-20 | Replaced Fluent-light direction with Graphite Decision Instrument | Created by /design-consultation after the user chose to start fresh and selected "serious decision software for Microsoft AI builders and buyers" as the memorable thing. |
| 2026-07-20 | IBM Plex Sans + IBM Plex Mono | Gives the product an engineered, technical voice without relying on Segoe as the visual signature. |
| 2026-07-20 | Dark graphite + Azure-cyan signal color | Raises memorability and lowers AI-slop risk while preserving a Microsoft-adjacent trust cue. |
| 2026-07-24 | Rebuilt the type scale on rem tokens and raised every size one step | An audit found the code had drifted a full step below the documented scale (body shipped at 14px, captions at 12px, some labels at 10-11px) and used `px` everywhere, so browser font-size preferences did nothing. All 74 declarations now reference `--fs-*` rem tokens, with a 12px floor and no downward mobile overrides. |
| 2026-07-24 | Swapped the teal signal for Microsoft blue `#0078D4` | User asked for the green/teal highlight to be blue. Warm charcoal canvas, neutrals, typography, and no-glow rule are unchanged; only the signal hue moved (dark `#0078D4` / `#2B9AEE` / `#0B5187`, light `#005A9E`). Success/warning/error semantics untouched. |
| 2026-07-22 | Replaced Graphite/Azure-cyan with Warm Charcoal + teal signal (via /design-shotgun) | The near-black `#0C0F14` canvas + single cyan-blue glow read as the generic AI-tool look the user rejects. New system: warm matte charcoal `#1A1714` (no blue-black), single restrained teal `#17B0A7` signal, no glows. IBM Plex Sans/Mono retained. User rejected: generic-AI-dark, Blueprint (light/amber), signal-red, sage, bone, brass-gold, and emerald before landing on teal. |
| 2026-07-20 | Explore by Use agents / Build agents | Keeps the information architecture aligned with how users decide, instead of flattening everything into a six-card gallery. |
| 2026-08-11 | Advisory blocks differentiate by tint and label weight, never a colored left border | Design review round 3 found `border-left: 3-4px solid <accent>` on `.rec-callout`, `.rec-adjacent-note`, `.delegate-tip`, and `.rec-spotlight` — six near-identical blocks on one result card, reintroducing a pattern the Anti-Slop Rules already ban and commit `d9e9e88` had just removed. Emphasis is now accent tint (conditional callouts) vs neutral surface (adjacent notes). |
| 2026-08-11 | The 44px touch-target rule is enforced by `tests/e2e/touch-targets.spec.js` | The rule regressed twice on one branch because it lived only in prose. `min-height: 44px` now sits on the `.btn` base class rather than per-component patches, and a Playwright spec fails the build on any visible control under 44px. |
| 2026-08-11 | Multi-select controls use a square checkmark indicator; radios stay circular | The constraints step announced `role="checkbox"` but drew an 18px circle, so sighted users had no reason to select more than one. Shape must match the announced role. |
| 2026-08-12 | A card that highlights on hover must be clickable across its whole surface | The Explore cards advertised a 166,076px² target and honored a 6,415px² one, with `cursor: auto` throughout. Where a card has exactly one destination and no competing action, the anchor stretches over the card with `::after` and keeps focus, so keyboard and AT behavior are unchanged. If a card ever gains a second link, the stretched link must be removed rather than layered with `z-index`. |
| 2026-08-12 | A control that removes itself on activation must announce its replacement and hand off focus | The "Was this helpful?" buttons vanished on click, leaving no live region and dropping focus to `<body>`. Status messages replacing a control use `role="status"`, are unhidden before their text is written, and take focus only when activation came from the keyboard (`:focus-visible`) so mouse users are not hijacked. |
