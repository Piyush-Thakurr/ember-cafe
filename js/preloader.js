import gsap from 'gsap';

/**
 * EMBER Preloader Engine (Stage 2A)
 * Features:
 * - "Brewing…" 0->100 counter with filling SVG cup silhouette
 * - Curtain wipe revealing hero
 * - EMBER letters rising one by one with stagger
 * - 3D cup scaling in
 */

export class EmberPreloader {
  constructor(onComplete) {
    this.onComplete = onComplete;
    this.preloaderEl = document.getElementById('preloader');
    this.counterEl = document.querySelector('.preloader-counter');
    this.fillPath = document.getElementById('cup-liquid-fill');
    this.isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    this.init();
  }

  init() {
    if (this.isReduced) {
      if (this.preloaderEl) this.preloaderEl.style.display = 'none';
      if (this.onComplete) this.onComplete();
      return;
    }

    const state = { count: 0 };
    const tl = gsap.timeline({
      onComplete: () => {
        this.revealHero();
      }
    });

    // Animate counter and cup liquid fill
    tl.to(state, {
      count: 100,
      duration: 1.8,
      ease: 'power2.inOut',
      onUpdate: () => {
        const val = Math.floor(state.count);
        if (this.counterEl) this.counterEl.textContent = val;
        if (this.fillPath) {
          // Adjust SVG fill clip rectangle height (0 to 48px)
          const fillHeight = (val / 100) * 44;
          this.fillPath.setAttribute('height', fillHeight);
          this.fillPath.setAttribute('y', 52 - fillHeight);
        }
      }
    });
  }

  revealHero() {
    const curtainTl = gsap.timeline({
      onComplete: () => {
        if (this.preloaderEl) this.preloaderEl.style.display = 'none';
        if (this.onComplete) this.onComplete();
      }
    });

    // Curtain wipe reveal
    curtainTl.to(this.preloaderEl, {
      yPercent: -100,
      duration: 0.9,
      ease: 'expo.inOut'
    });

    // Hero intro: EMBER letters rise one by one
    curtainTl.fromTo('.ember-char', {
      y: 80,
      opacity: 0
    }, {
      y: 0,
      opacity: 0.92,
      duration: 1.0,
      stagger: 0.08,
      ease: 'expo.out'
    }, '-=0.4');

    // 3D Cup scales into place
    curtainTl.fromTo({ s: 0 }, { s: 0.70 }, {
      duration: 1.1,
      ease: 'expo.out',
      onUpdate: function() {
        const s = this.targets()[0].s;
        if (window.emberStage?.cup) {
          window.emberStage.cup.scale.set(s, s, s);
        }
      }
    }, '-=0.8');
  }
}
