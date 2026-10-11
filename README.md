# EMBER — Atelier of Slow Coffee

> *"Roasted slow. Poured loud."*

A luxury editorial web experience for EMBER, an artisanal coffee atelier in Uttai, Bhillai.

---

## ☕ Overview & Architecture

EMBER is built with a singular design tenet: **One Vessel Continuity**. A single 3D vessel travels continuously through the entire page, transforming at each section boundary with zero cuts, zero fades through black, and maintaining an uncompromising 60 FPS standard across desktop and mobile.

### Sections & Storyboards
1. **01 Hero**: Cinematic intro with Bodoni Moda wordmark, 400 instanced curl-noise floating coffee beans (150 on mobile), and procedural ceramic espresso cup with rising steam.
2. **02 The Dive**: 3D camera dollies straight into the cup. Crema shockwave shader expands to reveal *"Look closer. The crema is a map."* with horizontal layer alignment.
3. **03 Exploded View**: Cup deconstructs into floating horizontal layers. Focus-step system guides viewer through 3 curated steps: **01 ORIGIN** (crema), **02 ROAST** (coffee), and **03 NOTES** (cup), with pulsing ring markers and SVG elbow leader lines projected from 3D coordinates.
4. **04 Bean Rain**: Ember-edge noise dissolve into swirling beans (400 on desktop, 150 on mobile) forming a 24vh ring vortex behind *"400 BEANS. ONE CUP."* Exit pour streams directly into the menu vessel.
5. **05 Menu ("The Pour Wheel")**: Pinned 320vh cylindrical drum panorama showcasing The Signature Four drinks (*Ember Espresso, Cortado Noir, Burnt Caramel Latte, Ember Tonic*). Features curved WebGL panorama planes with warm colour grading, hero cup vessel with custom liquid tints and accents, Bodoni Moda italic letter stagger animations, odometer price count-up, and an interactive 4-tick rail with keyboard navigation.
6. **06 Process**: Green coffee bean grows and transforms across 4 stages: 01 GREEN, 02 ROAST (heat expansion), 03 GRIND (shattering into granules), and 04 BREW (falling drop expanding a circular crema reveal into Atmosphere). All on consistent deep espresso background.
7. **07 Atmosphere ("Photo Tunnel")**: 3D spiral photo tunnel flying camera forward through staggered planes with captions (*The bar*, *The roaster*, *Late light*), paired with a slow reverse outline marquee and circular crema exit reveal.
8. **08 Finale**: Pinned 160vh on warm crema paper. Masked headline rises by lines, hero cup descends with squash and bounce onto the Reserve pill, impact spawns an 80-droplet coffee splash crown, organic coffee spill (25% espresso stain), expanding ember ripple ring, and 7 tumbling rounded ice cubes with contact shadows and idle bobbing.
9. **Footer**: Designed 3-column atelier directory with monumental solid EMBER wordmark with ember underglow and Lenis smooth back-to-top scroll.

---

## 🛠️ Technology Stack

- **Core**: Vanilla HTML5, CSS3, ES Modules.
- **3D Graphics Engine**: Three.js `0.168.0` (procedural geometries, custom GLSL shaders, ACESFilmic tone mapping, PCFSoft shadows, instanced rendering).
- **Animation & Orchestration**: GSAP `3.12.5` + ScrollTrigger.
- **Smooth Scroll**: Lenis `1.1.14` synced via GSAP ticker with `lagSmoothing(0)`.
- **Typography**: Google Fonts (`Bodoni Moda`, `EB Garamond`, `Space Mono`).
- **Accessibility & Resiliency**: Semantic HTML5 landmarks, skip-to-content link, `:focus-visible` rings, full keyboard navigation (Escape closes modal & mobile nav, Arrow keys navigate menu), `prefers-reduced-motion` static fallback, WebGL failure fallback mode (`.webgl-unavailable`).

---

## 🚀 Running Locally

No bundler or build step is required! Run directly using any static HTTP server:

```bash
# Python 3
python -m http.server 3000

# Node.js
npx serve -l 3000
```

Open `http://localhost:3000` in Chrome, Firefox, Safari, or Edge.
Dev audit tool is accessible at `http://localhost:3000/?audit=1`.

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
