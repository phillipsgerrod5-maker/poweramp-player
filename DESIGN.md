# Design Brief — PowerAmp Player Shot 1

## Purpose & Context
Premium dark music player foundation with Virtual Amp diagnostic system. Personalized for engineer Gerrod. Shot 1 establishes power chain boot sequence, combined amp interface, and live SMD meter diagnostics with luxury audio equipment aesthetic.

## Tone & Differentiation
Premium high-end audio equipment interface — Pioneer GM-DX104 inspired dark metal amp chassis; SMD meter style live OHMS/WATTS diagnostics; animated boot sequence (Batteries → Fuses → Converter → Booster → Combined Amp → Features → Settings); visible 4-gauge wired connections flowing blue-to-purple; electric cyan primary (#00d5ff) and purple accent (#9945ff) glowing interactive states on deep shiny electric blue 1080p metallic background; pure glow effects (no shadows) create immersive premium feel.

## Color Palette (OKLCH)
| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| background | 0.99 0 0 | 0.10 0.05 262 | Deep shiny electric blue (#0a1a3f) base |
| foreground | 0.15 0 0 | 0.92 0.02 262 | Text on background |
| card | 1.0 0 0 | 0.15 0.06 262 | Amp panels, diagnostic cards |
| primary | 0.35 0 0 | 0.70 0.25 262 | Electric blue (#00d5ff) interactive elements |
| accent | 0.35 0 0 | 0.68 0.28 290 | Purple (#9945ff) secondary highlights |
| success | — | 0.62 0.25 142 | Green for active/powered states |
| destructive | 0.55 0.22 25 | 0.6 0.21 27 | Error/warning states |
| border | 0.9 0 0 | 0.22 0.08 262 | Electric blue 1px dividers |

## Typography
| Font | Weight | Usage |
|------|--------|-------|
| GeneralSans (display) | 600–900 | Headers, amp labels, prominent titles |
| DM Sans (body) | 400–600 | Controls, UI labels, descriptions |
| JetBrains Mono (mono) | 400–600 | Meter readouts, diagnostic data, timers |

## Elevation & Depth
Slot-based panel layout — each control occupies dedicated compartment on shiny blue metallic gradient background. Glow effects (20–28px blur, 0.5–0.7 opacity) provide visual depth and premium feel. Electric cyan and purple accent glows emphasize active states. Subtle 1px borders at 0.22 L electric blue define card edges. No stacking; each amp screen and feature has own space. Metallic overlay creates premium sheen across entire viewport.

## Structural Zones
| Zone | Treatment |
|------|-----------|
| Header | Branding (gerrod/engeeier/product/designer), Settings button top-right, album art display |
| Music Player | Play/pause, skip, shuffle, repeat, seek bar, volume 1-7000 (tap up/down), visualizer bars |
| Power Chain Boot | Animated 7-stage sequence: Batteries → Fuses → Converter → Booster → Combined Amp → Features → Settings (each stage staggered 150ms) |
| Combined Amp | Three engines unified: Virtual Amp (6 design screens), Digital Stimulation (PWM), Analog Tube (harmonics) |
| Bluetooth Analyzer | Speaker profile scanner, persistent save, ohm/watt assignment, live power tracking |
| EQ Clean Booster | Big EQ in separated drawer, 14-300Hz resonated bass slider, real-time frequency output |
| SMD Meter | Live OHMS/WATTS readout, monospace, glow-cyan text, LC-style display |
| Wired Connections | 4-gauge visual paths: Batteries→Fuses→Converter→Booster→Filter→Stabilizer→Amp, flowing gradient lines |

## Spacing & Rhythm
4px base unit; 8px, 12px, 16px, 24px, 32px increments. Amp panels use 12px padding for premium breathing room. Slot borders 1px. Touch targets 48px+ for media controls.

## Component Patterns
- **Amp Slot Panels**: 0.17 L card, 1px cyan border, 12px padding, no shadow (glow on active)
- **Meter Readout**: JetBrains Mono, 0.7 L primary color, text-glow, LC-style display
- **Boot Stage**: Staggered startup-sequence 0.4s (150ms delay between stages)
- **Wired Connection**: 1px left border, 2px cyan on active, connector dots with glow (0.6 opacity cyan)
- **4-Gauge Visual**: Gradient lines (blue→purple), flowing signal representation, connector nodes

## Motion & Animation
- **Boot Sequence**: startup-sequence (0.4s each), staggered across 7 stages (0/150/300/450/600/750/900ms) for smooth system power-on
- **Entrance**: fade-in 0.4s on load; amp drawer slide-in-left 0.3s
- **Interaction**: transition-smooth 0.3s on all interactive elements
- **Glow**: pulse-glow 1.5s infinite on active amp controls, memory commander, stabilizer
- **Visualizer**: Animated bars sync to audio (blue-to-purple gradient), bouncing in rhythm

## Constraints
- Dark mode only
- Mobile-first responsive (sm: 640px, md: 768px, lg: 1024px)
- All text maintains AA+ contrast
- Glow effects use low–medium opacity (never harsh)
- No decorative elements without function
- 4-gauge wired paths only where signal flows

## Signature Detail
Animated boot sequence with 7 staggered power stages creates cinematic power-on experience. Shiny electric blue 1080p metallic gradient background (never black) with premium cyan/purple glowing accents. Visible 4-gauge wired paths flowing blue-to-purple represent signal flow from batteries through power chain to amp. SMD meter style readouts with monospace glow effects elevate premium audio equipment aesthetic. Every component in dedicated amp slot—no crowding, precise 12px padding, crisp 1px borders, immersive high-energy dashboard.
