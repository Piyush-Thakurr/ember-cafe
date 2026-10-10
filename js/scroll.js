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
    // 3. Exploded View (Cup separates along Y, SVG leader lines)
    // ----------------------------------------------------
    const explodedTl = gsap.timeline({
      scrollTrigger: {
        trigger: '#exploded',
        start: 'top top',
        end: '+=160%',
        pin: true,
        scrub: 1.0,
        anticipatePin: 1
      }
    });

    // Animate 3D mesh vertical separation
    explodedTl.to({ p: 0 }, {
      p: 1,
      ease: 'power3.inOut',
      duration: 1.0,
      onUpdate: function() {
        window.emberStage?.setExplodedScrub?.(this.targets()[0].p);
      }
    }, 0);

    // Draw 3 SVG leader lines with stroke-dashoffset and 6px dots
    explodedTl.to('.line-origin', { strokeDashoffset: 0, ease: 'power2.out', duration: 0.25 }, 0.10)
              .to('.dot-origin', { opacity: 1, ease: 'power2.out', duration: 0.15 }, 0.22)
              .to('#label-origin', { opacity: 1, y: 0, ease: 'expo.out', duration: 0.25 }, 0.12)
              
              .to('.line-roast', { strokeDashoffset: 0, ease: 'power2.out', duration: 0.25 }, 0.20)
              .to('.dot-roast', { opacity: 1, ease: 'power2.out', duration: 0.15 }, 0.32)
              .to('#label-roast', { opacity: 1, y: 0, ease: 'expo.out', duration: 0.25 }, 0.22)
              
              .to('.line-notes', { strokeDashoffset: 0, ease: 'power2.out', duration: 0.25 }, 0.30)
              .to('.dot-notes', { opacity: 1, ease: 'power2.out', duration: 0.15 }, 0.42)
              .to('#label-notes', { opacity: 1, y: 0, ease: 'expo.out', duration: 0.25 }, 0.32);

    // Fade out exploded view before bean rain
    explodedTl.to(['.exploded-svg-layer', '.exploded-label'], {
      opacity: 0,
      ease: 'power3.inOut',
      duration: 0.2
    }, 0.9);

    // ----------------------------------------------------
    // 4. Bean Rain (State 3: 400 beans spiral into ring, solid headlines, depth interleaved)
    // ----------------------------------------------------
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
            duration: 0.2,
            overwrite: 'auto'
          });
        }
      }
    });

    // Animate 400 instanced beans falling & spiraling into ring vortex
    beanRainTl.to({ p: 0 }, {
      p: 1,
      ease: 'power3.inOut',
      duration: 1.0,
      onUpdate: function() {
        window.emberStage?.setBeanRainScrub?.(this.targets()[0].p);
      }
    }, 0);

    // Subline fade and rise
    beanRainTl.to('.bean-rain-subline', {
      opacity: 1,
      y: 0,
      ease: 'expo.out',
      duration: 0.5
    }, 0.3);
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
  }
}
