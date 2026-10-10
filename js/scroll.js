import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/**
 * EMBER Scroll Choreography Engine (Stage 2A)
 * Orchestrates GSAP ScrollTrigger timelines for:
 * - Hero -> State 1 (Pinned cup scaling, -7.5° tilt, EM / ER letters spread apart)
 * - Dive (State 2: Camera dolly into crema, scroll-velocity ripples, masked line reveal)
 * - Exploded View (Cup mesh separation along Y, SVG leader lines to 3 labels)
 * - Bean Rain (State 3: 400 beans spiral into ring vortex, velocity text skew)
 */

export class EmberScroll {
  constructor(stageAPI) {
    this.stage = stageAPI;
    this.mm = gsap.matchMedia();
    this.init();
  }

  init() {
    gsap.registerPlugin(ScrollTrigger);

    const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (isReduced) {
      // Static reveal fallback
      gsap.set('.ember-char', { x: 0, opacity: 1 });
      gsap.set('.line-text', { yPercent: 0 });
      gsap.set('.exploded-label', { opacity: 1, y: 0 });
      gsap.set('.exploded-leader-line', { strokeDashoffset: 0 });
      gsap.set('.bean-rain-subline', { opacity: 1, y: 0 });
      gsap.set('.image-reveal-frame', { clipPath: 'inset(0 0 0% 0)' });
      gsap.set('.process-step', { opacity: 1 });
      return;
    }

    this.mm.add('(min-width: 769px)', () => {
      this.setupDesktopTimelines();
    });

    this.mm.add('(max-width: 768px)', () => {
      this.setupMobileTimelines();
    });
  }

