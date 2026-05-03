# Design Brief — PowerAmp Player Clean Rebuild

## Purpose & Context
Premium dark music player with full audio diagnostics for Gerrod. CarPlay-style tile grid UI — each feature in own dedicated tile, nothing stacked. Shiny electric blue 1080p metallic aesthetic. Glow-based interactivity — cyan and purple accents. Pure function meets premium UX.

## Tone & Differentiation
High-end car head unit meets guitar amp chassis. Electric cyan glowing primary (oklch(0.7 0.2 240)), purple accents (oklch(0.65 0.2 290)) on deep shiny electric blue metallic base (oklch(0.13 0.07 262)). Zero harsh black borders. SMD meter-style diagnostics with monospace cyan text. Glow effects (20–32px blur, inset highlights) elevate over flat shadows. 4-gauge wired visual flow. Every control accessible via smooth drawer — clean grid front page. Raw power dashboard that outperforms Sonos, Devialet Gold Phantom, QFX 15 sonically.

## Color Palette (OKLCH)
| Token | Dark | Usage |
|-------|------|-------|
| background | 0.13 0.07 262 | Deep shiny electric blue metallic |
| foreground | 0.94 0.02 262 | Light text |
| card | 0.17 0.06 262 | Feature tile panels |
| primary | 0.7 0.2 240 | Interactive — buttons, active states |
| accent | 0.65 0.2 290 | Purple highlights — secondary CTAs |
| cyan | 0.8 0.15 200 | Meter accents, glow effects |
| success | 0.75 0.18 150 | Green — powered/active indicators |
| border | 0.28 0.08 262 | 1px dividers |

## Typography
| Font | Usage |
|------|-------|
| GeneralSans 600–900 | Headers, feature titles |
| DM Sans 400–600 | Body, labels, control text |
| JetBrains Mono 400–600 | Meter readouts, diagnostics |

## Elevation & Depth
Each tile is standalone — no stacking. Glow effects (blue/cyan/purple, 20–32px blur, 0.3–0.7 opacity, inset highlights) replace shadows. Metallic overlay creates premium shimmer. 1px oklch(0.28 0.08 262) borders define card edges. Active states trigger glow pulse.

## Structural Zones
| Zone | Treatment |
|------|----------|
| Header | Title, current song, settings icon (top-right) |
| Main Grid | CarPlay 2–3 columns: Master Commander, Engine, EQ, Bass, Protection, Epicenter, Cheater Beater, E-Quake, etc. |
| Drawer | All sliders, toggles, advanced settings — slide in/out smooth |
| Footer | Playback info, waveform visualizer, status lights |

## Spacing & Rhythm
4px base unit; 8, 12, 16, 24, 32px increments. Tile padding 12px, gap 1rem. Touch targets 48px+. Borders 1px. Glow blur 20–28px. Responsive: sm:640px, md:768px, lg:1024px.

## Component Patterns
- **Tile Card**: oklch(0.17 0.06 262) bg, 1px oklch(0.28 0.08 262) border, 12px padding, glow on hover/active
- **Meter**: JetBrains Mono, oklch(0.8 0.15 200) with text-glow effect
- **Slider**: blue-slider class — gradient track (primary→accent), cyan thumb, glow on hover
- **Status Dot**: oklch(0.75 0.18 150) green, oklch(0.8 0.18 75) amber, oklch(0.6 0.21 27) red
- **Active Indicator**: Cyan dot pulse animation

## Motion & Animation
- Entrance: fade-in 0.4s on load, slide-in-left 0.3s on drawer
- Interaction: all 0.2–0.3s cubic-bezier(0.4, 0, 0.2, 1)
- Hover: glow intensifies, color saturates
- Active tile: pulse-glow 1.8s infinite
- Visualizer: bars sync to audio, blue-to-purple gradient

## Constraints & Requirements
- Dark mode only
- Mobile-first responsive
- AA+ contrast (L diff ≥0.7)
- Glow opacity never >0.7
- Zero decorative clutter
- 4-gauge wires only where signal flows
- Every tile labeled + icon
- Auto-save on every control touch

## Signature Detail
Clean CarPlay grid on shiny metallic blue background. Cyan glow effects on every interaction. Master Commander and channel indicators guide the visual hierarchy. All controls tuck into smooth drawer — front page stays clean grid. Engineering-focused dashboard for premium audio experience.
