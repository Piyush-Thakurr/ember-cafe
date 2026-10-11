import gsap from 'gsap';

export class EmberPolish {
  constructor(lenis) {
    this.lenis = lenis;
    this.isTouch = window.matchMedia('(pointer: coarse)').matches;
    this.isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.init();
  }

  init() {
    this.initGrain();
    if (!this.isTouch) {
      this.initCursor();
      this.initMagnetic();
    }
    this.initTextScramble();
    this.initScrollIndicators();
    this.initMobileNav();
  }

  initGrain() {
    // Generate static 64x64 GPU-cached noise texture once (zero scroll performance cost)
    const grainEl = document.querySelector('.film-grain-overlay');
    if (!grainEl) return;

    try {
      const c = document.createElement('canvas');
      c.width = 64;
      c.height = 64;
      const ctx = c.getContext('2d');
      if (ctx) {
        const idata = ctx.createImageData(64, 64);
        for (let i = 0; i < idata.data.length; i += 4) {
          const v = (Math.random() * 255) | 0;
          idata.data[i] = v;
          idata.data[i + 1] = v;
          idata.data[i + 2] = v;
          idata.data[i + 3] = 16; // ~6% opacity baked into texture
        }
        ctx.putImageData(idata, 0, 0);
        grainEl.style.backgroundImage = `url(${c.toDataURL('image/png')})`;
      }
    } catch (_) {
      // Fallback: harmless transparent overlay
    }
  }

