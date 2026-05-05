# Design Brief — PowerAmp Player Premium Rebuild

## Purpose & Context
Premium dark music player with full audio diagnostics for Gerrod. Kenwood DMX129BT head unit style — large icon tiles in 3-column grid, left-side control strip, clean drawer architecture. Shiny electric blue 1080p metallic aesthetic with darker gold accents. Every feature in own dedicated tile+drawer, nothing stacked. Pure function meets premium UX.

## Tone & Differentiation
High-end car head unit meets guitar amp chassis. Electric blue glowing primary (oklch(0.7 0.2 240)), darker gold highlights (oklch(0.25 0.08 45)) on borders and active elements, purple accents (oklch(0.65 0.2 290)) on deep shiny electric blue metallic base (oklch(0.13 0.07 262)). Zero harsh black borders. SMD meter-style diagnostics with monospace cyan text. Glow effects (20–32px blur, inset highlights) elevate over flat shadows. 4-gauge wired visual flow. Premium metallic finishes on all tiles. Smooth drawers slide from right — clean grid front page. Commander Chip dominates as system authority.

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
| gold-dark | 0.25 0.08 45 | Darker gold — borders, slider tracks |
| gold-medium | 0.35 0.12 45 | Gold accents — highlights |
| gold-light | 0.55 0.15 45 | Gold text — special labels |
| border | 0.28 0.08 262 | 1px dividers |
| chip-bg | 0.19 0.08 262 | Memory Commander Chip background — elevated |
| chip-glow | 0.82 0.16 195 | Enhanced cyan glow on chip border |
| chip-accent | 0.85 0.18 195 | Chip accent highlights |
| chip-border | 0.32 0.1 262 | Chip 2px border, elevated from card |

## Typography
| Font | Usage |
|------|-------|
| GeneralSans 600–900 | Headers, feature titles |
| DM Sans 400–600 | Body, labels, control text |
| JetBrains Mono 400–600 | Meter readouts, diagnostics |

## Elevation & Depth
| Zone | Treatment |
|------|----------|
| Control Strip | Left vertical: 72px wide, channel buttons (Bass, Mids, Highs, Tweeters), 56×56px each, cyan glow on active |
| Top Bar | Volume bar: Frontline Volume slider full-width (1–700), large value readout, load track button |
| Main Grid | 3-column tile layout: Memory Commander Chip (dominant 240–280px), then feature tiles (Bass, EQ, Protection, etc.), 120×140px standard tiles |
| Drawer | Right panel 340px wide: feature name bold at top, sliders underneath, dark gold accents on controls, smooth slide-in-right animation |
| Status Bar | Bottom: playback info, power chain indicators, diagnostic status lights |
| Main Grid | CarPlay 2–3 columns: Master Commander, Engine, EQ, Bass, Protection, Epicenter, Cheater Beater, E-Quake, etc. Standard 120×100px tiles |
| Drawer | All sliders, toggles, advanced settings — slide in/out smooth |
| Footer | Playback info, waveform visualizer, status lights |

## Spacing & Rhythm
- **Tile Card**: oklch(0.17 0.06 262) bg, 1px oklch(0.28 0.08 262) border, 12px padding, metallic gradient, glow on hover/active
- **Memory Commander Chip**: oklch(0.19 0.08 262) bg, 2px oklch(0.32 0.1 262) border, 20px padding, chip-dominant + chip-pulse animation (2s infinite), 240–280px size, contains 50–60 memory slot indicators in grid (8×8 max), each slot 8×8px with oklch(0.7 0.2 240) when active
- **Drawer**: 340px fixed right panel, drawer-panel class, gradient bg, drawer-title bold at top, drawer-label for section headers, drawer-slider for controls
- **Meter**: JetBrains Mono, oklch(0.8 0.15 200) with text-glow effect
- **Slider**: blue-slider class — gradient track (primary→accent), cyan thumb with gold accents on drawer
- **Status Dot**: oklch(0.75 0.18 150) green, oklch(0.8 0.18 75) amber, oklch(0.6 0.21 27) red
- **Active Indicator**: Cyan dot pulse animation, gold border on drawer controls
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
Memory Commander Chip as visual anchor — DOMINANT glowing cyan tile (3,000 slots visible via grid, pulsing 2s loop) radiates system state to all other tiles. Kenwood head unit grid (3 columns) below on shiny metallic blue background with darker gold accents. Cyan glow effects on every interaction intensify around Chip when active. Left control strip channels (Bass, Mids, Highs, Tweeters) stay always-visible for quick switching. Drawer architecture: each feature tile opens its own dedicated 340px right panel with bold feature name + sliders underneath. All drawer controls use darker gold (0.25 0.08 45) for accent borders and active states. Front page stays clean grid, all complexity tucks into drawers. Engineering-focused dashboard that prioritizes system memory as the primary visual story.
- Auto-save on every control touch

## Signature Detail
Memory Commander Chip as visual anchor — DOMINANT glowing cyan tile (50–60 slots visible, pulsing 2s loop) radiates system state to all other tiles. Clean CarPlay grid below on shiny metallic blue background. Cyan glow effects on every interaction intensify around Chip when active. Master Commander and channel indicators guide the visual hierarchy. All controls tuck into smooth drawer — front page stays clean grid. Engineering-focused dashboard that prioritizes system memory and diagnostic state as the primary visual story.
