import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { EmberScene } from './scene.js';
import { EmberScroll } from './scroll.js';
import { EmberPreloader } from './preloader.js';
import { EmberPolish } from './polish.js';

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
        window.emberScroll = this.scroll;
        ScrollTrigger.refresh();
        this.lenis?.resize();
      }
    });

    // 5. Initialize Navigation & Reservation Modal (Stage 2B)
    this.initNavigation();
    this.initReservationModal();
    this.initFooter();

    // 6. Initialize Polish & Micro-interactions (Phase 7)
    this.polish = new EmberPolish(this.lenis);
    window.emberPolish = this.polish;

    console.log('[EMBER] Stage 2B & Phase 7 Initialized.');
  }

  initFooter() {
    // 1. Back to top button smooth scroll via Lenis
    const backToTopBtn = document.getElementById('footer-back-to-top');
    if (backToTopBtn) {
      backToTopBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (this.lenis) {
          this.lenis.scrollTo(0, { duration: 1.8, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      });
    }

    // 2. Footer directory links smooth scroll
    const footerLinks = document.querySelectorAll('.footer-link');
    footerLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        const href = link.getAttribute('href');
        if (href && href.startsWith('#')) {
          e.preventDefault();
          if (href === '#reserve') {
            document.querySelector('#finale-reserve-btn')?.click();
            return;
          }
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

    // 3. Hovering the finale pill causes coffee droplets to burst up and settle
    const finalePill = document.getElementById('finale-reserve-btn');
    if (finalePill) {
      finalePill.addEventListener('mouseenter', () => {
        window.emberStage?.burstFinaleSplash?.();
      });
    }
  }

  initNavigation() {
    const nav = document.querySelector('.site-nav');
    const links = document.querySelectorAll('.nav-link');

    // Nav links smooth scroll via Lenis
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

    // Auto-hide on scroll down, show on scroll up & current section dot
    let lastScroll = 0;
    if (this.lenis) {
      this.lenis.on('scroll', ({ scroll, velocity }) => {
        const isDown = scroll > lastScroll;
        if (scroll > 120 && isDown && velocity > 0.4) {
          nav?.classList.add('is-hidden');
        } else if (!isDown || scroll <= 120) {
          nav?.classList.remove('is-hidden');
        }
        lastScroll = Math.max(0, scroll);

        // Track current section for nav indicator dot
        const sections = [
          { id: 'menu', link: '#menu' },
          { id: 'process', link: '#process' },
          { id: 'finale', link: '#visit' }
        ];

        let activeLink = null;
        for (const sec of sections) {
          const el = document.getElementById(sec.id);
          if (el) {
            const rect = el.getBoundingClientRect();
            if (rect.top <= window.innerHeight * 0.5 && rect.bottom >= window.innerHeight * 0.2) {
              activeLink = sec.link;
            }
          }
        }

        links.forEach(l => {
          l.classList.toggle('is-current', l.getAttribute('href') === activeLink);
        });
      });
    }
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
      lerp: 0.085,
      smoothWheel: true,
      wheelMultiplier: 0.9,
      touchMultiplier: 1.4
    });

    window.emberLenis = this.lenis;
    this.lenis.on('scroll', ScrollTrigger.update);
    ScrollTrigger.addEventListener('refresh', () => this.lenis.resize());

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
