# EMBER — Atelier of Slow Coffee

> *"Roasted slow. Poured loud."*

A luxury editorial web experience for EMBER, an artisanal coffee atelier in Uttai, Bhillai.

---

## ☕ Overview & Architecture

EMBER is built with a singular design tenet: **One Vessel Continuity**. A single 3D vessel travels continuously through the entire page, transforming at each section boundary with zero cuts, zero fades through black, and maintaining an uncompromising 60 FPS standard across desktop and mobile.

### Sections & Storyboards
1. **01 Hero**: Cinematic intro with Bodoni Moda wordmark, 400 instanced curl-noise floating coffee beans, and procedural ceramic espresso cup with rising steam.
2. **02 The Dive**: 3D camera dollies straight into the cup. Crema shockwave shader expands to reveal *"Look closer. The crema is a map."*
3. **03 Exploded View**: Cup deconstructs into 5 floating layers (Saucer, Cup, Coffee, Crema, Spoon) with real-time 3D projected leader lines and origin notes.
4. **04 Bean Rain**: Noise-threshold dissolve of exploded layers into 400 swirling beans forming an interactive ring vortex around *"400 BEANS. ONE CUP."*
5. **05 Menu ("The Tasting Turntable")**: Pinned 320vh tasting turntable showcasing 5 signature drinks (Ember Espresso, Cortado Noir, Burnt Caramel Latte, Cold Drip 18H, Ember Tonic) with custom 3D vessels, procedural liquids, steam, ice cubes, bubbles, and interactive navigation rail.
6. **06 Process**: Green coffee bean grows and transforms across 4 stages: 01 GREEN, 02 ROAST (heat expansion), 03 GRIND (shattering into 300 granules), and 04 BREW (falling drop expanding a crema clip-path reveal).
7. **07 Atmosphere**: Infinite kinetic editorial marquee and dual-layer curated photo gallery.
8. **08 Finale**: Crema paper sheet where the 3D cup docks and shrinks into the CTA pill, surrounded by tumbling fresnel ice cubes, a coffee splash crown of 60 droplets, expanding ember ripple rings, and mouse parallax.
9. **Footer**: Designed 3-column atelier directory with monumental 92vw solid EMBER wordmark with ember underglow and Lenis smooth back-to-top scroll.

---

## 🛠️ Technology Stack

- **Core**: Vanilla HTML5, CSS3, ES Modules.
- **3D Graphics Engine**: Three.js `0.168.0` (procedural geometries, custom shaders, ACESFilmic tone mapping, PCFSoft shadows).
- **Animation & Orchestration**: GSAP `3.12.5` + ScrollTrigger.
- **Smooth Scroll**: Lenis `1.1.14` synced via GSAP ticker with `lagSmoothing(0)`.
- **Typography**: Google Fonts (`Bodoni Moda`, `EB Garamond`, `Space Mono`).

---

## 🚀 Running Locally

No bundler or build step is required! Run directly using any static HTTP server:

```bash
# Python 3
python -m http.server 3000

# Node.js
npx serve -l 3000
```

Open `http://localhost:3000` in Chrome, Firefox, or Safari.

---

## 🌐 Deploying to GitHub Pages

1. Initialize git remote (if not already set):
```bash
git remote add origin https://github.com/<your-username>/ember-cafe.git
```
2. Push master branch:
```bash
git push -u origin master
```
3. In GitHub Repository Settings -> **Pages**:
   - Source: `Deploy from a branch`
   - Branch: `master` / `(root)`
   - Click **Save**.

The site is configured with `.nojekyll` and relative paths for seamless GitHub Pages hosting.

---

## 📐 Color Tokens

| Token | Hex | Role |
| :--- | :--- | :--- |
| `primary-container` | `#14100D` | Deep Espresso black void |
| `on-surface` | `#FFDCBE` | Warm Crema text |
| `secondary-fixed` | `#ECE1CE` | Unbleached Crema paper sheet |
| `on-tertiary-container` | `#D94F1A` / `#E0541F` | Focal Ember orange |

---

## 📜 Credits & License

- Craft: EMBER Atelier, Uttai, Bhillai.
- Imagery: Unsplash photography (curated in `assets/`).
- Engine: Three.js, GSAP, Lenis.
- License: MIT.
