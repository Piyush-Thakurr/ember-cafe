# EMBER — Atelier of Slow Coffee

> *"Roasted slow. Poured loud."*

A luxury editorial 3D web experience for **EMBER**, an artisanal slow-coffee atelier located in Uttai, Bhillai.

EMBER merges haute editorial typography with rare, gallery-grade WebGL/GLSL animations and continuous scroll orchestration.

---

## ☕ Core Architecture & Philosophy: One Vessel Continuity

The defining principle of EMBER is **One Vessel Continuity**: rather than disparate, isolated sections, a single 3D coffee vessel travels continuously through the page, metamorphosing at every section boundary with zero cuts, zero fades to black, and maintaining an uncompromising **60 FPS** standard across desktop and mobile devices.

```
[01 Hero] ──> [02 The Dive] ──> [03 Exploded View] ──> [04 Bean Rain]
                                                              │
                                                              ▼
[08 Finale] <── [07 Atmosphere] <── [06 Process] <── [05 Tasting Atelier]
```

---

## 🎬 Section Breakdown & WebGL Craft

### 01. The Hero (`0vh` → `60vh`)
* **Visuals**: Monumental `Bodoni Moda` wordmark, 400 instanced curl-noise floating coffee beans (150 on mobile) drifting in ambient turbulence.
* **3D Focus**: Procedural ceramic demitasse cup with live volumetric rising steam wisps.
* **Interaction**: Floating pill navigation with blur backdrop and mouse-reactive parallax.

### 02. The Dive (`60vh` → `180vh`)
* **Visuals**: Seamless 3D camera dolly traveling directly into the dark liquid core of the espresso cup.
* **Shader**: Crema shockwave shader expanding outward to reveal the editorial statement: *"Look closer. The crema is a map."* with horizontal layer alignment.

### 03. Exploded View (`180vh` → `340vh`)
* **Visuals**: The espresso cup deconstructs along the Y-axis into floating horizontal layers.
* **Focus-Step System**: Curated 3-step inspection sequence:
  1. `01 ORIGIN` — Crema foam top disc.
  2. `02 ROAST` — Espresso liquid volume.
  3. `03 NOTES` — Volcanic stoneware cup body & saucer.
* **Leader Lines**: Screen-projected SVG elbow leader lines and pulsing coordinate rings tracking the 3D meshes in real time.

### 04. Bean Rain (`340vh` → `510vh`)
* **Visuals**: Ember-edge procedural noise dissolve that disperses the cup into a storm of 400 roasted coffee beans.
* **Vortex**: Beans swirl into a 24vh ring vortex framing the typographic manifesto: *"400 BEANS. ONE CUP."*
* **Seam Handover**: The vortex funnels beans downward into the coordinates of the Menu vessel at `(1.05, -0.22)`.

### 05. The Tasting Atelier — The Signature Four (`510vh` → `830vh`)
A bespoke gallery tasting experience replacing standard carousels with advanced WebGL craft:
* **Multi-Harmonic Caustic Aura**: Fullscreen ambient backdrop driven by a custom GLSL fluid shader with cursor-reactive ripples and dynamic color palette morphing.
* **Floating Editorial Crystal Plinth**: Sculptural beveled glass lens displaying drink photography with real-time liquid ink-displacement, chromatic aberration dispersion (`uRgbSplit`), and a molten-gold border flare.
* **Four Bespoke Artisanal Vessels & Living Fluids**:
  1. **01 Ember Espresso**: Volcanic stoneware demitasse (`#171311`), 24k kintsugi gold rim, Japanese saucer, procedural crema vortex swirl shader, and instanced rising steam.
  2. **02 Cortado Noir**: 8-faceted Gibraltar crystal tumbler with double-sided optical Fresnel shader, heavy crystal sham base, stratified espresso/steamed milk liquid column, latte art rosette top, and 8 orbiting zero-gravity coffee essence prisms.
  3. **03 Burnt Caramel Latte**: Flared ceramic coupe with polished bronze rim, caramel brûlée foam with torched dark swirl ring, and an alchemical halo of 20 orbiting amber sugar crystals.
  4. **04 Ember Tonic**: 24-fluted architectural highball glass with heavy sham base, solid glacial ice spear, translucent sparkling amber tonic, 65 rising effervescent cavitation bubbles, and a candied citrus zest ribbon.
