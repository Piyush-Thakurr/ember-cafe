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
        end: '+=130%',
        pin: true,
        scrub: 1.0,
        anticipatePin: 1
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

    // Wordmark container stays visible throughout State 1, fading only when moving to Dive
    heroTl.to('.hero-wordmark-container', {
      opacity: 0,
      ease: 'power3.inOut',
      duration: 0.25
    }, 0.85);

    // 3D Cup scales 1 -> 1.6 and tilts -7.5 degrees
    heroTl.to({ p: 0 }, {
      p: 1,
      ease: 'power3.inOut',
      duration: 1.0,
      onUpdate: function() {
        window.emberStage?.setHeroScrub?.(this.targets()[0].p);
      }
    }, 0);

    // ----------------------------------------------------
    // 2. Dive (State 2: Camera dollies into crema, ripple reacts to velocity)
    // ----------------------------------------------------
    const diveTl = gsap.timeline({
      scrollTrigger: {
        trigger: '#dive',
        start: 'top top',
        end: '+=150%',
        pin: true,
        scrub: 1.0,
        anticipatePin: 1,
        onUpdate: (self) => {
          const velocity = self.getVelocity() / 400;
          window.emberStage?.setDiveScrub?.(self.progress, velocity);
        },
        onLeave: () => gsap.set('.dive-fade-overlay', { opacity: 0 }),
        onLeaveBack: () => gsap.set('.dive-fade-overlay', { opacity: 0 })
      }
    });

    // Dark atmospheric vignette overlay: fades in for crema immersion, fades out before Exploded view
    diveTl.to('.dive-fade-overlay', {
      opacity: 0.90,
      ease: 'power3.inOut',
      duration: 0.4
    }, 0)
    .to('.dive-fade-overlay', {
      opacity: 0,
      ease: 'power3.inOut',
      duration: 0.25
    }, 0.75);

    // Masked line-by-line reveal for "Look closer. The crema is a map."
    diveTl.fromTo('.line-text-1', {
      yPercent: 110
    }, {
      yPercent: 0,
      ease: 'expo.out',
      duration: 0.35
    }, 0.25)
    .fromTo('.line-text-2', {
      yPercent: 110
    }, {
      yPercent: 0,
      ease: 'expo.out',
      duration: 0.35
    }, 0.35)
    .to('.dive-headline', {
      opacity: 0,
      y: -30,
      ease: 'power3.inOut',
      duration: 0.25
    }, 0.75);

    // ----------------------------------------------------
    // 3. Exploded View (Cup separates along Y, dynamic 3D projected SVG leader lines & layer tags)
    // ----------------------------------------------------
    const explodedTl = gsap.timeline({
      scrollTrigger: {
        trigger: '#exploded',
        start: 'top top',
        end: '+=160%',
        pin: true,
        scrub: 1.0,
        anticipatePin: 1,
        onUpdate: (self) => {
          const p = self.progress;
          // Separation completes at p = 0.45 so layers reach final position before lines draw
          const separationProgress = Math.min(p / 0.45, 1.0);
          window.emberStage?.setExplodedScrub?.(separationProgress);

          // Real-time dynamic projection from 3D layer meshes to screen pixel coordinates
          const coords = window.emberStage?.getExplodedLayerScreenCoords?.();
          if (coords) {
            // 1. ORIGIN leader line (Left -> Crema disc left edge)
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
                if (p < 0.45) {
                  line.style.strokeDashoffset = `${len}`;
                } else if (p >= 0.70) {
                  line.style.strokeDashoffset = '0';
                } else {
                  const frac = (p - 0.45) / 0.25;
                  line.style.strokeDashoffset = `${len * (1 - frac)}`;
                }
              }
              if (dot) {
                dot.setAttribute('cx', x2);
                dot.setAttribute('cy', y2);
              }
            }

            // 2. ROAST leader line (Right -> Coffee disc right edge)
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
                } else if (p >= 0.70) {
                  line.style.strokeDashoffset = '0';
                } else {
                  const frac = (p - 0.45) / 0.25;
                  line.style.strokeDashoffset = `${len * (1 - frac)}`;
                }
              }
              if (dot) {
                dot.setAttribute('cx', x2);
                dot.setAttribute('cy', y2);
              }
            }

            // 3. NOTES leader line (Left -> Cup body left edge)
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
                if (p < 0.45) {
                  line.style.strokeDashoffset = `${len}`;
                } else if (p >= 0.70) {
                  line.style.strokeDashoffset = '0';
                } else {
                  const frac = (p - 0.45) / 0.25;
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

    // Layer name tags fade in during separation
    explodedTl.to('.tag-tick, .tag-dot, .exploded-tag-text', {
      opacity: 1,
      ease: 'power2.out',
      duration: 0.30
    }, 0.15);

    // Draw story leader lines, reveal 6px ember dots, and reveal story labels AFTER layers reach final positions (p >= 0.45)
    explodedTl.to('.line-origin, .line-roast, .line-notes', {
      opacity: 1,
      ease: 'power2.out',
      duration: 0.25
    }, 0.45)
    .to('.dot-origin, .dot-roast, .dot-notes', {
      opacity: 1,
      ease: 'power2.out',
      duration: 0.18
    }, 0.52)
    .to('#label-origin, #label-roast, #label-notes', {
      opacity: 1,
      y: 0,
      ease: 'expo.out',
      duration: 0.22,
      stagger: 0.05
    }, 0.48);

    // Fade out exploded view before bean rain
    explodedTl.to(['.exploded-svg-layer', '.exploded-label'], {
      opacity: 0,
      ease: 'power3.inOut',
      duration: 0.12
    }, 0.88);

    // ----------------------------------------------------
    // 4. Bean Rain (State 3: 400 beans spiral into clean ring, solid headlines, rest-zero skew)
    // ----------------------------------------------------
    gsap.set('.bean-rain-headline-wrap', { skewY: 0, rotation: 0 });

    let skewDebounce;
    const beanRainTl = gsap.timeline({
      scrollTrigger: {
        trigger: '#bean-rain',
        start: 'top top',
        end: '+=160%',
        pin: true,
        scrub: 1.0,
        anticipatePin: 1,
        onUpdate: (self) => {
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

    // Subline fades in smoothly and remains visible through the complete ring at the end of the section
    beanRainTl.fromTo('.bean-rain-subline', {
      opacity: 0,
      y: 20
    }, {
      opacity: 1,
      y: 0,
      ease: 'power2.out',
      duration: 0.20
    }, 0.20)
    .to('.bean-rain-subline', {
      opacity: 0,
      y: -10,
      ease: 'power2.in',
      duration: 0.04
    }, 0.96);
    // ----------------------------------------------------
    // 5. Menu ("The Signature Five")
    // Horizontal strip of 5 tall cards inside left ~65%
    // 3D cup pinned in right third, driven by centered card or hover
    // ----------------------------------------------------
    const cardsTrack = document.getElementById('menu-cards-track');
    const cardsWrap = document.querySelector('.menu-cards-track-wrap');
    const cards = gsap.utils.toArray('.menu-card');

    if (cardsTrack && cardsWrap && cards.length) {
      const getScrollAmount = () => -(cardsTrack.scrollWidth - cardsWrap.clientWidth + 80);

      const menuTl = gsap.timeline({
        scrollTrigger: {
          trigger: '#menu',
          start: 'top top',
          end: '+=200%',
          pin: true,
          scrub: 1.0,
          anticipatePin: 1,
          onEnter: () => window.emberStage?.setMenuScrub?.(0),
          onEnterBack: () => window.emberStage?.setMenuScrub?.(1),
          onUpdate: (self) => {
            const p = self.progress;
            window.emberStage?.setMenuScrub?.(p);

            // Determine which card is centered in the track wrap
            const wrapRect = cardsWrap.getBoundingClientRect();
            const wrapCenter = wrapRect.left + wrapRect.width / 2;

            let closestIndex = 0;
            let closestDist = Infinity;

            cards.forEach((card, idx) => {
              const cardRect = card.getBoundingClientRect();
              const cardCenter = cardRect.left + cardRect.width / 2;
              const dist = Math.abs(cardCenter - wrapCenter);
              if (dist < closestDist) {
                closestDist = dist;
                closestIndex = idx;
              }
            });

            // If user is not currently hovering a card, active center card drives cup
            if (!this._userHoveringCard) {
              cards.forEach((card, idx) => {
                card.classList.toggle('is-active', idx === closestIndex);
              });
              if (this._currentActiveDrink !== closestIndex) {
                this._currentActiveDrink = closestIndex;
                window.emberStage?.setDrinkActive?.(closestIndex);
              }
            }
          }
        }
      });

      menuTl.to(cardsTrack, {
        x: () => getScrollAmount(),
        ease: 'none',
        duration: 1.0
      });

      // Individual cards rotateY and scale slightly with progress
      cards.forEach((card, idx) => {
        menuTl.to(card, {
          rotateY: (idx % 2 === 0 ? 8 : -8),
          scale: 1.02,
          ease: 'power1.inOut',
          duration: 1.0
        }, 0);

        // Hover listener to override cup liquid color
        card.addEventListener('mouseenter', () => {
          this._userHoveringCard = true;
          cards.forEach((c) => c.classList.remove('is-active'));
          card.classList.add('is-active');
          this._currentActiveDrink = idx;
          window.emberStage?.setDrinkActive?.(idx);
        });

        card.addEventListener('mouseleave', () => {
          this._userHoveringCard = false;
        });
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

    gsap.timeline({
      scrollTrigger: {
        trigger: '#process',
        start: 'top top',
        end: '+=240%',
        pin: true,
        scrub: 1.0,
        anticipatePin: 1,
        onUpdate: (self) => {
          const p = self.progress;
          window.emberStage?.setProcessScrub?.(p);

          // Step index based on progress: 0 to 3
          const stepIdx = Math.min(Math.floor(p * 4), 3);
          processSteps.forEach((step, idx) => {
            if (step) {
              step.classList.toggle('is-active', idx === stepIdx);
            }
          });
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
    // 8. Finale
    // Background transitions to crema paper (#ECE1CE)
    // 3D cup shrinks (scrub) and lands inside "Reserve a table" pill
    // ----------------------------------------------------
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

    // Mobile Menu: vertical list of cards
    const mobileCards = gsap.utils.toArray('.menu-card');
    mobileCards.forEach((card, idx) => {
      ScrollTrigger.create({
        trigger: card,
        start: 'top 60%',
        end: 'bottom 40%',
        onEnter: () => {
          mobileCards.forEach(c => c.classList.remove('is-active'));
          card.classList.add('is-active');
          window.emberStage?.setDrinkActive?.(idx);
          window.emberStage?.setMenuScrub?.(idx / Math.max(1, mobileCards.length - 1));
        },
        onEnterBack: () => {
          mobileCards.forEach(c => c.classList.remove('is-active'));
          card.classList.add('is-active');
          window.emberStage?.setDrinkActive?.(idx);
          window.emberStage?.setMenuScrub?.(idx / Math.max(1, mobileCards.length - 1));
        }
      });
    });

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
