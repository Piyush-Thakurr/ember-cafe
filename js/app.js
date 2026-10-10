import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { EmberScene } from './scene.js';
import { EmberScroll } from './scroll.js';
import { EmberPreloader } from './preloader.js';

/**
 * EMBER Application Orchestrator (Stage 2A)
 * Boots preloader, mounts 3D scene, and initializes Lenis + GSAP ScrollTrigger.
 */

class EmberApp {
  constructor() {
    this.canvas = document.getElementById('webgl-canvas');
    this.isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.init();
  }

  init() {
    window.gsap = gsap;
    window.ScrollTrigger = ScrollTrigger;

    // 1. Initialize Three.js 3D Scene first so stageAPI is ready
    if (this.canvas) {
      this.scene = new EmberScene(this.canvas);
      this.stageAPI = this.scene.getStageAPI();
      window.emberStage = this.stageAPI;
    }

    // 2. Initialize Lenis Smooth Scroll
    if (!this.isReducedMotion) {
      this.initLenis();
    }

    // 3. Initialize Preloader with curtain wipe & hero intro
    new EmberPreloader(() => {
      // 4. Initialize Scroll Orchestrator after preloader finishes
      if (this.stageAPI) {
        this.scroll = new EmberScroll(this.stageAPI);
        ScrollTrigger.refresh();
      }
    });

    console.log('[EMBER] Stage 2A Initialized: Preloader, Hero->State 1, Dive, Exploded View, Bean Rain active.');
  }

  initLenis() {
    gsap.registerPlugin(ScrollTrigger);

    this.lenis = new Lenis({
      lerp: 0.08,
      smoothWheel: true,
      wheelMultiplier: 1.0,
      touchMultiplier: 1.5
    });

    window.emberLenis = this.lenis;
    this.lenis.on('scroll', ScrollTrigger.update);

    gsap.ticker.add((time) => {
      this.lenis.raf(time * 1000);
    });

    gsap.ticker.lagSmoothing(0);
  }
}

// Boot application
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new EmberApp());
} else {
  new EmberApp();
}
