/**
 * ============================================================================
 * HANDLE & HUE — Parallax & Scroll-Reveal Engine (js/parallax.js)
 * ============================================================================
 * Features:
 * - Uses IntersectionObserver + requestAnimationFrame for 60fps smoothness
 * - Drives Hero background parallax, full-width Banner parallax, and
 *   multi-layer decorative floating shapes (blush orbs, gold arches, lines)
 * - Triggers slow, calm scroll-in reveal animations (.reveal)
 * - Automatically disables parallax on mobile (<768px) and respects
 *   prefers-reduced-motion: reduce
 * ============================================================================
 */

(function () {
  'use strict';

  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  let isReducedMotion = reducedMotionQuery.matches;
  let isMobileViewport = window.innerWidth <= 768;

  // Listen for changes in user motion preference
  if (reducedMotionQuery.addEventListener) {
    reducedMotionQuery.addEventListener('change', (e) => {
      isReducedMotion = e.matches;
      if (isReducedMotion) resetParallaxTransforms();
    });
  }

  // Track active parallax elements currently inside or near the viewport
  const activeParallaxNodes = new Set();
  let ticking = false;

  const parallaxItems = [];

  /**
   * Collect all parallax targets on the page:
   * - .parallax-hero__bg (classic hero background moving slower than scroll)
   * - .parallax-banner__bg (editorial banner backgrounds between content blocks)
   * - [data-parallax-speed] (multi-layer decorative shapes & accents)
   */
  function initParallaxTargets() {
    const nodes = document.querySelectorAll(
      '.parallax-hero__bg, .parallax-banner__bg, [data-parallax-speed]'
    );

    if (!nodes.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            activeParallaxNodes.add(entry.target);
          } else {
            activeParallaxNodes.delete(entry.target);
          }
        });
        requestTick();
      },
      {
        rootMargin: '150px 0px 150px 0px',
        threshold: 0
      }
    );

    nodes.forEach((node) => {
      let speed = parseFloat(node.getAttribute('data-parallax-speed'));
      if (isNaN(speed)) {
        if (node.classList.contains('parallax-hero__bg')) {
          speed = 0.34; // Hero background moves at 34% of scroll speed
        } else if (node.classList.contains('parallax-banner__bg')) {
          speed = 0.26; // Editorial banners move gently relative to viewport center
        } else {
          speed = 0.15;
        }
      }
      node.__parallaxSpeed = speed;
      parallaxItems.push(node);
      observer.observe(node.parentElement || node);
      activeParallaxNodes.add(node);
    });

    updateParallaxPositions();
  }

  /**
   * Reset transforms when mobile or prefers-reduced-motion is active
   */
  function resetParallaxTransforms() {
    parallaxItems.forEach((node) => {
      node.style.transform = 'translate3d(0, 0, 0)';
    });
  }

  /**
   * Calculate and apply GPU-accelerated translate3d transforms
   */
  function updateParallaxPositions() {
    ticking = false;

    if (isReducedMotion || isMobileViewport) {
      resetParallaxTransforms();
      return;
    }

    const viewportHeight = window.innerHeight;
    const scrollY = window.pageYOffset || document.documentElement.scrollTop;

    parallaxItems.forEach((node) => {
      const container = node.closest('.parallax-hero, .parallax-banner, .section') || node.parentElement;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      // Only compute if within extended viewport range
      if (rect.bottom < -200 || rect.top > viewportHeight + 200) return;

      const speed = node.__parallaxSpeed || 0.2;
      const rotationAttr = parseFloat(node.getAttribute('data-parallax-rotate')) || 0;

      if (node.classList.contains('parallax-hero__bg')) {
        // Classic hero parallax: shift downward at a fraction of scrollY
        const offset = Math.round(scrollY * speed * 10) / 10;
        node.style.transform = `translate3d(0, ${offset}px, 0) scale(1.04)`;
      } else {
        // Relative to viewport center for banners and floating multi-layer shapes
        const centerOffset = (rect.top + rect.height / 2) - viewportHeight / 2;
        const translateY = Math.round(-centerOffset * speed * 10) / 10;

        if (rotationAttr !== 0) {
          const deg = Math.round((centerOffset * rotationAttr * 0.05) * 10) / 10;
          node.style.transform = `translate3d(0, ${translateY}px, 0) rotate(${deg}deg)`;
        } else {
          node.style.transform = `translate3d(0, ${translateY}px, 0)`;
        }
      }
    });
  }

  function requestTick() {
    if (!ticking && !isReducedMotion && !isMobileViewport) {
      ticking = true;
      window.requestAnimationFrame(updateParallaxPositions);
    }
  }

  window.addEventListener('scroll', requestTick, { passive: true });
  window.addEventListener(
    'resize',
    () => {
      isMobileViewport = window.innerWidth <= 768;
      requestTick();
    },
    { passive: true }
  );

  /**
   * ==========================================================================
   * Scroll-In Reveal Animations (.reveal)
   * Slow, soft fade and gentle slide up using IntersectionObserver
   * ==========================================================================
   */
  let revealObserver = null;

  function setupRevealObserver() {
    if (isReducedMotion || !('IntersectionObserver' in window)) {
      document.querySelectorAll('.reveal').forEach((el) => el.classList.add('is-visible'));
      return;
    }

    if (!revealObserver) {
      revealObserver = new IntersectionObserver(
        (entries, obs) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-visible');
              obs.unobserve(entry.target);
            }
          });
        },
        {
          root: null,
          rootMargin: '0px 0px -55px 0px',
          threshold: 0.12
        }
      );
    }

    document.querySelectorAll('.reveal:not(.is-visible)').forEach((el) => {
      revealObserver.observe(el);
    });
  }

  // Expose globally so dynamically rendered product grids can register reveals
  window.observeReveals = setupRevealObserver;

  document.addEventListener('DOMContentLoaded', () => {
    initParallaxTargets();
    setupRevealObserver();
  });
})();