* **Interaction**: Interactive 4-tick rail, keyboard arrow key navigation, letter rotation stagger on name changes, and odometer count-up pricing.
* **Seam Handover**: Smooth exit glide at `820vh`–`830vh` where the vessel shrinks and morphs toward the Process bean position at `(1.48, 0, 0)`.

### 06. Process (`830vh` → `1050vh`)
* **Visuals**: Botanical transformation of the coffee bean across 4 precise stages on deep espresso void:
  1. `01 GREEN` — Raw botanical green bean rotating at `(1.48, 0, 0)`.
  2. `02 ROAST` — Thermal color transition (`#7A9A4A` → `#5A3220`) accompanied by thermal expansion scale pulsing.
  3. `03 GRIND` — Bean shatters into 300 instanced granules that burst and settle.
  4. `04 BREW` — Granules funnel downward while a single suspended coffee droplet elongates and accelerates downward.
* **Exit Reveal**: Droplet impact triggers a circular clip-path reveal expanding from the landing point to unveil the Atmosphere photo gallery.

### 07. Atmosphere Photo Tunnel (`1050vh` → `1270vh`)
* **Visuals**: 3D spatial photo gallery where the camera glides forward through staggered, floating photographic planes (*The bar*, *The roaster*, *Late light*).
* **Parallax**: Layered typography featuring a reverse-scrolling outline marquee.
* **Exit Reveal**: A 25vh circular crema mask expands from center to transition into the final warm crema paper sheet.

### 08. Finale & Table Reservation (`1270vh` → `1430vh`)
* **Visuals**: Editorial transition onto tactile crema paper (`#ECE1CE`).
* **Cup Docking**: The hero ceramic cup descends with physical squash-and-bounce, docking into the starting icon of the *"Reserve a Table"* pill button.
* **Liquid & Ice Physics**:
  * 80-droplet coffee splash crown radiating outward on impact.
  * Organic coffee spill stain (25% opacity) spreading across the paper sheet.
  * Expanding ember shockwave ring.
  * 7 tumbling rounded-box ice cubes with Fresnel refraction shaders and soft contact shadows.

### 09. Atelier Directory Footer
* **Visuals**: Architectural 3-column footer with live status indicators, hours, location details (Uttai, Bhillai), and a monumental solid `EMBER` wordmark with ambient ember underglow and Lenis smooth back-to-top scroll.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Markup & Structure** | Semantic HTML5, accessible ARIA landmarks, zero bundler complexity |
| **Styling** | Vanilla CSS3, CSS custom properties, fluid clamp typography, CSS grid & flexbox |
| **3D Engine** | Three.js `0.168.0` (Procedural geometries, custom GLSL vertex/fragment shaders, ACESFilmic tone mapping, PCFSoft shadow maps, instanced meshes) |
| **Scroll & Motion** | GSAP `3.12.5` + ScrollTrigger (pinned timelines, scrubbed tweens, invalidateOnRefresh) |
| **Smooth Scrolling** | Lenis `1.1.14` synced via GSAP ticker with `lagSmoothing(0)` |
| **Typography** | Google Fonts (`Bodoni Moda`, `EB Garamond`, `Space Mono`) |
| **Performance** | Device-aware particle scaling, instanced rendering, zero layout shifts, 60+ FPS |

---

## 🚦 Built-in Diagnostic Audit Tool

EMBER includes an integrated, zero-dependency audit HUD for verification during development:

```
http://localhost:3000/?audit=1
```

