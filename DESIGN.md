# EMBER — Design System & Visual Specification

> **Source of Truth for All Visuals**  
> Extracted from Stitch project `EMBER` (`projects/1091097099185118585`).  
> Copy strictly adheres to `content.md`.

---

## 1. Brand & Aesthetic Principles

- **Atmosphere**: Cinematic editorial, physical tactility, intentional slowness, and visceral warmth. Coffee treated as high craft (haute horlogerie / culinary journal).
- **Core Visual Contrast**: Deep espresso dark voids (`#14100D` / `#210F00`) contrasted with warm unbleached Crema paper sheets (`#ECE1CE` / `#F1E6D3`) and focal Ember sparks (`#D94F1A` / `#E0541F`).
- **Geometric Tension**:
  - **Containers, Media, Frames, Cards**: Strictly zero border radius (`0px` / needle-sharp 90° corners).
  - **Interactive Anchors & Badges**: Full pill shape (`border-radius: 9999px`) only for CTA buttons, status tag capsules, and tasting note pills.
- **Elevation & Lines**: No generic blur cards or drop-shadow gimmicks. Depth is articulated via 1px architectural hairlines (`rgba(255, 220, 190, 0.15)`), tonal section inversions, and warm radial ember gradients.

---

## 2. Color Palette & Tokens

### Core Semantic Colors
| Token | Hex Value | Role & Usage |
| :--- | :--- | :--- |
| `surface` | `#210f00` | Primary dark canvas background |
| `surface-dim` | `#210f00` | Dim surface depth |
| `surface-bright` | `#563000` | Raised / ambient warm highlights |
| `surface-container-lowest` | `#1a0a00` | Deepest abyss / contrast base |
| `surface-container-low` | `#2d1600` | Low container level |
| `surface-container` | `#321a00` | Standard surface containers / cards |
| `surface-container-high` | `#412300` | Raised components / active wells |
| `surface-container-highest`| `#502c00` | Topmost dark elevation |
| `primary-container` | `#14100d` | Espresso Black void (Header, Hero bedrock) |
| `on-surface` | `#ffdcbe` | Primary text on dark surfaces (Warm Crema) |
| `on-surface-variant` | `#d0c4bd` | Secondary editorial body & captions |
| `primary` | `#cec5bf` | Muted silver-ash highlight |
| `on-primary` | `#352f2c` | Dark text on primary |
| `on-primary-container` | `#837b77` | Muted container microcopy |
| `secondary` | `#cfc5b3` | Light oatmeal accent (Monumental split letters) |
| `secondary-fixed` | `#ece1ce` | Inverted Crema Paper sheet background (Finale) |
| `on-secondary-fixed` | `#201b10` | Dark espresso text on Crema paper sheet |
| `tertiary` | `#ffb59d` | Soft glowing peach / warm amber accent |
| `tertiary-container` | `#270600` | Deep burnt ember container |
| `on-tertiary-container` | `#d94f1a` / `#e0541f` | Focal Ember Orange (Primary CTA, glowing indicators) |
| `outline` | `#998f88` | High-contrast structural line |
| `outline-variant` | `#4d4540` | Subtle hairline dividers (`30%` opacity) |

### Signature Liquid Spectrum (Menu Item Liquids)
- **01 Ember Espresso**: `#2A1208`
- **02 Cortado Noir**: `#8A5A35`
- **03 Burnt Caramel Latte**: `#C68A52`
- **04 Cold Drip 18H**: `#1B0F0A`
- **05 Ember Tonic**: `#D9822B`

### Structural Hairline Tokens
- `hairline-light`: `rgba(255, 220, 190, 0.15)` (Grid rules & borders on dark backgrounds)
- `hairline-warm`: `rgba(217, 79, 26, 0.35)` (Focal dividers, active states)
- `hairline-dark`: `rgba(20, 16, 13, 0.15)` (Dividers on inverted Crema paper sections)

---

## 3. Typography & Hierarchy

