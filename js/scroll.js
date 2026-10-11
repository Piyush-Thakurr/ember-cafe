import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/**
 * EMBER Scroll Choreography Engine (R0 Architecture)
 * Section Registry and Modular ScrollTrigger Timelines in strict DOM order:
 * 1. Hero (Pin 80vh)
 * 2. Dive (Pin 100vh) -> Total Hero+Dive = 180vh
 * 3. Exploded View (Pin 160vh)
 * 4. Bean Rain (Pin 170vh)
 * 5. Menu / Tasting Turntable (Pin 390vh)
 * 6. Process (Pin 220vh)
 * 7. Atmosphere (Gallery & Marquee ~220vh)
 * 8. Finale (Pin 160vh)
 * 9. Footer (~70vh)
 */

export const SECTION_REGISTRY = [
  { id: 'hero', theme: 'dark', number: '01' },
  { id: 'dive', theme: 'dark', number: '02' },
  { id: 'exploded', theme: 'dark', number: '03' },
  { id: 'bean-rain', theme: 'dark', number: '04' },
  { id: 'menu', theme: 'dark', number: '05' },
  { id: 'process', theme: 'dark', number: '06' },
  { id: 'atmosphere', theme: 'dark', number: '07', hideCounter: true },
  { id: 'finale', theme: 'light', number: '08' },
  { id: 'footer', theme: 'dark', number: '08', hideCounter: true }
];

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
      this.updateSectionState('hero');
      return;
    }

    this.mm.add('(min-width: 769px)', () => {
      this.buildScroll();
    });

    this.mm.add('(max-width: 768px)', () => {
      this.setupMobileTimelines();
    });
  }

  updateSectionState(sectionId) {
    const section = SECTION_REGISTRY.find(s => s.id === sectionId);
    if (!section) return;

    // 1. Update site navigation theme
    const nav = document.querySelector('.site-nav');
    if (nav) {
      if (section.theme === 'light') {
        nav.classList.remove('theme-dark');
        nav.classList.add('theme-light');
      } else {
        nav.classList.remove('theme-light');
        nav.classList.add('theme-dark');
      }
    }

    // 2. Update section counter value, visibility and theme
    const counterEl = document.getElementById('scroll-section-counter');
    const counterVal = document.getElementById('counter-val');
    if (counterEl) {
      if (section.hideCounter) {
        counterEl.classList.add('is-hidden');
      } else {
        counterEl.classList.remove('is-hidden');
      }

      if (section.theme === 'light') {
        counterEl.classList.remove('theme-dark');
        counterEl.classList.add('theme-light');
      } else {
        counterEl.classList.remove('theme-light');
        counterEl.classList.add('theme-dark');
      }
    }

    if (counterVal && section.number) {
      counterVal.textContent = `[ ${section.number} / 08 ]`;
    }
  }

  buildScroll() {
    // Instantiate all section timelines strictly in DOM order
    this.heroTl = this.buildHero();
    this.diveTl = this.buildDive();
    this.explodedTl = this.buildExploded();
    this.beanRainTl = this.buildBeanRain();
    this.menuTrigger = this.buildMenu();
    this.processTrigger = this.buildProcess();
    this.atmosphereTriggers = this.buildAtmosphere();
    this.finaleTrigger = this.buildFinale();
    this.footerTriggers = this.buildFooter();

    // Register Handover Triggers (bridges between pinned sections so no dead gaps > 15vh exist)
    const heroST = this.heroTl.scrollTrigger;
    const diveST = this.diveTl.scrollTrigger;
    const explodedST = this.explodedTl.scrollTrigger;
    const beanRainST = this.beanRainTl.scrollTrigger;
    const menuST = this.menuTrigger;
    const processST = this.processTrigger;

    const registerHandover = (id, prevST, nextST, updateFn) => {
      return ScrollTrigger.create({
        id: `boundary-${id}`,
        trigger: prevST.trigger,
        start: () => prevST.end - 6,
        end: () => nextST.start + 6,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          if (self.isActive && updateFn) {
            updateFn(self.progress);
          }
        }
      });
    };

    this.handoverHeroDive = registerHandover('hero-dive', heroST, diveST, (p) => {
      window.emberStage?.setHeroScrub?.(1.0);
    });

    this.handoverDiveExploded = registerHandover('dive-exploded', diveST, explodedST, (p) => {
      window.emberStage?.setDiveScrub?.(1.0, 0);
    });

    this.handoverExplodedBeans = registerHandover('exploded-beans', explodedST, beanRainST, (p) => {
      window.emberStage?.setExplodedScrub?.(1.0);
    });

    this.handoverBeansMenu = registerHandover('beans-menu', beanRainST, menuST, (p) => {
      window.emberStage?.setBeanRainScrub?.(1.0);
    });

    this.handoverMenuProcess = registerHandover('menu-process', menuST, processST, (p) => {
      window.emberStage?.setMenuScrub?.(1.0);
    });

    // Dynamically calculate and update section state based on scroll coordinates
    this.updateSectionByScroll = (scrollY) => {
      const heroST = this.heroTl?.scrollTrigger;
      const diveST = this.diveTl?.scrollTrigger;
      const explodedST = this.explodedTl?.scrollTrigger;
      const beanRainST = this.beanRainTl?.scrollTrigger;
      const menuST = this.menuTrigger;
      const processST = this.processTrigger;
      const finaleST = this.finaleTrigger;

      if (!heroST || !diveST) return;

      let activeId = 'hero';
      if (scrollY < (diveST.start - 50)) {
        activeId = 'hero';
      } else if (scrollY < (explodedST.start - 50)) {
        activeId = 'dive';
      } else if (scrollY < (beanRainST.start - 50)) {
        activeId = 'exploded';
      } else if (scrollY < (menuST.start - 50)) {
        activeId = 'bean-rain';
      } else if (scrollY < (processST.start - 50)) {
        activeId = 'menu';
      } else if (scrollY < (processST.end + 50)) {
        activeId = 'process';
      } else if (scrollY < (finaleST.start - 50)) {
        activeId = 'atmosphere';
      } else if (scrollY <= (finaleST.end + 50)) {
        activeId = 'finale';
      } else {
        activeId = 'footer';
      }

      this.updateSectionState(activeId);
    };

    // Global scroll position tracker for reliable theme and counter updates
    ScrollTrigger.create({
      start: 0,
      end: 'max',
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        const scrollY = self.scroll();
        this.updateSectionByScroll(scrollY);
      }
    });

    window.addEventListener('scroll', () => {
      const scrollY = window.scrollY || window.pageYOffset || 0;
      this.updateSectionByScroll(scrollY);
    }, { passive: true });

    // Ensure GSAP Sorts triggers correctly in DOM order
    ScrollTrigger.sort();

    // Initialize initial state at scroll = 0
    this.updateSectionState('hero');
  }

  // ----------------------------------------------------
  // ----------------------------------------------------
  // 1. HERO (Pinned 60vh, state 1 spread -> letters fly past camera)
  // ----------------------------------------------------
  buildHero() {
    gsap.set(['.dive-fade-overlay', '.dive-headline'], { opacity: 0 });

    const heroTl = gsap.timeline({
      scrollTrigger: {
        trigger: '#hero',
        start: 'top top',
        end: '+=60%',
        pin: true,
        pinSpacing: true,
        scrub: 0.8,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onEnter: () => {
          this.updateSectionState('hero');
          gsap.set(['.dive-fade-overlay', '.dive-headline'], { opacity: 0 });
          window.emberStage?.setHeroScrub?.(0);
        },
        onEnterBack: () => {
          this.updateSectionState('hero');
          gsap.set(['.dive-fade-overlay', '.dive-headline'], { opacity: 0 });
          window.emberStage?.setHeroScrub?.(1);
        },
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
      duration: 0.25
    }, 0);

    // Initial gentle spread (0 to 0.40)
    heroTl.to('#char-e1', { xPercent: -55, opacity: 0.85, ease: 'power2.out', duration: 0.40 }, 0)
          .to('#char-m',  { xPercent: -28, opacity: 0.85, ease: 'power2.out', duration: 0.40 }, 0)
          .to('#char-b',  { opacity: 0.80, scale: 0.95, ease: 'power2.out', duration: 0.40 }, 0)
          .to('#char-e2', { xPercent: 28,  opacity: 0.85, ease: 'power2.out', duration: 0.40 }, 0)
          .to('#char-r',  { xPercent: 50,  opacity: 0.85, ease: 'power2.out', duration: 0.40 }, 0);

    // Letters fly outward past camera (scale up to 3.5x, fading) by 15% checkpoint (0.40 to 1.0)
    heroTl.to('#char-e1', { xPercent: -220, yPercent: -45, scale: 3.5, opacity: 0, ease: 'power2.in', duration: 0.60 }, 0.40)
          .to('#char-m',  { xPercent: -120, yPercent: -65, scale: 3.2, opacity: 0, ease: 'power2.in', duration: 0.60 }, 0.40)
          .to('#char-b',  { xPercent: 0,    yPercent: -85, scale: 3.8, opacity: 0, ease: 'power2.in', duration: 0.60 }, 0.40)
          .to('#char-e2', { xPercent: 120,  yPercent: -65, scale: 3.2, opacity: 0, ease: 'power2.in', duration: 0.60 }, 0.40)
          .to('#char-r',  { xPercent: 220,  yPercent: -45, scale: 3.5, opacity: 0, ease: 'power2.in', duration: 0.60 }, 0.40)
          .to('.hero-wordmark-container', { opacity: 0, duration: 0.20 }, 0.80);

    return heroTl;
  }

  // ----------------------------------------------------
  // 2. DIVE (Pinned 120vh, camera into crema, ripples, headline hold)
  // ----------------------------------------------------
  buildDive() {
    const diveTl = gsap.timeline({
      scrollTrigger: {
        trigger: '#dive',
        start: 'top top',
        end: '+=120%',
        pin: true,
        pinSpacing: true,
        scrub: 0.8,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onEnter: () => {
          this.updateSectionState('dive');
          window.emberStage?.setDiveScrub?.(0, 0);
        },
        onEnterBack: () => {
          this.updateSectionState('dive');
          window.emberStage?.setDiveScrub?.(1, 0);
        },
        onUpdate: (self) => {
          if (!self.isActive) return;
          const velocity = self.getVelocity() / 400;
          window.emberStage?.setDiveScrub?.(self.progress, velocity);
        },
        onLeave: () => gsap.set(['.dive-fade-overlay', '.dive-headline'], { opacity: 0 }),
        onLeaveBack: () => gsap.set(['.dive-fade-overlay', '.dive-headline'], { opacity: 0 })
      }
    });

    // Warm atmospheric espresso vignette overlay (never pure black, max 0.35 opacity)
    diveTl.to('.dive-fade-overlay', {
      opacity: 0.35,
      ease: 'power2.inOut',
      duration: 0.20
    }, 0.25)
    .to('.dive-fade-overlay', {
      opacity: 0,
      ease: 'power2.inOut',
      duration: 0.15
    }, 0.75);

    // Masked line reveal for "Look closer. The crema is a map."
    // 40% to 55% of overall range: headline clearly visible above canvas on two lines, holding for 35vh+ with slow parallax drift
    diveTl.fromTo('.dive-headline', {
      opacity: 0,
      y: 0
    }, {
      opacity: 1,
      duration: 0.08,
      ease: 'power2.out'
    }, 0.28)
    .fromTo('.line-text-1', {
      yPercent: 110
    }, {
      yPercent: 0,
      ease: 'power3.out',
      duration: 0.08
    }, 0.28)
    .fromTo('.line-text-2', {
      yPercent: 110
    }, {
      yPercent: 0,
      ease: 'power3.out',
      duration: 0.08
    }, 0.34)
    .to('.dive-headline', {
      y: -28,
      ease: 'none',
      duration: 0.40 // 40% of 120vh = 48vh hold > 35vh requirement!
    }, 0.34)
    .to('.dive-headline', {
      opacity: 0,
      y: -48,
      ease: 'power2.in',
      duration: 0.10
    }, 0.74);

    return diveTl;
  }

  // ----------------------------------------------------
  // 3. EXPLODED VIEW (Pinned 160vh, focus-step system)
  // ----------------------------------------------------
  updateExplodedFocus(p) {
    const card1 = document.getElementById('focus-step-1');
    const card2 = document.getElementById('focus-step-2');
    const card3 = document.getElementById('focus-step-3');
    const markerGroup = document.getElementById('focus-marker-group');
    const elbowLine = document.getElementById('focus-elbow-line');

    if (!card1 || !card2 || !card3 || !markerGroup || !elbowLine) return;

    let activeStep = 0;
    if (p >= 0.22 && p < 0.45) {
      activeStep = 1;
    } else if (p >= 0.45 && p < 0.68) {
      activeStep = 2;
    } else if (p >= 0.68 && p <= 0.90) {
      activeStep = 3;
    }

    card1.classList.toggle('is-active', activeStep === 1);
    card2.classList.toggle('is-active', activeStep === 2);
    card3.classList.toggle('is-active', activeStep === 3);

    if (activeStep === 0) {
      markerGroup.setAttribute('opacity', '0');
      elbowLine.setAttribute('opacity', '0');
      return;
    }

    // Get 3D coords of active step marker projected on screen
    const coords = window.emberStage?.getExplodedFocusCoords?.(activeStep);
    if (!coords) return;

    const mx = Math.round(coords.x);
    const my = Math.round(coords.y);

    markerGroup.setAttribute('transform', `translate(${mx}, ${my})`);
    markerGroup.setAttribute('opacity', '1');

    // Get active card anchor
    const activeCard = activeStep === 1 ? card1 : (activeStep === 2 ? card2 : card3);
    const rect = activeCard.getBoundingClientRect();

    let cx, cy;
    if (activeStep === 2) {
      // Step 2 card is on the right: anchor on left edge of card
      cx = Math.round(rect.left - 12);
      cy = Math.round(rect.top + rect.height * 0.45);
    } else {
      // Step 1 and 3 cards are on the left: anchor on right edge of card
      cx = Math.round(rect.right + 12);
      cy = Math.round(rect.top + rect.height * 0.45);
    }

    // Elbow line: short diagonal from marker, then horizontal to text block
    let d = '';
    if (cx < mx) {
      // Card is to the left of marker
      const kx = Math.round(mx - Math.min(50, Math.max(25, (mx - cx) * 0.35)));
      d = `M ${mx} ${my} L ${kx} ${cy} L ${cx} ${cy}`;
    } else {
      // Card is to the right of marker
      const kx = Math.round(mx + Math.min(50, Math.max(25, (cx - mx) * 0.35)));
      d = `M ${mx} ${my} L ${kx} ${cy} L ${cx} ${cy}`;
    }

    elbowLine.setAttribute('d', d);
    elbowLine.setAttribute('opacity', '1');
  }

  clearExplodedFocus() {
    const card1 = document.getElementById('focus-step-1');
    const card2 = document.getElementById('focus-step-2');
    const card3 = document.getElementById('focus-step-3');
    const markerGroup = document.getElementById('focus-marker-group');
    const elbowLine = document.getElementById('focus-elbow-line');
    if (card1) card1.classList.remove('is-active');
    if (card2) card2.classList.remove('is-active');
    if (card3) card3.classList.remove('is-active');
    if (markerGroup) markerGroup.setAttribute('opacity', '0');
    if (elbowLine) elbowLine.setAttribute('opacity', '0');
  }

  buildExploded() {
    const explodedTl = gsap.timeline({
      scrollTrigger: {
        trigger: '#exploded',
        start: 'top top',
        end: '+=160%',
        pin: true,
        pinSpacing: true,
        scrub: 0.8,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onEnter: () => {
          this.updateSectionState('exploded');
          gsap.set(['.dive-fade-overlay', '.dive-headline'], { opacity: 0 });
          window.emberStage?.setExplodedScrub?.(0);
          this.updateExplodedFocus(0);
        },
        onEnterBack: () => {
          this.updateSectionState('exploded');
          window.emberStage?.setExplodedScrub?.(1);
          this.updateExplodedFocus(1);
        },
        onLeave: () => {
          this.clearExplodedFocus();
        },
        onLeaveBack: () => {
          this.clearExplodedFocus();
        },
        onUpdate: (self) => {
          if (!self.isActive) return;
          const p = self.progress;
          window.emberStage?.setExplodedScrub?.(p);
          this.updateExplodedFocus(p);
        }
      }
    });

    explodedTl.to({}, { duration: 1 });

    return explodedTl;
  }

  // ----------------------------------------------------
  // 4. BEAN RAIN (Pinned 170vh)
  // ----------------------------------------------------
  buildBeanRain() {
    gsap.set('.bean-rain-headline-wrap', { skewY: 0, rotation: 0, opacity: 0 });
    gsap.set('.line-left', { xPercent: -70, opacity: 0 });
    gsap.set('.line-right', { xPercent: 70, opacity: 0 });
    gsap.set('.bean-rain-subline', { opacity: 0, y: 24 });

    let skewDebounce;
    const beanRainTl = gsap.timeline({
      scrollTrigger: {
        trigger: '#bean-rain',
        start: 'top top',
        end: '+=170%',
        pin: true,
        pinSpacing: true,
        scrub: 0.8,
        invalidateOnRefresh: true,
        onEnter: () => {
          this.updateSectionState('bean-rain');
          gsap.set(['.menu-content-pin', '.turntable-rail'], { opacity: 0, pointerEvents: 'none' });
          window.emberStage?.setBeanRainScrub?.(0);
        },
        onEnterBack: () => {
          this.updateSectionState('bean-rain');
          gsap.set(['.menu-content-pin', '.turntable-rail'], { opacity: 0, pointerEvents: 'none' });
          window.emberStage?.setBeanRainScrub?.(1);
        },
        onLeave: () => {
          gsap.set(['.bean-rain-headline-wrap', '.line-left', '.line-right', '.bean-rain-subline'], { opacity: 0 });
        },
        onLeaveBack: () => {
          gsap.set(['.bean-rain-headline-wrap', '.line-left', '.line-right', '.bean-rain-subline'], { opacity: 0 });
          gsap.set(['.menu-content-pin', '.turntable-rail'], { opacity: 0, pointerEvents: 'none' });
        },
        onUpdate: (self) => {
          if (!self.isActive) return;
          const v = self.getVelocity() / 350;
          const clampedSkew = gsap.utils.clamp(-4, 4, v);
          gsap.to('.bean-rain-headline-wrap', {
            skewY: clampedSkew,
            duration: 0.15,
            ease: 'power1.out',
            overwrite: 'auto'
          });

          clearTimeout(skewDebounce);
          skewDebounce = setTimeout(() => {
            gsap.to('.bean-rain-headline-wrap', {
              skewY: 0,
              duration: 0.35,
              ease: 'power2.out',
              overwrite: 'auto'
            });
          }, 60);

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

    beanRainTl.to('.bean-rain-headline-wrap', {
      opacity: 1,
      duration: 0.08,
      ease: 'power2.out'
    }, 0.35)
    .to('.line-left', {
      xPercent: 0,
      opacity: 1,
      ease: 'power2.out',
      duration: 0.14
    }, 0.38)
    .to('.line-right', {
      xPercent: 0,
      opacity: 1,
      ease: 'power2.out',
      duration: 0.14
    }, 0.42)
    .to('.bean-rain-subline', {
      opacity: 1,
      y: 0,
      ease: 'power2.out',
      duration: 0.12
    }, 0.48)
    .to('.line-left', {
      yPercent: -100,
      opacity: 0,
      ease: 'power2.in',
      duration: 0.08
    }, 0.68)
    .to('.line-right', {
      yPercent: -100,
      opacity: 0,
      ease: 'power2.in',
      duration: 0.08
    }, 0.70)
    .to('.bean-rain-subline', {
      yPercent: -100,
      opacity: 0,
      ease: 'power2.in',
      duration: 0.06
    }, 0.70)
    .to('.bean-rain-headline-wrap', {
      opacity: 0,
      duration: 0.06,
      ease: 'power2.in'
    }, 0.72)
    .to({}, { duration: 0.22 }, 0.78); // Extend timeline duration strictly to 1.0

    return beanRainTl;
  }

  // ----------------------------------------------------
  // 5. MENU (Pinned 390vh)
  // ----------------------------------------------------
  buildMenu() {
    const menuSection = document.getElementById('menu');
    if (!menuSection) return null;

    const numEl = document.getElementById('active-drink-num');
    const servingEl = document.getElementById('active-drink-serving');
    const nameEl = document.getElementById('active-drink-name');
    const descEl = document.getElementById('active-drink-desc');
    const priceEl = document.getElementById('active-drink-price');
    const hintEl = document.getElementById('menu-scroll-hint');
    const railTicks = gsap.utils.toArray('.rail-tick');

    const drinksData = [
      { num: '01', name: 'Ember Espresso', desc: 'Dark cocoa, orange peel, a long finish.', price: 120, serving: 'HOT', liquid: '#2A1208' },
      { num: '02', name: 'Cortado Noir', desc: 'Espresso and steamed milk in equal parts. Silk and smoke.', price: 160, serving: 'HOT', liquid: '#8A5A35' },
      { num: '03', name: 'Burnt Caramel Latte', desc: 'Torched sugar, whole milk, a pinch of sea salt.', price: 190, serving: 'HOT', liquid: '#C68A52' },
      { num: '04', name: 'Cold Drip 18H', desc: 'Steeped for eighteen hours. Clean, bright, dangerously smooth.', price: 210, serving: 'ICED', liquid: '#1B0F0A' },
      { num: '05', name: 'Ember Tonic', desc: 'Espresso over tonic and citrus. Sparkling, bitter, alive.', price: 200, serving: 'ICED', liquid: '#D9822B' }
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

      railTicks.forEach((tick, idx) => {
        tick.classList.toggle('is-active', idx === index);
      });
    };

    gsap.set(['.menu-content-pin', '.turntable-rail'], { opacity: 0, pointerEvents: 'none' });

    const menuTrigger = ScrollTrigger.create({
      trigger: '#menu',
      start: 'top top',
      end: '+=390%',
      pin: true,
      pinSpacing: true,
      scrub: 0.8,
      invalidateOnRefresh: true,
      onEnter: () => {
        this.updateSectionState('menu');
        window.emberStage?.setMenuScrub?.(0);
        updateMenuDrinkDOM(0);
        gsap.set(['.menu-content-pin', '.turntable-rail'], { opacity: 0, pointerEvents: 'none' });
      },
      onEnterBack: () => {
        this.updateSectionState('menu');
        window.emberStage?.setMenuScrub?.(1);
        updateMenuDrinkDOM(4);
        gsap.set(['.menu-content-pin', '.turntable-rail'], { opacity: 1, pointerEvents: 'auto' });
      },
      onLeave: () => {
        gsap.set(['.menu-content-pin', '.turntable-rail'], { opacity: 0, pointerEvents: 'none' });
      },
      onLeaveBack: () => {
        gsap.set(['.menu-content-pin', '.turntable-rail'], { opacity: 0, pointerEvents: 'none' });
      },
      onUpdate: (self) => {
        if (!self.isActive) return;
        const p = self.progress;
        window.emberStage?.setMenuScrub?.(p);

        // Content fade in at entry (0 to 0.08) and fade out at exit (0.92 to 1.0)
        if (p < 0.08) {
          gsap.set(['.menu-content-pin', '.turntable-rail'], { opacity: p / 0.08, pointerEvents: p > 0.04 ? 'auto' : 'none' });
        } else if (p > 0.92) {
          gsap.set(['.menu-content-pin', '.turntable-rail'], { opacity: (1.0 - p) / 0.08, pointerEvents: p < 0.96 ? 'auto' : 'none' });
        } else {
          gsap.set(['.menu-content-pin', '.turntable-rail'], { opacity: 1, pointerEvents: 'auto' });
        }

        const drinkIdx = Math.min(4, Math.floor(p / 0.19));
        if (drinkIdx !== currentDrinkIndex && p < 0.95) {
          updateMenuDrinkDOM(drinkIdx);
          window.emberStage?.setDrinkActive?.(drinkIdx);
        }

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

    // Keyboard arrow keys
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

    return menuTrigger;
  }

  // ----------------------------------------------------
  // 6. PROCESS (Pinned 220vh, espresso background throughout)
  // ----------------------------------------------------
  buildProcess() {
    const processSteps = [
      document.getElementById('step-green'),
      document.getElementById('step-roast'),
      document.getElementById('step-grind'),
      document.getElementById('step-brew')
    ];

    const animateProcessEntry = () => {
      processSteps.forEach((step, idx) => {
        if (!step) return;
        step.classList.toggle('is-active', idx === 0);
        gsap.fromTo(step, 
          { x: -32, opacity: 0 }, 
          { x: 0, opacity: idx === 0 ? 1.0 : 0.35, duration: 0.5, delay: idx * 0.07, ease: 'power2.out', overwrite: 'auto' }
        );
      });
    };

    const processTrigger = ScrollTrigger.create({
      trigger: '#process',
      start: 'top top',
      end: '+=220%',
      pin: true,
      pinSpacing: true,
      scrub: 0.8,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onEnter: () => {
        this.updateSectionState('process');
        window.emberStage?.setProcessScrub?.(0);
        animateProcessEntry();
        gsap.set('.process-content-pin', { opacity: 1 });
      },
      onEnterBack: () => {
        this.updateSectionState('process');
        window.emberStage?.setProcessScrub?.(1);
        processSteps.forEach((step, idx) => {
          if (step) step.classList.toggle('is-active', idx === 3);
        });
        gsap.set('.process-content-pin', { opacity: 1 });
      },
      onLeave: () => {
        gsap.set('.process-content-pin', { opacity: 0 });
      },
      onLeaveBack: () => {
        gsap.set('.process-content-pin', { opacity: 0 });
      },
      onUpdate: (self) => {
        if (!self.isActive) return;
        const p = self.progress;
        window.emberStage?.setProcessScrub?.(p);

        // Content fade in at entry (0 to 0.08) and fade out at exit (0.92 to 1.0)
        if (p < 0.08) {
          gsap.set('.process-content-pin', { opacity: p / 0.08 });
        } else if (p > 0.92) {
          gsap.set('.process-content-pin', { opacity: (1.0 - p) / 0.08 });
        } else {
          gsap.set('.process-content-pin', { opacity: 1 });
        }

        // Step index based on progress: 0 to 3
        const stepIdx = Math.min(Math.floor(p * 4), 3);
        processSteps.forEach((step, idx) => {
          if (step) {
            step.classList.toggle('is-active', idx === stepIdx);
          }
        });
      }
    });

    return processTrigger;
  }

  // ----------------------------------------------------
  // 7. ATMOSPHERE (~220vh gallery, dark espresso background)
  // ----------------------------------------------------
  buildAtmosphere() {
    const triggers = [];

    // Mode switch trigger
    const modeTrigger = ScrollTrigger.create({
      trigger: '#atmosphere',
      start: 'top 50%',
      end: 'bottom 50%',
      invalidateOnRefresh: true,
      onEnter: () => {
        this.updateSectionState('atmosphere');
        window.emberStage?.setAtmosphereScrub?.(0);
      },
      onEnterBack: () => {
        this.updateSectionState('atmosphere');
        window.emberStage?.setAtmosphereScrub?.(1);
      }
    });
    triggers.push(modeTrigger);

    // Gallery clip-path reveals & parallax
    const galleryItems = gsap.utils.toArray('.gallery-item');
    galleryItems.forEach((item) => {
      const frame = item.querySelector('.image-reveal-frame');
      const img = item.querySelector('.gallery-img');

      if (frame) {
        const revealST = ScrollTrigger.create({
          trigger: item,
          start: 'top 85%',
          invalidateOnRefresh: true,
          onEnter: () => frame.classList.add('is-revealed')
        });
        triggers.push(revealST);
      }

      if (img) {
        const imgAnim = gsap.fromTo(img, { yPercent: -8 }, {
          yPercent: 8,
          ease: 'none',
          scrollTrigger: {
            trigger: item,
            start: 'top bottom',
            end: 'bottom top',
            scrub: 1.0,
            invalidateOnRefresh: true
          }
        });
        triggers.push(imgAnim.scrollTrigger);
      }
    });

    // Horizontal strip slow drift
    const stripTrack = document.querySelector('.gallery-strip-track');
    if (stripTrack) {
      const stripAnim = gsap.to(stripTrack, {
        x: -160,
        ease: 'none',
        scrollTrigger: {
          trigger: '.gallery-strip-wrap',
          start: 'top bottom',
          end: 'bottom top',
          scrub: 1.0,
          invalidateOnRefresh: true
        }
      });
      triggers.push(stripAnim.scrollTrigger);
    }

    return triggers;
  }

  // ----------------------------------------------------
  // 8. FINALE (Pinned 160vh, crema background)
  // ----------------------------------------------------
  buildFinale() {
    const finaleTrigger = ScrollTrigger.create({
      trigger: '#finale',
      start: 'top top',
      end: '+=160%',
      pin: true,
      pinSpacing: true,
      scrub: 0.8,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onEnter: () => {
        this.updateSectionState('finale');
        window.emberStage?.setFinaleScrub?.(0);
      },
      onEnterBack: () => {
        this.updateSectionState('finale');
        window.emberStage?.setFinaleScrub?.(1);
      },
      onUpdate: (self) => {
        if (!self.isActive) return;
        window.emberStage?.setFinaleScrub?.(self.progress);
      }
    });

    return finaleTrigger;
  }

  // ----------------------------------------------------
  // 9. FOOTER (~70vh, espresso background)
  // ----------------------------------------------------
  buildFooter() {
    const triggers = [];

    const footerModeTrigger = ScrollTrigger.create({
      trigger: '#footer',
      start: 'top 85%',
      invalidateOnRefresh: true,
      onEnter: () => this.updateSectionState('footer'),
      onLeaveBack: () => this.updateSectionState('finale')
    });
    triggers.push(footerModeTrigger);

    const wordmarkAnim = gsap.from('#footer-wordmark .wordmark-char', {
      y: 70,
      opacity: 0,
      stagger: 0.08,
      duration: 1.0,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: '#footer',
        start: 'top 85%',
        invalidateOnRefresh: true
      }
    });
    triggers.push(wordmarkAnim.scrollTrigger);

    const colAnim = gsap.from('.footer-col', {
      y: 35,
      opacity: 0,
      stagger: 0.1,
      duration: 0.8,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: '#footer',
        start: 'top 85%',
        invalidateOnRefresh: true
      }
    });
    triggers.push(colAnim.scrollTrigger);

    return triggers;
  }

  // ----------------------------------------------------
  // Mobile Timelines (Responsive with lower offsets)
  // ----------------------------------------------------
  setupMobileTimelines() {
    const heroTl = gsap.timeline({
      scrollTrigger: {
        trigger: '#hero',
        start: 'top top',
        end: '+=100%',
        pin: true,
        pinSpacing: true,
        scrub: 1.0,
        invalidateOnRefresh: true,
        onEnter: () => this.updateSectionState('hero'),
        onEnterBack: () => this.updateSectionState('hero')
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
        pinSpacing: true,
        scrub: 1.0,
        invalidateOnRefresh: true,
        onEnter: () => this.updateSectionState('dive'),
        onEnterBack: () => this.updateSectionState('dive'),
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
        pinSpacing: true,
        scrub: 1.0,
        invalidateOnRefresh: true,
        onEnter: () => this.updateSectionState('exploded'),
        onEnterBack: () => this.updateSectionState('exploded')
      }
    })
    .to({ p: 0 }, {
      p: 1,
      onUpdate: function() {
        window.emberStage?.setExplodedScrub?.(this.targets()[0].p);
      }
    }, 0)
    .to(['#focus-step-1', '#focus-step-2', '#focus-step-3'], { opacity: 1, y: 0, stagger: 0.2 }, 0.2);

    // Mobile Bean Rain
    gsap.timeline({
      scrollTrigger: {
        trigger: '#bean-rain',
        start: 'top top',
        end: '+=120%',
        pin: true,
        pinSpacing: true,
        scrub: 1.0,
        invalidateOnRefresh: true,
        onEnter: () => this.updateSectionState('bean-rain'),
        onEnterBack: () => this.updateSectionState('bean-rain')
      }
    })
    .to({ p: 0 }, {
      p: 1,
      onUpdate: function() {
        window.emberStage?.setBeanRainScrub?.(this.targets()[0].p);
      }
    }, 0)
    .to('.bean-rain-subline', { opacity: 1, y: 0 }, 0.3);

    // Mobile Menu
    const mobileMenu = document.getElementById('menu');
    if (mobileMenu) {
      ScrollTrigger.create({
        trigger: '#menu',
        start: 'top top',
        end: '+=200%',
        pin: true,
        pinSpacing: true,
        scrub: 0.8,
        invalidateOnRefresh: true,
        onEnter: () => this.updateSectionState('menu'),
        onEnterBack: () => this.updateSectionState('menu'),
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
        pinSpacing: true,
        scrub: 1.0,
        invalidateOnRefresh: true,
        onEnter: () => this.updateSectionState('process'),
        onEnterBack: () => this.updateSectionState('process'),
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
      invalidateOnRefresh: true,
      onEnter: () => this.updateSectionState('finale'),
      onEnterBack: () => this.updateSectionState('finale'),
      onUpdate: (self) => {
        window.emberStage?.setFinaleScrub?.(self.progress);
      }
    });

    ScrollTrigger.sort();
  }
}
