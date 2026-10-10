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

    // 5. Initialize Navigation & Reservation Modal (Stage 2B)
    this.initNavigation();
    this.initReservationModal();

    console.log('[EMBER] Stage 2B Initialized: Menu, Process, Atmosphere, Finale & Modal active.');
  }

  initNavigation() {
    // Nav links smooth scroll via Lenis
    const links = document.querySelectorAll('.nav-link');
    links.forEach(link => {
      link.addEventListener('click', (e) => {
        const href = link.getAttribute('href');
        if (href && href.startsWith('#')) {
          e.preventDefault();
          const target = href === '#visit' ? '#finale' : href;
          if (this.lenis) {
            this.lenis.scrollTo(target, { duration: 1.4, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
          } else {
            const el = document.querySelector(target);
            el?.scrollIntoView({ behavior: 'smooth' });
          }
        }
      });
    });
  }

  initReservationModal() {
    const modal = document.getElementById('reservation-modal');
    const backdrop = document.getElementById('modal-backdrop');
    const closeBtn = document.getElementById('modal-close-btn');
    const form = document.getElementById('reservation-form');
    const confirmation = document.getElementById('modal-confirmation');
    const openTriggers = document.querySelectorAll('.btn-pill, #finale-reserve-btn, .btn-open-modal, a[href="#reserve"]');

    if (!modal) return;

    let lastFocusedElement = null;

    const openModal = (trigger) => {
      lastFocusedElement = trigger || document.activeElement;
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      if (this.lenis) this.lenis.stop();

      // Focus first input
      const firstInput = document.getElementById('field-name');
      setTimeout(() => firstInput?.focus(), 50);
    };

    const closeModal = () => {
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      if (this.lenis) this.lenis.start();

      // Reset form & confirmation state
      if (form) {
        form.reset();
        form.style.display = 'flex';
      }
      if (confirmation) {
        confirmation.classList.remove('is-visible');
      }

      // Return focus to trigger
      if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
        lastFocusedElement.focus();
      }
    };

    // Open triggers
    openTriggers.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        openModal(btn);
      });
    });

    // Close triggers
    closeBtn?.addEventListener('click', closeModal);
    backdrop?.addEventListener('click', closeModal);

    // Esc to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('is-open')) {
        closeModal();
      }
    });

    // Focus trap
    modal.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') return;

      const focusables = modal.querySelectorAll('input:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])');
      if (!focusables.length) return;

      const firstEl = focusables[0];
      const lastEl = focusables[focusables.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstEl) {
          e.preventDefault();
          lastEl.focus();
        }
      } else {
        if (document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    });

    // Form submission & validation
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();

        const nameInput = document.getElementById('field-name');
        const dateInput = document.getElementById('field-date');
        const partyInput = document.getElementById('field-party');
        const timeInput = document.getElementById('field-time');

        const isValid = nameInput?.value.trim() &&
                        dateInput?.value.trim() &&
                        partyInput?.value.trim() &&
                        timeInput?.value.trim();

        if (!isValid) {
          [nameInput, dateInput, partyInput, timeInput].find(input => !input?.value.trim())?.focus();
          return;
        }

        // Show confirmation line from content.md: "Table requested. See you soon."
        form.style.display = 'none';
        if (confirmation) {
          confirmation.classList.add('is-visible');
        }

        // Close after 2 seconds
        setTimeout(() => {
          closeModal();
        }, 2000);
      });
    }
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