### Google Fonts Sources
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400..900;1,6..96,400..900&family=EB+Garamond:ital,wght@0,400..800;1,400..800&family=Space+Mono:ital,wght@0,400;0,700;1,400;1,700&display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet">
```

### Type System
| Style Token | Font Family | Size (Desktop / Mobile) | Line Height | Tracking | Weight / Style |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `display-hero` | `Bodoni Moda` | `160px` / `64px` | `144px` / `60px` | `-0.04em` | 400 Roman |
| `display-monumental` | `Bodoni Moda` | `280px–360px` / `140px` | `1.0` | `-0.08em` | 300 Light (`EM` / `ER`) |
| `display-lg` | `Bodoni Moda` | `96px` / `44px` | `96px` / `44px` | `-0.03em` | 400 Roman / Italic |
| `headline-xl` | `Bodoni Moda` | `56px` / `32px` | `60px` / `36px` | `-0.02em` | 400 Roman / Italic |
| `headline-md` | `Bodoni Moda` | `36px` / `28px` | `42px` / `34px` | `-0.01em` | 400 Roman / Italic |
| `body-lg` | `EB Garamond` | `20px` / `18px` | `32px` / `28px` | `0em` | 400 Regular / Italic |
| `body-md` | `EB Garamond` | `17px` / `16px` | `26px` / `24px` | `0em` | 400 Regular |
| `section-index` | `Space Mono` | `12px` | `14px` | `0.25em` | 700 Bold, Uppercase |
| `label-code-lg` | `Space Mono` | `13px` | `18px` | `0.15em` | 400 / 700 Uppercase |
| `label-code-sm` | `Space Mono` | `11px` / `10px` | `14px` | `0.2em` | 400 Uppercase |

> **Headline Line-Wrap Rule**: If a headline would overflow the container on any viewport, split it cleanly over two balanced lines instead of truncating or clipping.

---

## 4. Spacing, Grid & Layout

- **Desktop Grid**: 12 columns, max container width `1440px`.
  - Outer Margins: `4rem` (`64px`).
  - Gutter: `1.5rem` (`24px`).
- **Mobile Grid**: 4 columns.
  - Outer Margins: `1.25rem` (`20px`).
  - Gutter: `1rem` (`16px`).
- **Spacing Scale**:
  - `space-xs`: `0.25rem` (`4px`)
  - `space-sm`: `0.5rem` (`8px`)
  - `space-md`: `1rem` (`16px`)
  - `space-lg`: `2rem` (`32px`)
  - `space-xl`: `4rem` (`64px`)
  - `space-2xl`: `6rem` (`96px`)

---

## 5. Component Styles

### A. Navigation Header
- **Layout**: Fixed `h-20` (`80px`), `top-0 left-0 right-0`, `z-50`.
- **Background**: `bg-primary-container/90` with `backdrop-blur-md` and `border-b border-outline-variant/30`.
- **Elements**:
  - Brand Mark: `EMBER` wordmark + `font-label-code-sm` uppercase text `EMBER — Atelier of slow coffee`.
  - Nav Links: `Space Mono` `13px` uppercase tracked links (`Menu`, `Process`, `Visit`, `Reserve`).
  - Reserve CTA: Pill button in `bg-on-tertiary-container` (`#D94F1A`) with hover transition to `Crema` (`#ECE1CE`) and dark text.

### B. Interactive Buttons & Badges
- **Primary Action (Reserve Button)**:
  - Shape: `border-radius: 9999px` (full pill).
  - Fill: `bg-on-tertiary-container` (`#D94F1A`).
  - Color: `text-on-tertiary` (`#5D1800` or `#FFDCBE`).
  - Hover: Scale `1.03`, background shift to `#ECE1CE`, text `#14100D`.
- **Secondary Action**:
  - Pill outline with `1px solid rgba(255, 220, 190, 0.2)`.
  - Hover: Border glows `#D94F1A`, subtle tint `rgba(217, 79, 26, 0.1)`.
- **Section Badges (`[ 01 // SECTION ]`)**:
  - `Space Mono` `11px` or `12px` bold uppercase tracked `0.25em`.
  - Accent pulsing ember dot (`w-1.5 h-1.5 rounded-full bg-on-tertiary-container animate-pulse`).

### C. Menu Cards & Process Modules
- **Shapes**: Sharp rectangle (`0px` radius).
- **Framing**: Hairline top and bottom borders (`1px solid rgba(255, 220, 190, 0.15)`).
- **Price & Code Tags**: `Space Mono` tracking with currency symbol `₹`.
- **Liquid Indicator Swatches**: Small round or rectangular liquid swatches corresponding to exact hex liquid values.

### D. Finale Inverted Paper Sheet
- **Background**: Full-bleed `bg-secondary-fixed` (`#ECE1CE`).
- **Typography**: Dark espresso text (`#14100D` / `#210F00`).
- **Feature CTA**: Large interactive pill (`bg-on-tertiary-container`, coffee cup thumbnail preview inside ring, arrow circle).

### E. Custom Interactive Cursor
- **Labels**: Three dynamic state labels as required by content:
  - `View` (over imagery / cards)
  - `Drag` (over interactive hero stage / carousel)
  - `Reserve` (over booking actions)