  initCursor() {
    const cursor = document.getElementById('custom-cursor');
    const label = document.getElementById('cursor-label');
    if (!cursor) return;

    let mouseX = -100;
    let mouseY = -100;
    let ringX = -100;
    let ringY = -100;
    let isMoving = false;

    const dot = cursor.querySelector('.cursor-dot');
    const ring = cursor.querySelector('.cursor-ring');

    window.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      if (dot) {
        dot.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0)`;
      }
      isMoving = true;
    }, { passive: true });

    const updateRing = () => {
      if (isMoving || Math.abs(mouseX - ringX) > 0.5 || Math.abs(mouseY - ringY) > 0.5) {
        ringX += (mouseX - ringX) * 0.18;
        ringY += (mouseY - ringY) * 0.18;
        if (ring) {
          ring.style.transform = `translate3d(${ringX}px, ${ringY}px, 0)`;
        }
        if (Math.abs(mouseX - ringX) <= 0.5 && Math.abs(mouseY - ringY) <= 0.5) {
          isMoving = false;
        }
      }
      requestAnimationFrame(updateRing);
    };
    requestAnimationFrame(updateRing);

    // Dynamic Labels: View / Drag / Reserve
    const setLabel = (text) => {
      if (!cursor) return;
      if (text) {
        cursor.classList.add('has-label');
        if (label) label.textContent = text;
      } else {
        cursor.classList.remove('has-label');
        if (label) label.textContent = '';
      }
    };

    // Dynamic Labels: Only on elements with data-cursor attribute
    document.addEventListener('mouseover', (e) => {
      const cursorTarget = e.target.closest('[data-cursor]');
      if (cursorTarget) {
        const text = cursorTarget.getAttribute('data-cursor');
        setLabel(text);
      } else {
        setLabel('');
      }

      const interactive = e.target.closest('a, button, input, [role="button"]');
      if (interactive) {
        cursor.classList.add('is-hovering');
      } else {
        cursor.classList.remove('is-hovering');
      }
    });
  }

  initMagnetic() {
    if (this.isReducedMotion) return;
    const magneticTargets = document.querySelectorAll('.site-nav .btn-pill, .finale-reserve-pill, .footer-back-to-top');

    magneticTargets.forEach(el => {
      el.addEventListener('mousemove', (e) => {
        const rect = el.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const dx = e.clientX - centerX;
        const dy = e.clientY - centerY;
        gsap.to(el, { x: dx * 0.28, y: dy * 0.28, duration: 0.3, ease: 'power2.out', overwrite: 'auto' });
      }, { passive: true });

      el.addEventListener('mouseleave', () => {
        gsap.to(el, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.4)', overwrite: 'auto' });
      });
    });
  }

  initTextScramble() {
    const scrambleElements = document.querySelectorAll('.nav-link, .footer-link');
    const chars = '—/_*+:-·•~';

    scrambleElements.forEach(el => {
      const originalText = el.textContent.trim();
      let interval = null;

      el.addEventListener('mouseenter', () => {
        let iteration = 0;
        clearInterval(interval);
        interval = setInterval(() => {
          el.textContent = originalText
            .split('')
            .map((char, index) => {
              if (index < iteration) {
                return originalText[index];
              }
              return chars[Math.floor(Math.random() * chars.length)];
            })
            .join('');

          if (iteration >= originalText.length) {
            clearInterval(interval);
          }
          iteration += 1 / 3;
        }, 30);
      });

      el.addEventListener('mouseleave', () => {
        clearInterval(interval);
        el.textContent = originalText;
      });
    });
  }

  initScrollIndicators() {
    const progressLine = document.getElementById('scroll-progress-line');
    const counterVal = document.getElementById('counter-val');

    const sections = [
      { id: 'hero', num: '01' },
      { id: 'exploded-view', num: '02' },
      { id: 'bean-rain', num: '03' },
      { id: 'menu', num: '04' },
      { id: 'process', num: '05' },
      { id: 'atmosphere', num: '06' },
      { id: 'finale', num: '07' },
      { id: 'footer', num: '08' }
    ];

    let scheduled = false;
    let sectionCache = [];

    const cacheOffsets = () => {
      sectionCache = sections.map(s => {
        const el = document.getElementById(s.id);
        return {
          num: s.num,
          top: el ? el.offsetTop : 0
        };
      });
    };

    cacheOffsets();
    window.addEventListener('resize', cacheOffsets, { passive: true });

    const updateScroll = () => {
      const scrollY = window.scrollY;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const progress = maxScroll > 0 ? Math.min(Math.max(scrollY / maxScroll, 0), 1) : 0;

      if (progressLine) {
        progressLine.style.transform = `scaleY(${progress})`;
      }
      scheduled = false;
    };

    window.addEventListener('scroll', () => {
      if (!scheduled) {
        scheduled = true;
        requestAnimationFrame(updateScroll);
      }
    }, { passive: true });

    updateScroll();
  }

  initMobileNav() {
    const toggleBtn = document.getElementById('mobile-menu-toggle');
    const overlay = document.getElementById('mobile-nav-overlay');
    if (!toggleBtn || !overlay) return;

    let isOpen = false;

    const setOpen = (open) => {
      isOpen = open;
      toggleBtn.classList.toggle('is-active', isOpen);
      toggleBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      overlay.classList.toggle('is-open', isOpen);
      overlay.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
      document.body.style.overflow = isOpen ? 'hidden' : '';
      if (this.lenis) {
        if (isOpen) this.lenis.stop();
        else this.lenis.start();
      }
    };

    toggleBtn.addEventListener('click', () => setOpen(!isOpen));

    overlay.querySelectorAll('.mobile-nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        const href = link.getAttribute('href');
        setOpen(false);

        if (href && href.startsWith('#')) {
          e.preventDefault();
          if (href === '#reserve') {
            document.querySelector('#finale-reserve-btn')?.click();
            return;
          }
          const target = href === '#visit' ? '#finale' : href;
          setTimeout(() => {
            if (this.lenis) {
              this.lenis.scrollTo(target, { duration: 1.2 });
            } else {
              document.querySelector(target)?.scrollIntoView({ behavior: 'smooth' });
            }
          }, 300);
        }
      });
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isOpen) {
        setOpen(false);
      }
    });
  }
}