  setupDesktopTimelines() {
    // ----------------------------------------------------
    // 1. Hero -> State 1 (Pinned Scrub)
    // ----------------------------------------------------
    const heroTl = gsap.timeline({
      scrollTrigger: {
        trigger: '#hero',
        start: 'top top',
        end: '+=90%',
        pin: true,
        scrub: 0.8,
        anticipatePin: 1,
        onEnter: () => window.emberStage?.setHeroScrub?.(0),
        onEnterBack: () => window.emberStage?.setHeroScrub?.(1),
        onUpdate: (self) => {
          if (!self.isActive) return;
          window.emberStage?.setHeroScrub?.(self.progress);
        }
      }
    });

    // Tagline and scroll hint fade out immediately
    heroTl.to('.hero-bottom-bar', {
      opacity: 0,
      y: -25,
      ease: 'power3.inOut',
      duration: 0.3
    }, 0);

    // EMBER letters spread apart: E & M to left, E & R to right (keeping >= 55% opacity and R inside with >= 48px margin)
    heroTl.to('#char-e1', { xPercent: -55, opacity: 0.62, ease: 'power3.inOut', duration: 1.0 }, 0)
          .to('#char-m',  { xPercent: -28, opacity: 0.58, ease: 'power3.inOut', duration: 1.0 }, 0)
          .to('#char-b',  { opacity: 0.55, scale: 0.90, ease: 'power3.inOut', duration: 0.8 }, 0)
          .to('#char-e2', { xPercent: 28,  opacity: 0.58, ease: 'power3.inOut', duration: 1.0 }, 0)
          .to('#char-r',  { xPercent: 50,  opacity: 0.62, ease: 'power3.inOut', duration: 1.0 }, 0);

    // ----------------------------------------------------
    // 2. Dive (State 2: Camera dollies into crema, ripple reacts to velocity)
    // ----------------------------------------------------
    const diveTl = gsap.timeline({
      scrollTrigger: {
        trigger: '#dive',
        start: 'top top',
        end: '+=90%',
        pin: true,
        scrub: 0.8,
        anticipatePin: 1,
        onEnter: () => window.emberStage?.setDiveScrub?.(0, 0),
        onEnterBack: () => window.emberStage?.setDiveScrub?.(1, 0),
        onUpdate: (self) => {
          if (!self.isActive) return;
          const velocity = self.getVelocity() / 400;
          window.emberStage?.setDiveScrub?.(self.progress, velocity);
        },
        onLeave: () => gsap.set(['.dive-fade-overlay', '.dive-headline'], { opacity: 0 }),
        onLeaveBack: () => gsap.set(['.dive-fade-overlay', '.dive-headline'], { opacity: 0 })
      }
    });

    // Phase 2: 0 to 35% of dive: each EMBER letter flies outward past camera on its own track
    // (scale up to ~3.5x, fading as it passes the lens)
    diveTl.to('#char-e1', { xPercent: -180, yPercent: -45, scale: 3.5, opacity: 0, ease: 'power2.in', duration: 0.35 }, 0)
          .to('#char-m',  { xPercent: -90,  yPercent: -65, scale: 3.2, opacity: 0, ease: 'power2.in', duration: 0.35 }, 0)
          .to('#char-b',  { xPercent: 0,    yPercent: -85, scale: 3.8, opacity: 0, ease: 'power2.in', duration: 0.35 }, 0)
          .to('#char-e2', { xPercent: 90,   yPercent: -65, scale: 3.2, opacity: 0, ease: 'power2.in', duration: 0.35 }, 0)
          .to('#char-r',  { xPercent: 180,  yPercent: -45, scale: 3.5, opacity: 0, ease: 'power2.in', duration: 0.35 }, 0)
          .to('.hero-wordmark-container', { opacity: 0, duration: 0.05 }, 0.35);

    // Warm atmospheric caramel/espresso vignette overlay, never pure black
    diveTl.to('.dive-fade-overlay', {
      opacity: 0.50,
      ease: 'power2.inOut',
      duration: 0.25
    }, 0.30)
    .to('.dive-fade-overlay', {
      opacity: 0,
      ease: 'power2.inOut',
      duration: 0.15
    }, 0.65);

    // Masked line-by-line reveal for "Look closer. The crema is a map."
    // Enters cleanly at 0.30-0.42 and holds for at least 35vh of scroll with a slow parallax drift
    diveTl.fromTo('.line-text-1', {
      yPercent: 110
    }, {
      yPercent: 0,
      ease: 'power3.out',
      duration: 0.10
    }, 0.30)
    .fromTo('.line-text-2', {
      yPercent: 110
    }, {
      yPercent: 0,
      ease: 'power3.out',
      duration: 0.10
    }, 0.36)
    .to('.dive-headline', {
      y: -30,
      ease: 'none',
      duration: 0.45
    }, 0.36)
    .to('.dive-headline', {
      opacity: 0,
      y: -50,
      ease: 'power2.in',
      duration: 0.12
    }, 0.84);

    // ----------------------------------------------------
    // 3. Exploded View (Cup separates along Y, dynamic 3D projected SVG leader lines & layer tags)
    // ----------------------------------------------------
    const explodedTl = gsap.timeline({
      scrollTrigger: {
        trigger: '#exploded',
        start: 'top top',
        end: '+=150%',
        pin: true,
        scrub: 0.8,
        anticipatePin: 1,
        onEnter: () => {
          gsap.set(['.dive-fade-overlay', '.dive-headline'], { opacity: 0 });
          window.emberStage?.setExplodedScrub?.(0);
        },
        onEnterBack: () => window.emberStage?.setExplodedScrub?.(1),
        onUpdate: (self) => {
          if (!self.isActive) return;
          const p = self.progress;
          // Phase 2: 0 to 25% separation (power3.out internally handled in setExplodedScrub)
          const separationProgress = Math.min(p / 0.25, 1.0);
          window.emberStage?.setExplodedScrub?.(separationProgress);

          // Real-time dynamic projection from 3D layer meshes to screen pixel coordinates
          const coords = window.emberStage?.getExplodedLayerScreenCoords?.();
          if (coords) {
            // 1. ORIGIN leader line (Left -> Crema disc left edge): draws across 25% to 45%
            const originEl = document.getElementById('label-origin');
            if (originEl) {
              const r = originEl.getBoundingClientRect();
              const x1 = r.right + 12;
              const y1 = r.top + r.height / 2;
              const x2 = coords.cremaLeft.x;
              const y2 = coords.cremaLeft.y;
              const line = document.getElementById('line-origin');
              const dot = document.getElementById('dot-origin');
              if (line) {
                line.setAttribute('d', `M ${x1} ${y1} L ${x2} ${y2}`);
                const len = Math.hypot(x2 - x1, y2 - y1);
                line.style.strokeDasharray = `${len}`;
                if (p < 0.25) {
                  line.style.strokeDashoffset = `${len}`;
                } else if (p >= 0.45) {
                  line.style.strokeDashoffset = '0';
                } else {
                  const frac = (p - 0.25) / 0.20;
                  line.style.strokeDashoffset = `${len * (1 - frac)}`;
                }
              }
              if (dot) {
                dot.setAttribute('cx', x2);
                dot.setAttribute('cy', y2);
              }
            }

            // 2. ROAST leader line (Right -> Coffee disc right edge): draws across 45% to 65%
            const roastEl = document.getElementById('label-roast');
            if (roastEl) {
              const r = roastEl.getBoundingClientRect();
              const x1 = r.left - 12;
              const y1 = r.top + r.height / 2;
              const x2 = coords.coffeeRight.x;
              const y2 = coords.coffeeRight.y;
              const line = document.getElementById('line-roast');
              const dot = document.getElementById('dot-roast');
              if (line) {
                line.setAttribute('d', `M ${x1} ${y1} L ${x2} ${y2}`);
                const len = Math.hypot(x2 - x1, y2 - y1);
                line.style.strokeDasharray = `${len}`;
                if (p < 0.45) {
                  line.style.strokeDashoffset = `${len}`;
                } else if (p >= 0.65) {
                  line.style.strokeDashoffset = '0';
                } else {
                  const frac = (p - 0.45) / 0.20;
                  line.style.strokeDashoffset = `${len * (1 - frac)}`;
                }
              }
              if (dot) {
                dot.setAttribute('cx', x2);
                dot.setAttribute('cy', y2);
              }
            }

            // 3. NOTES leader line (Left -> Cup body left edge): draws across 65% to 85%
            const notesEl = document.getElementById('label-notes');
            if (notesEl) {
              const r = notesEl.getBoundingClientRect();
              const x1 = r.right + 12;
              const y1 = r.top + r.height / 2;
              const x2 = coords.cupLeft.x;
              const y2 = coords.cupLeft.y;
              const line = document.getElementById('line-notes');
              const dot = document.getElementById('dot-notes');
              if (line) {
                line.setAttribute('d', `M ${x1} ${y1} L ${x2} ${y2}`);
                const len = Math.hypot(x2 - x1, y2 - y1);
                line.style.strokeDasharray = `${len}`;
                if (p < 0.65) {
                  line.style.strokeDashoffset = `${len}`;
                } else if (p >= 0.85) {
                  line.style.strokeDashoffset = '0';
                } else {
                  const frac = (p - 0.65) / 0.20;
                  line.style.strokeDashoffset = `${len * (1 - frac)}`;
                }
              }
              if (dot) {
                dot.setAttribute('cx', x2);
                dot.setAttribute('cy', y2);
              }
            }

            // Update 5 Layer Name Tags: 20px tick line + 4px dot on layer edge
            const setLayerTag = (id, x, y, dir) => {
              const tick = document.getElementById(`tick-${id}`);
              const dot = document.getElementById(`dot-${id}`);
              const text = document.getElementById(`tag-${id}`);
              if (tick && dot && text) {
                dot.setAttribute('cx', x);
                dot.setAttribute('cy', y);
                tick.setAttribute('x1', x);
                tick.setAttribute('y1', y);
                tick.setAttribute('x2', x + dir * 20);
                tick.setAttribute('y2', y);
                text.setAttribute('x', x + dir * 28);
                text.setAttribute('y', y);
                text.setAttribute('text-anchor', dir > 0 ? 'start' : 'end');
              }
            };

            // Spoon: right side
            setLayerTag('spoon', coords.spoonRight.x, coords.spoonRight.y, 1);
            // Crema: right side (opposite 01 ORIGIN on left)
            setLayerTag('crema', coords.cremaRight.x, coords.cremaRight.y, 1);
            // Coffee: left side (opposite 02 ROAST on right)
            setLayerTag('coffee', coords.coffeeLeft.x, coords.coffeeLeft.y, -1);
            // Cup: right side (opposite 03 NOTES on left)
            setLayerTag('cup', coords.cupRight.x, coords.cupRight.y, 1);
            // Saucer: right side
            setLayerTag('saucer', coords.saucerRight.x, coords.saucerRight.y, 1);
          }
        }
      }
    });

    // Layer name tags fade in during separation (0 to 0.25)
    explodedTl.to('.tag-tick, .tag-dot, .exploded-tag-text', {
      opacity: 1,
      ease: 'power2.out',
      duration: 0.15
    }, 0.10);

    // Draw story leader lines and reveal labels in turn across 25% to 85% hold:
    // Label 1: ORIGIN (0.25 to 0.45)
    explodedTl.to('#label-origin, .line-origin, .dot-origin', {
      opacity: 1,
      y: 0,
      ease: 'power2.out',
      duration: 0.12
    }, 0.25)
    // Label 2: ROAST (0.45 to 0.65)
    .to('#label-roast, .line-roast, .dot-roast', {
      opacity: 1,
      y: 0,
      ease: 'power2.out',
      duration: 0.12
    }, 0.45)
    // Label 3: NOTES (0.65 to 0.85)
    .to('#label-notes, .line-notes, .dot-notes', {
      opacity: 1,
      y: 0,
      ease: 'power2.out',
      duration: 0.12
    }, 0.65)
    // 85% to 100% hold before dissolve; fade out labels at 0.92
    .to(['.exploded-svg-layer', '.exploded-label'], {
      opacity: 0,
      ease: 'power3.inOut',
      duration: 0.08
    }, 0.92);

    // ----------------------------------------------------
    // 4. Bean Rain (State 3: 400 beans spiral into clean ring, solid headlines, rest-zero skew)
    // ----------------------------------------------------
    gsap.set('.bean-rain-headline-wrap', { skewY: 0, rotation: 0 });
    gsap.set('.line-left', { xPercent: -70, opacity: 0 });
    gsap.set('.line-right', { xPercent: 70, opacity: 0 });
    gsap.set('.bean-rain-subline', { opacity: 0, y: 24 });

    let skewDebounce;
    const beanRainTl = gsap.timeline({
      scrollTrigger: {
        trigger: '#bean-rain',
        start: 'top top',
        end: '+=180%',
        pin: true,
        scrub: 0.8,
        anticipatePin: 1,
        onEnter: () => window.emberStage?.setBeanRainScrub?.(0),
        onEnterBack: () => window.emberStage?.setBeanRainScrub?.(1),
        onUpdate: (self) => {
          if (!self.isActive) return;
          // Velocity-based dynamic text skewing capped at ±4°
          const v = self.getVelocity() / 350;
          const clampedSkew = gsap.utils.clamp(-4, 4, v);
          gsap.to('.bean-rain-headline-wrap', {
            skewY: clampedSkew,
            duration: 0.15,
            ease: 'power1.out',
            overwrite: 'auto'
          });

          // Ease back to 0 when scrolling stops (at rest headline is perfectly horizontal)
          clearTimeout(skewDebounce);
          skewDebounce = setTimeout(() => {
            gsap.to('.bean-rain-headline-wrap', {
              skewY: 0,
              duration: 0.35,
              ease: 'power2.out',
              overwrite: 'auto'
            });
          }, 60);

          // Update bean vortex scrub
          window.emberStage?.setBeanRainScrub?.(self.progress);
        },
        onScrubComplete: () => {
          gsap.to('.bean-rain-headline-wrap', {
            skewY: 0,
            duration: 0.25,
            ease: 'power2.out',
            overwrite: 'auto'
          });
        }
      }
    });

    // Headline enters as beans start gathering into the ring (0.38 to 0.54)
    beanRainTl.to('.line-left', {
      xPercent: 0,
      opacity: 1,
      ease: 'power2.out',
      duration: 0.16
    }, 0.38)
    .to('.line-right', {
      xPercent: 0,
      opacity: 1,
      ease: 'power2.out',
      duration: 0.16
    }, 0.42)
    .to('.bean-rain-subline', {
      opacity: 1,
      y: 0,
      ease: 'power2.out',
      duration: 0.14
    }, 0.48)
    // Headline exits upward with stagger as ring contracts and pours into menu vessel (0.78 to 0.89)
    .to('.line-left', {
      yPercent: -100,
      opacity: 0,
      ease: 'power2.in',
      duration: 0.08
    }, 0.78)
    .to('.line-right', {
      yPercent: -100,
      opacity: 0,
      ease: 'power2.in',
      duration: 0.08
    }, 0.81)
    .to('.bean-rain-subline', {
      yPercent: -100,
      opacity: 0,
      ease: 'power2.in',
      duration: 0.06
    }, 0.80);
    // ----------------------------------------------------
    // ----------------------------------------------------
    // 5. Menu ("The Tasting Turntable")
    // Pinned, 320vh (about 64vh per drink)
    // ----------------------------------------------------
    const menuSection = document.getElementById('menu');
    const numEl = document.getElementById('active-drink-num');
    const servingEl = document.getElementById('active-drink-serving');
    const nameEl = document.getElementById('active-drink-name');
    const descEl = document.getElementById('active-drink-desc');
    const priceEl = document.getElementById('active-drink-price');
    const hintEl = document.getElementById('menu-scroll-hint');
    const railTicks = gsap.utils.toArray('.rail-tick');

    const drinksData = [
      {
        num: '01',
        name: 'Ember Espresso',
        desc: 'Dark cocoa, orange peel, a long finish.',
        price: 120,
        serving: 'HOT',
        liquid: '#2A1208'
      },
      {
        num: '02',
        name: 'Cortado Noir',
        desc: 'Espresso and steamed milk in equal parts. Silk and smoke.',
        price: 160,
        serving: 'HOT',
        liquid: '#8A5A35'
      },
      {
        num: '03',
        name: 'Burnt Caramel Latte',
        desc: 'Torched sugar, whole milk, a pinch of sea salt.',
        price: 190,
        serving: 'HOT',
        liquid: '#C68A52'
      },
      {
        num: '04',
        name: 'Cold Drip 18H',
        desc: 'Steeped for eighteen hours. Clean, bright, dangerously smooth.',
        price: 210,
        serving: 'ICED',
        liquid: '#1B0F0A'
      },
      {
        num: '05',
        name: 'Ember Tonic',
        desc: 'Espresso over tonic and citrus. Sparkling, bitter, alive.',
        price: 200,
        serving: 'ICED',
        liquid: '#D9822B'
      }
    ];

    let currentDrinkIndex = 0;
    const priceCounter = { val: 120 };

    const updateMenuDrinkDOM = (index) => {
      if (index < 0 || index >= drinksData.length) return;
      const data = drinksData[index];
      currentDrinkIndex = index;

      if (numEl) numEl.textContent = data.num;
      if (servingEl) {
        servingEl.textContent = data.serving;
        if (data.serving === 'ICED') {
          servingEl.style.borderColor = 'rgba(120, 180, 255, 0.6)';
          servingEl.style.color = '#B0D5FF';
          servingEl.style.background = 'rgba(80, 140, 220, 0.18)';
        } else {
          servingEl.style.borderColor = 'rgba(224, 84, 31, 0.6)';
          servingEl.style.color = 'var(--color-ember)';
          servingEl.style.background = 'rgba(224, 84, 31, 0.18)';
        }
      }
      if (nameEl) nameEl.textContent = data.name;
      if (descEl) descEl.textContent = data.desc;

      // Odometer roll for price
      if (priceEl) {
        gsap.to(priceCounter, {
          val: data.price,
          duration: 0.45,
          ease: 'power2.out',
          roundProps: 'val',
          onUpdate: () => {
            priceEl.textContent = priceCounter.val;
          }
        });
      }

      // Update Rail Ticks
      railTicks.forEach((tick, idx) => {
        tick.classList.toggle('is-active', idx === index);
      });
    };

    if (menuSection) {
      const menuTrigger = ScrollTrigger.create({
        trigger: '#menu',
        start: 'top top',
        end: '+=320%',
        pin: true,
        scrub: 0.8,
        anticipatePin: 1,
        onEnter: () => {
          window.emberStage?.setMenuScrub?.(0);
          updateMenuDrinkDOM(0);
        },
        onEnterBack: () => {
          window.emberStage?.setMenuScrub?.(1);
          updateMenuDrinkDOM(4);
        },
        onUpdate: (self) => {
          if (!self.isActive) return;
          const p = self.progress;
          window.emberStage?.setMenuScrub?.(p);

          // Pacing across 5 drinks (0 to 0.95): ~0.19 per drink
          const drinkIdx = Math.min(4, Math.floor(p / 0.19));
          if (drinkIdx !== currentDrinkIndex && p < 0.95) {
            updateMenuDrinkDOM(drinkIdx);
            window.emberStage?.setDrinkActive?.(drinkIdx);
          }

          // Scroll hint fade out
          if (hintEl) {
            hintEl.style.opacity = p > 0.06 ? '0' : '1';
            hintEl.style.pointerEvents = p > 0.06 ? 'none' : 'auto';
          }
        }
      });

      // Rail tick click handlers
      railTicks.forEach((tick, idx) => {
        tick.addEventListener('click', () => {
          if (menuTrigger) {
            const start = menuTrigger.start;
            const totalDistance = menuTrigger.end - menuTrigger.start;
            const targetP = (idx + 0.4) / 5 * 0.95;
            const targetScroll = start + targetP * totalDistance;
            if (this.lenis) {
              this.lenis.scrollTo(targetScroll, { duration: 1.2 });
            } else {
              window.scrollTo({ top: targetScroll, behavior: 'smooth' });
            }
          }
        });
      });

      // Keyboard arrow key controls when menu is in view
      window.addEventListener('keydown', (e) => {
        if (!menuTrigger || !menuTrigger.isActive) return;
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
          e.preventDefault();
          const nextIdx = Math.min(4, currentDrinkIndex + 1);
          railTicks[nextIdx]?.click();
        } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
          e.preventDefault();
          const prevIdx = Math.max(0, currentDrinkIndex - 1);
          railTicks[prevIdx]?.click();
        }
      });
    }

    // ----------------------------------------------------
    // 6. Process ("From seed to second sip")
    // Pinned, 4 steps. Left 55%: GREEN, ROAST, GRIND, BREW in large Bodoni Moda
    // Active step is ember orange, others 30% opacity.
    // Right 45%: Large 3D bean rotates, lerps color -> pulse -> 300 granules -> stream to drop.
    // ----------------------------------------------------
    const processSteps = [
      document.getElementById('step-green'),
      document.getElementById('step-roast'),
      document.getElementById('step-grind'),
      document.getElementById('step-brew')
    ];
    const processCremaReveal = document.getElementById('process-crema-reveal');

    const animateProcessEntry = () => {
      processSteps.forEach((step, idx) => {
        if (!step) return;
        step.classList.toggle('is-active', idx === 0);
        gsap.fromTo(step, 
          { x: -32, opacity: 0 }, 
          { x: 0, opacity: idx === 0 ? 1.0 : 0.30, duration: 0.5, delay: idx * 0.07, ease: 'power2.out', overwrite: 'auto' }
        );
      });
    };

    ScrollTrigger.create({
      trigger: '#process',
      start: 'top top',
      end: '+=220%',
      pin: true,
      scrub: 0.8,
      anticipatePin: 1,
      onEnter: () => {
        window.emberStage?.setProcessScrub?.(0);
        animateProcessEntry();
        if (processCremaReveal) processCremaReveal.style.clipPath = 'circle(0% at 50% 90%)';
      },
      onEnterBack: () => {
        window.emberStage?.setProcessScrub?.(1);
        processSteps.forEach((step, idx) => {
          if (step) step.classList.toggle('is-active', idx === 3);
        });
        if (processCremaReveal) processCremaReveal.style.clipPath = 'circle(160% at 50% 90%)';
      },
      onUpdate: (self) => {
        if (!self.isActive) return;
        const p = self.progress;
        window.emberStage?.setProcessScrub?.(p);

        // Step index based on progress: 0 to 3
        const stepIdx = Math.min(Math.floor(p * 4), 3);
        processSteps.forEach((step, idx) => {
          if (step) {
            step.classList.toggle('is-active', idx === stepIdx);
          }
        });

        // Exit: expanding circular clip-path from landing point (50% 90%)
        if (processCremaReveal) {
          if (p >= 0.88) {
            const tReveal = (p - 0.88) / 0.12;
            const radius = (tReveal * tReveal) * 160;
            processCremaReveal.style.clipPath = `circle(${radius}% at 50% 90%)`;
          } else {
            processCremaReveal.style.clipPath = 'circle(0% at 50% 90%)';
          }
        }
      }
    });

    // ----------------------------------------------------
    // 7. Atmosphere
    // Infinite marquee + Gallery with clip-path reveal and 8% parallax
    // ----------------------------------------------------
    ScrollTrigger.create({
      trigger: '#atmosphere',
      start: 'top bottom',
      end: 'bottom top',
      onEnter: () => window.emberStage?.setAtmosphereScrub?.(0),
      onEnterBack: () => window.emberStage?.setAtmosphereScrub?.(1),
      onToggle: (self) => { if (self.isActive) window.emberStage?.setAtmosphereScrub?.(0); }
    });

    // Gallery clip-path reveal and 8% parallax
    const galleryItems = gsap.utils.toArray('.gallery-item');
    galleryItems.forEach((item) => {
      const frame = item.querySelector('.image-reveal-frame');
      const img = item.querySelector('.gallery-img');

      if (frame) {
        ScrollTrigger.create({
          trigger: item,
          start: 'top 85%',
          onEnter: () => frame.classList.add('is-revealed')
        });
      }

      if (img) {
        gsap.fromTo(img, { yPercent: -8 }, {
          yPercent: 8,
          ease: 'none',
          scrollTrigger: {
            trigger: item,
            start: 'top bottom',
            end: 'bottom top',
            scrub: 1.0
          }
        });
      }
    });

    // Horizontal strip slow motion
    const stripTrack = document.querySelector('.gallery-strip-track');
    if (stripTrack) {
      gsap.to(stripTrack, {
        x: -160,
        ease: 'none',
        scrollTrigger: {
          trigger: '.gallery-strip-wrap',
          start: 'top bottom',
          end: 'bottom top',
          scrub: 1.0
        }
      });
    }

    // ----------------------------------------------------
    // 8. Finale (130vh budget)
    // Background transitions to crema paper (#ECE1CE)
    // 3D cup shrinks (scrub) and lands inside "Reserve a table" pill
    // ----------------------------------------------------
    ScrollTrigger.create({
      trigger: '#finale',
      start: 'top top',
      end: '+=130%',
      pin: true,
      scrub: 0.8,
      anticipatePin: 1,
      onEnter: () => window.emberStage?.setFinaleScrub?.(0),
      onEnterBack: () => window.emberStage?.setFinaleScrub?.(1),
      onUpdate: (self) => {
        if (!self.isActive) return;
        window.emberStage?.setFinaleScrub?.(self.progress);
      }
    });

    // ----------------------------------------------------
    // 9. Footer (70vh budget, letters rising into place on enter)
    // ----------------------------------------------------
    gsap.from('#footer-wordmark .wordmark-char', {
      y: 70,
      opacity: 0,
      stagger: 0.08,
      duration: 1.0,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: '#footer',
        start: 'top 85%'
      }
    });

    gsap.from('.footer-col', {
      y: 35,
      opacity: 0,
      stagger: 0.1,
      duration: 0.8,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: '#footer',
        start: 'top 85%'
      }
    });
  }

  setupMobileTimelines() {
    // Mobile responsive adjustments with lower offsets
    const heroTl = gsap.timeline({
      scrollTrigger: {
        trigger: '#hero',
        start: 'top top',
        end: '+=100%',
        pin: true,
        scrub: 1.0
      }
    });

    heroTl.to('#char-e1', { xPercent: -90, opacity: 0.4 }, 0)
          .to('#char-m',  { xPercent: -50, opacity: 0.3 }, 0)
          .to('#char-b',  { opacity: 0.15 }, 0)
          .to('#char-e2', { xPercent: 50,  opacity: 0.3 }, 0)
          .to('#char-r',  { xPercent: 90,  opacity: 0.4 }, 0);

    heroTl.to({ p: 0 }, {
      p: 1,
      onUpdate: function() {
        window.emberStage?.setHeroScrub?.(this.targets()[0].p);
      }
    }, 0);

    // Mobile Dive
    gsap.timeline({
      scrollTrigger: {
        trigger: '#dive',
        start: 'top top',
        end: '+=120%',
        pin: true,
        scrub: 1.0,
        onUpdate: (self) => {
          window.emberStage?.setDiveScrub?.(self.progress, self.getVelocity() / 300);
        }
      }
    })
    .fromTo('.line-text-1', { yPercent: 110 }, { yPercent: 0, ease: 'expo.out', duration: 0.35 }, 0.2)
    .fromTo('.line-text-2', { yPercent: 110 }, { yPercent: 0, ease: 'expo.out', duration: 0.35 }, 0.35);

    // Mobile Exploded View
    gsap.timeline({
      scrollTrigger: {
        trigger: '#exploded',
        start: 'top top',
        end: '+=120%',
        pin: true,
        scrub: 1.0
      }
    })
    .to({ p: 0 }, {
      p: 1,
      onUpdate: function() {
        window.emberStage?.setExplodedScrub?.(this.targets()[0].p);
      }
    }, 0)
    .to(['#label-origin', '#label-roast', '#label-notes'], { opacity: 1, y: 0, stagger: 0.2 }, 0.2);

    // Mobile Bean Rain
    gsap.timeline({
      scrollTrigger: {
        trigger: '#bean-rain',
        start: 'top top',
        end: '+=120%',
        pin: true,
        scrub: 1.0
      }
    })
    .to({ p: 0 }, {
      p: 1,
      onUpdate: function() {
        window.emberStage?.setBeanRainScrub?.(this.targets()[0].p);
      }
    }, 0)
    .to('.bean-rain-subline', { opacity: 1, y: 0 }, 0.3);

    // Mobile Menu: Tasting Turntable
    const mobileMenu = document.getElementById('menu');
    if (mobileMenu) {
      ScrollTrigger.create({
        trigger: '#menu',
        start: 'top top',
        end: '+=200%',
        pin: true,
        scrub: 0.8,
        onUpdate: (self) => {
          const p = self.progress;
          window.emberStage?.setMenuScrub?.(p);
          const drinkIdx = Math.min(4, Math.floor(p / 0.19));
          if (p < 0.95) {
            window.emberStage?.setDrinkActive?.(drinkIdx);
          }
        }
      });
    }

    // Mobile Process
    const mobileProcessSteps = [
      document.getElementById('step-green'),
      document.getElementById('step-roast'),
      document.getElementById('step-grind'),
      document.getElementById('step-brew')
    ];
    gsap.timeline({
      scrollTrigger: {
        trigger: '#process',
        start: 'top top',
        end: '+=180%',
        pin: true,
        scrub: 1.0,
        onUpdate: (self) => {
          window.emberStage?.setProcessScrub?.(self.progress);
          const stepIdx = Math.min(Math.floor(self.progress * 4), 3);
          mobileProcessSteps.forEach((step, idx) => {
            if (step) step.classList.toggle('is-active', idx === stepIdx);
          });
        }
      }
    });

    // Mobile Atmosphere & Finale
    ScrollTrigger.create({
      trigger: '#finale',
      start: 'top bottom',
      end: 'bottom bottom',
      scrub: 1.0,
      onUpdate: (self) => {
        window.emberStage?.setFinaleScrub?.(self.progress);
      }
    });
  }
}