The audit overlays real-time metrics:
* Pinned ranges for all 8 sections and scroll progression.
* Detection of dead scroll gaps (`>15vh`).
* Detection of overlapping pins.
* Real-time FPS monitor and WebGL draw calls.

---

## 🚀 Getting Started

No bundler, build step, or transpilation is required. Run directly with any local HTTP server:

### Option 1: Python 3
```bash
python -m http.server 3000
```

### Option 2: Node.js (npx)
```bash
npx serve -l 3000
```

### Option 3: VS Code Live Server
Right-click `index.html` and select **"Open with Live Server"**.

Visit `http://localhost:3000` in your browser.

---

## 📤 Pushing to Your GitHub Account

### Will all my previous commits show up on GitHub?
**Yes, 100%!** Git preserves the entire commit graph locally in the `.git` directory. When you push to your GitHub repository, **every single commit**—including all development phases, fixes, refinements, and the latest Tasting Atelier overhaul—will be uploaded with its full commit message, timestamp, and diff history.

### Step-by-Step Instructions:

1. **Create a New Repository on GitHub**:
   * Go to [github.com/new](https://github.com/new).
   * Enter a repository name (e.g. `ember-cafe` or `ember-atelier`).
   * Set visibility to **Public** (or **Private**).
   * **Do NOT check** *"Add a README file"*, *"Add .gitignore"*, or *"Choose a license"* (keeping it empty ensures no conflicts with your local commits).
   * Click **Create repository**.

2. **Commit your latest local changes** (in your project terminal):
   ```bash
   git add .
   git commit -m "feat(menu): luxury tasting atelier 3D WebGL overhaul with bespoke vessels, fluid caustics and ink displacement"
   ```

3. **Link your GitHub repository as the remote**:
   ```bash
   # Replace <your-username> and <your-repo-name> with your GitHub details:
   git remote add origin https://github.com/<your-username>/<your-repo-name>.git
   ```

4. **Set the default branch to main or master**:
   ```bash
   git branch -M master
   # or if you prefer the 'main' branch naming convention:
   # git branch -M main
   ```

5. **Push all commits to GitHub**:
   ```bash
   git push -u origin master
   # or if renamed to main:
   # git push -u origin main
   ```

   > **Note on GitHub Login**: If Git prompts for authentication, log in using the GitHub Credential Manager browser popup or enter your GitHub Personal Access Token (PAT).

---

## 🌐 Deploying to Free Hosting

### GitHub Pages (Recommended)
1. In your GitHub repository, navigate to **Settings** → **Pages**.
2. Under **Build and deployment** → **Source**, select **Deploy from a branch**.
3. Select branch: `master` (or `main`), folder: `/ (root)`.
4. Click **Save**.
5. Your site will be live at `https://<your-username>.github.io/<your-repo-name>/`.
*(The repository already includes `.nojekyll` to ensure assets load properly).*

### Vercel
1. Install Vercel CLI: `npm i -g vercel` (or link via [vercel.com](https://vercel.com)).
2. Run `vercel` in the project root directory and accept default prompts.

### Netlify
* Drag and drop the project folder onto [app.netlify.com/drop](https://app.netlify.com/drop), or connect your GitHub repository for automated deployment.

---

## 🎨 Design System & Color Tokens

| Token | Hex Value | Purpose |
| :--- | :--- | :--- |
| `--color-bg` | `#14100D` | Obsidian void / Deep roasted espresso background |
| `--color-ember` | `#E0541F` | Focal ember orange highlight & interactive accents |
| `--color-crema` | `#ECE1CE` | Natural unbleached crema paper sheet |
| `--color-gold` | `#F5C468` | 24k Kintsugi gold lacquer accents & specular rims |
| `--color-text` | `#FFDCBE` | Warm off-white editorial typography |

---

## 📜 License & Credits

* **Concept & Design**: EMBER Atelier, Uttai, Bhillai.
* **Libraries**: Three.js, GSAP, Lenis.
* **License**: MIT
