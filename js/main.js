/**
 * ============================================================================
 * HANDLE & HUE — Main Application Controller (js/main.js)
 * ============================================================================
 * Powered by `window.HandleHueData` (Supabase + Static Fallback Data Layer):
 * - Sticky transparent-to-ivory navbar, dynamic announcement bar & mobile drawer
 * - Floating WhatsApp chat button synced with settings.whatsapp_number
 * - Soft Luxury skeleton placeholders while loading data with zero layout jump
 * - Live search overlay with PKR pricing & XSS-escaped output
 * - Product card rendering with Sold Out badge & disabled buttons when in_stock=false
 * - Home page sections using `is_new`, `is_bestseller`, and `is_featured` flags
 * - Shop page filtering (Category, Color, Max Price in PKR, Search) & sorting
 * - Product Detail page (Multi-image gallery, hover zoom on desktop, disabled
 *   Add to Cart & Buy on WhatsApp when Sold Out, Related products)
 * - Cart & Checkout page (Dynamic `shipping_fee`, `free_shipping_threshold`,
 *   and `whatsapp_number` from settings, HUE10 / WELCOME10 promo codes,
 *   Order on WhatsApp flow)
 * - Contact page form & FAQ accordions synced with settings
 * ============================================================================
 */

(function () {
  'use strict';

  const colors = window.HANDLE_HUE_COLORS || [];
  const categories = window.HANDLE_HUE_CATEGORIES || [];
  const store = window.HandleHueStore;
  const formatPKR =
    window.formatPKR ||
    function (n) {
      return 'Rs. ' + Math.round(Number(n) || 0).toLocaleString();
    };
  const escapeHTML =
    window.escapeHTML ||
    function (v) {
      if (v === null || v === undefined) return '';
      return String(v)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    };

  function getProducts() {
    if (window.HandleHueData && typeof window.HandleHueData.getProducts === 'function') {
      return window.HandleHueData.getProducts();
    }
    return window.HANDLE_HUE_PRODUCTS || [];
  }

  function getSettings() {
    if (window.HandleHueData && typeof window.HandleHueData.getSettings === 'function') {
      return window.HandleHueData.getSettings();
    }
    return {
      whatsapp_number: window.WHATSAPP_NUMBER || '923469377256',
      whatsapp_display: window.WHATSAPP_DISPLAY || '+92 346 9377256',
      whatsapp_tel: window.WHATSAPP_TEL || '+923469377256',
      shipping_fee:
        (window.HANDLE_HUE_SHIPPING_CONFIG &&
          window.HANDLE_HUE_SHIPPING_CONFIG.flatShippingFee) ||
        250,
      free_shipping_threshold:
        (window.HANDLE_HUE_SHIPPING_CONFIG &&
          window.HANDLE_HUE_SHIPPING_CONFIG.freeShippingThreshold) ||
        10000,
      announcement_text:
        'Free Nationwide Delivery Across Pakistan Over Rs. 10,000 • Welcome Privilege Code: HUE10'
    };
  }

  function buildWhatsAppUrl(message) {
    const settings = getSettings();
    const num = String(settings.whatsapp_number || '923469377256').replace(/\D/g, '');
    const base = 'https://wa.me/' + num;
    return message ? base + '?text=' + encodeURIComponent(message) : base;
  }

  /* ==========================================================================
     0. Soft Loading Skeleton Helper (No Layout Jumps)
     ========================================================================== */
  function renderSkeletonGrid(count) {
    const n = Number(count) || 4;
    let html = '';
    for (let i = 0; i < n; i++) {
      html +=
        '<div class="skeleton-card" aria-hidden="true">' +
        '<div class="skeleton-card__media"></div>' +
        '<div class="skeleton-card__body">' +
        '<div class="skeleton-line skeleton-line--short"></div>' +
        '<div class="skeleton-line skeleton-line--title"></div>' +
        '<div class="skeleton-line skeleton-line--price"></div>' +
        '</div>' +
        '</div>';
    }
    return html;
  }

  /* ==========================================================================
     1. Sticky Navbar, Settings Sync, Global Overlays & Floating WhatsApp
     ========================================================================== */
  function syncSettingsAcrossDOM() {
    const settings = getSettings();
    const waNumber = settings.whatsapp_number;
    const waDisplay = settings.whatsapp_display;
    const waTel = settings.whatsapp_tel;

    // 1. Top Announcement Bar
    document.querySelectorAll('.announcement-bar').forEach(function (bar) {
      const text = (settings.announcement_text || '').trim();
      if (!text) {
        bar.style.display = 'none';
      } else {
        bar.style.display = '';
        // Highlight HUE10 or WELCOME10 in gold span if present
        const escaped = escapeHTML(text).replace(
          /\b(HUE10|WELCOME10)\b/g,
          '<span>$1</span>'
        );
        bar.innerHTML = escaped;
      }
    });

    // 2. Update Floating WhatsApp Button
    initFloatingWhatsAppButton();

    // 3. Update Footer, Mobile Drawer & Contact Page WhatsApp / Phone Links
    document.querySelectorAll('.footer-social-link[aria-label*="WhatsApp"]').forEach(function (a) {
      a.href = 'https://wa.me/' + encodeURIComponent(waNumber);
    });

    document.querySelectorAll('.mobile-drawer-footer a[href*="wa.me"], .concierge-card a[href*="wa.me"], .faq-accordion a[href*="wa.me"]').forEach(function (a) {
      const hasQuery = a.href.includes('?text=');
      if (hasQuery) {
        a.href = buildWhatsAppUrl('Hi Handle & Hue, I would like to know more about your bags.');
      } else {
        a.href = 'https://wa.me/' + encodeURIComponent(waNumber);
      }
      if (!a.classList.contains('btn')) {
        a.textContent = waDisplay;
      }
    });

    document.querySelectorAll('.mobile-drawer-footer a[href^="tel:"], .concierge-card a[href^="tel:"]').forEach(function (a) {
      a.href = 'tel:' + waTel;
      if (a.classList.contains('btn')) {
        a.textContent = 'Call ' + waDisplay;
      } else {
        a.textContent = waDisplay;
      }
    });
  }

  function initHeaderAndDrawers() {
    const header = document.getElementById('siteHeader');
    if (header) {
      const onScroll = function () {
        if (window.scrollY > 36) {
          header.classList.add('is-scrolled');
        } else {
          header.classList.remove('is-scrolled');
        }
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    }

    const mobileBtn = document.getElementById('mobileMenuBtn');
    if (mobileBtn) {
      mobileBtn.addEventListener('click', function () {
        store.openSideDrawer('mobileNavDrawer');
      });
    }

    document.querySelectorAll('[data-open-cart]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        if (window.location.pathname.endsWith('cart.html')) return;
        e.preventDefault();
        store.openSideDrawer('cartDrawer');
      });
    });

    document.querySelectorAll('[data-open-wishlist]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        store.openSideDrawer('wishlistDrawer');
      });
    });

    const searchOverlay = document.getElementById('searchOverlay');
    const searchInput = document.getElementById('globalSearchInput');
    document.querySelectorAll('[data-open-search]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        store.closeAllDrawers();
        if (searchOverlay) {
          searchOverlay.classList.add('is-open');
          searchOverlay.setAttribute('aria-hidden', 'false');
          const backdrop = document.getElementById('drawerBackdrop');
          if (backdrop) backdrop.classList.add('is-open');
          setTimeout(function () {
            if (searchInput) searchInput.focus();
          }, 120);
        }
      });
    });

    document.querySelectorAll('[data-close-drawer]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        store.closeAllDrawers();
      });
    });

    const backdrop = document.getElementById('drawerBackdrop');
    if (backdrop) {
      backdrop.addEventListener('click', function () {
        store.closeAllDrawers();
      });
    }

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') store.closeAllDrawers();
    });

    // Live Search in Search Overlay
    const searchPreview = document.getElementById('globalSearchPreview');
    if (searchInput && searchPreview) {
      const renderSearchPreview = function (query) {
        const products = getProducts();
        const q = (query || '').trim().toLowerCase();
        const matches = q
          ? products.filter(function (p) {
              return (
                p.name.toLowerCase().includes(q) ||
                p.category.toLowerCase().includes(q) ||
                p.primaryColor.toLowerCase().includes(q) ||
                (p.subtitle && p.subtitle.toLowerCase().includes(q))
              );
            })
          : products.slice(0, 4);

        if (matches.length === 0) {
          searchPreview.innerHTML =
            '<p style="grid-column: 1/-1; color: var(--color-charcoal-soft); font-size:0.9rem;">No pieces found matching "' +
            escapeHTML(query) +
            '". Try searching for "Tote", "Blush", or "Clutch".</p>';
          return;
        }

        searchPreview.innerHTML = matches
          .slice(0, 4)
          .map(function (p) {
            const isSoldOut = p.inStock === false || p.in_stock === false;
            return (
              '<a href="product.html?id=' +
              encodeURIComponent(p.id) +
              '" style="display:flex; align-items:center; gap:0.8rem; padding:0.65rem; background:var(--color-ivory-pure); border:var(--border-thin); border-radius:var(--radius-sm);">' +
              '<img src="' +
              escapeHTML(p.images.primary) +
              '" alt="' +
              escapeHTML(p.name) +
              '" style="width:54px; height:62px; object-fit:cover; border-radius:4px;">' +
              '<div>' +
              '<div style="font-family:var(--font-heading); font-weight:600; font-size:1.05rem;">' +
              escapeHTML(p.name) +
              '</div>' +
              '<div style="font-size:0.76rem; color:var(--color-charcoal-muted);">' +
              escapeHTML(p.primaryColor) +
              ' &bull; ' +
              formatPKR(p.price) +
              (isSoldOut ? ' &bull; <strong>Sold out</strong>' : '') +
              '</div>' +
              '</div>' +
              '</a>'
            );
          })
          .join('');
      };

      searchInput.addEventListener('input', function (e) {
        renderSearchPreview(e.target.value);
      });
      window.addEventListener('handlehue:data-loaded', function () {
        renderSearchPreview(searchInput.value);
      });
      renderSearchPreview('');
    }

    initFloatingWhatsAppButton();
  }

  function initFloatingWhatsAppButton() {
    const defaultGreeting = 'Hi Handle & Hue, I would like to know more about your bags.';
    const waHref = buildWhatsAppUrl(defaultGreeting);

    let floatBtn = document.getElementById('floatingWhatsAppBtn');
    if (!floatBtn) {
      floatBtn = document.createElement('a');
      floatBtn.id = 'floatingWhatsAppBtn';
      floatBtn.className = 'whatsapp-float';
      floatBtn.target = '_blank';
      floatBtn.rel = 'noopener noreferrer';
      floatBtn.setAttribute('aria-label', 'Chat with Handle & Hue on WhatsApp');
      floatBtn.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">' +
        '<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>' +
        '</svg>' +
        '<span>WhatsApp Us</span>';
      document.body.appendChild(floatBtn);
    }
    floatBtn.href = waHref;
  }

  /* ==========================================================================
     2. Reusable Product Card Renderer & Global Card Events
     ========================================================================== */
  function renderStarString(ratingValue) {
    const rounded = Math.max(0, Math.min(5, Math.round(Number(ratingValue) || 0)));
    let stars = '';
    for (let i = 1; i <= 5; i++) {
      stars += i <= rounded ? '&#9733;' : '&#9734;';
    }
    return stars;
  }

  function formatReviewDate(isoDate) {
    if (!isoDate) return '';
    try {
      const d = new Date(isoDate);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleDateString('en-PK', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (e) {
      return '';
    }
  }

  function renderProductCard(product, staggerIndex) {
    const idx = Number(staggerIndex) || 0;
    const wished = store.isInWishlist(product.id);
    const isSoldOut = product.inStock === false || product.in_stock === false;
    const delayClass = idx > 0 ? 'delay-' + ((idx % 4) + 1) : '';

    let badgeLabel = product.badge || '';
    if (isSoldOut) {
      badgeLabel = 'Sold out';
    }

    let badgeClass = '';
    if (isSoldOut) {
      badgeClass = 'product-card__badge--soldout';
    } else if (badgeLabel === 'Limited Hue' || badgeLabel === 'Sale' || badgeLabel === 'Featured') {
      badgeClass = 'product-card__badge--gold';
    }

    const encodedId = encodeURIComponent(product.id);
    const safeIdAttr = escapeHTML(product.id);
    const safeName = escapeHTML(product.name);
    const safeCat = escapeHTML(product.category);
    const safePrimaryColor = escapeHTML(product.primaryColor);
    const safePrimaryImg = escapeHTML(product.images.primary);
    const safeSecondaryImg = escapeHTML(product.images.secondary || product.images.primary);

    const comparePriceHtml = product.compareAtPrice
      ? '<span style="font-size:0.76rem; color:var(--color-charcoal-muted); text-decoration:line-through; margin-left:0.35rem; font-weight:300;">' +
        formatPKR(product.compareAtPrice) +
        '</span>'
      : '';

    const revCount = Number(product.reviewsCount) || 0;
    const revAvg = Number(product.rating) || 0;
    const cardRatingHtml =
      revCount > 0 && revAvg > 0
        ? '<div class="product-card__rating" aria-label="Rated ' +
          escapeHTML(revAvg.toFixed(1)) +
          ' out of 5 from ' +
          escapeHTML(revCount) +
          ' reviews">' +
          '<span class="product-card__rating-stars" aria-hidden="true">' +
          renderStarString(revAvg) +
          '</span>' +
          '<span>' +
          escapeHTML(revAvg.toFixed(1)) +
          '</span>' +
          '<span class="product-card__rating-count">(' +
          escapeHTML(revCount) +
          ')</span>' +
          '</div>'
        : '';

    const swatchesHtml = (product.colors || [])
      .map(function (c, sIdx) {
        const cName = escapeHTML(c.name);
        const cHex = escapeHTML(c.hex);
        return (
          '<button type="button" class="swatch-dot ' +
          (sIdx === 0 ? 'is-selected' : '') +
          '" style="background-color: ' +
          cHex +
          ';" title="' +
          cName +
          '" aria-label="Select ' +
          cName +
          '" data-card-swatch="' +
          cName +
          '"></button>'
        );
      })
      .join('');

    const quickAddButtonHtml = isSoldOut
      ? '<button type="button" class="product-card__quick-add is-disabled" disabled aria-disabled="true">' +
        '<span>Sold Out</span>' +
        '</button>'
      : '<button type="button" class="product-card__quick-add" data-quick-add="' +
        safeIdAttr +
        '">' +
        '<span>+ Quick Add</span>' +
        '</button>';

    return (
      '<article class="product-card reveal ' +
      delayClass +
      (isSoldOut ? ' is-sold-out' : '') +
      '" data-product-card="' +
      safeIdAttr +
      '" data-selected-color="' +
      safePrimaryColor +
      '">' +
      '<div class="product-card__media">' +
      (badgeLabel
        ? '<span class="product-card__badge ' +
          badgeClass +
          '">' +
          escapeHTML(badgeLabel) +
          '</span>'
        : '') +
      '<button type="button" class="product-card__wishlist ' +
      (wished ? 'is-active' : '') +
      '" data-wishlist-btn="' +
      safeIdAttr +
      '" aria-label="Save ' +
      safeName +
      ' to wishlist" aria-pressed="' +
      wished +
      '">' +
      '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.7">' +
      '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>' +
      '</svg>' +
      '</button>' +
      '<a href="product.html?id=' +
      encodedId +
      '" aria-label="View ' +
      safeName +
      '">' +
      '<img src="' +
      safePrimaryImg +
      '" alt="' +
      safeName +
      ' in ' +
      safePrimaryColor +
      '" class="product-card__img product-card__img--primary" loading="lazy">' +
      '<img src="' +
      safeSecondaryImg +
      '" alt="' +
      safeName +
      ' alternate studio view" class="product-card__img product-card__img--secondary" loading="lazy">' +
      '</a>' +
      quickAddButtonHtml +
      '</div>' +
      '<div class="product-card__body">' +
      '<div class="product-card__category">' +
      safeCat +
      ' &bull; <span data-card-color-label>' +
      safePrimaryColor +
      '</span></div>' +
      '<h3 class="product-card__title">' +
      '<a href="product.html?id=' +
      encodedId +
      '">' +
      safeName +
      '</a>' +
      '</h3>' +
      cardRatingHtml +
      '<div class="product-card__price-row">' +
      '<span class="product-card__price">' +
      formatPKR(product.price) +
      comparePriceHtml +
      '</span>' +
      '<div class="product-card__swatches" role="group" aria-label="Available colors">' +
      swatchesHtml +
      '</div>' +
      '</div>' +
      '</div>' +
      '</article>'
    );
  }

  // Global delegation for Product Card interactions (Quick Add, Wishlist Heart, Swatch Dot)
  document.addEventListener('click', function (e) {
    const wishBtn = e.target.closest('[data-wishlist-btn]');
    if (wishBtn) {
      e.preventDefault();
      const id = wishBtn.getAttribute('data-wishlist-btn');
      store.toggleWishlist(id);
      return;
    }

    const quickAddBtn = e.target.closest('[data-quick-add]');
    if (quickAddBtn) {
      e.preventDefault();
      if (quickAddBtn.disabled || quickAddBtn.classList.contains('is-disabled')) return;
      const id = quickAddBtn.getAttribute('data-quick-add');
      const card = quickAddBtn.closest('[data-product-card]');
      const color = card ? card.getAttribute('data-selected-color') : null;
      store.addToCart(id, color, 1, true);
      return;
    }

    const swatchBtn = e.target.closest('[data-card-swatch]');
    if (swatchBtn) {
      e.preventDefault();
      const colorName = swatchBtn.getAttribute('data-card-swatch');
      const card = swatchBtn.closest('[data-product-card]');
      if (card) {
        card.setAttribute('data-selected-color', colorName);
        card.querySelectorAll('[data-card-swatch]').forEach(function (b) {
          b.classList.remove('is-selected');
        });
        swatchBtn.classList.add('is-selected');
        const label = card.querySelector('[data-card-color-label]');
        if (label) label.textContent = colorName;
      }
    }
  });

  /* ==========================================================================
     3. HOME PAGE CONTROLLER
     ========================================================================== */
  function initHomePage() {
    const catGrid = document.getElementById('homeCategoriesGrid');
    const newArrivalsGrid = document.getElementById('newArrivalsGrid');
    const swatchesBar = document.getElementById('hueSwatchesBar');
    const huePreviewGrid = document.getElementById('huePreviewGrid');
    const hueDescription = document.getElementById('hueActiveDescription');
    const hueShopLink = document.getElementById('hueShopFilterLink');
    const bestsellersGrid = document.getElementById('bestsellersGrid');

    if (!catGrid && !newArrivalsGrid && !bestsellersGrid) return;

    let currentHueKey = 'Blush Pink';

    function renderHomeSections() {
      const products = getProducts();

      // 1. Featured Categories
      if (catGrid) {
        catGrid.innerHTML = categories
          .map(function (cat, idx) {
            return (
              '<a href="shop.html?category=' +
              encodeURIComponent(cat.id) +
              '" class="category-card reveal delay-' +
              ((idx % 5) + 1) +
              '">' +
              '<img src="' +
              escapeHTML(cat.image) +
              '" alt="' +
              escapeHTML(cat.name) +
              ' Collection" class="category-card__img" loading="lazy">' +
              '<div class="category-card__overlay">' +
              '<h3 class="category-card__title">' +
              escapeHTML(cat.name) +
              '</h3>' +
              '<span class="category-card__count">' +
              escapeHTML(cat.subtitle) +
              '</span>' +
              '</div>' +
              '</a>'
            );
          })
          .join('');
      }

      // 2. New Arrivals Grid (uses `is_new` flag)
      if (newArrivalsGrid) {
        let newItems = products.filter(function (p) {
          return Boolean(p.isNew || p.is_new);
        });
        if (newItems.length === 0) {
          newItems = products.slice(0, 4);
        }
        newArrivalsGrid.innerHTML = newItems
          .slice(0, 4)
          .map(function (p, idx) {
            return renderProductCard(p, idx);
          })
          .join('');
      }

      // 3. Shop by Color ("Carry Your Color" Swatch Explorer — prioritizes `is_featured`)
      if (swatchesBar && huePreviewGrid) {
        const renderHueSelection = function (selectedColorKey) {
          currentHueKey = selectedColorKey;
          const hueObj =
            colors.find(function (c) {
              return c.key === selectedColorKey;
            }) || colors[0];

          swatchesBar.querySelectorAll('[data-hue-select]').forEach(function (el) {
            el.classList.toggle(
              'is-active',
              el.getAttribute('data-hue-select') === hueObj.key
            );
          });

          if (hueDescription) {
            hueDescription.innerHTML =
              '<strong>' +
              escapeHTML(hueObj.name) +
              '</strong> &mdash; ' +
              escapeHTML(hueObj.poetic);
          }
          if (hueShopLink) {
            hueShopLink.href = 'shop.html?color=' + encodeURIComponent(hueObj.key);
            hueShopLink.textContent = 'Shop All ' + hueObj.name + ' Pieces';
          }

          const matchingProducts = products
            .filter(function (p) {
              return (p.colors || []).some(function (c) {
                return c.name.toLowerCase() === hueObj.key.toLowerCase();
              });
            })
            .sort(function (a, b) {
              return Number(Boolean(b.isFeatured)) - Number(Boolean(a.isFeatured));
            })
            .slice(0, 4);

          huePreviewGrid.innerHTML = matchingProducts
            .map(function (p, idx) {
              return renderProductCard(p, idx);
            })
            .join('');

          if (window.observeReveals) window.observeReveals();
        };

        if (!swatchesBar.hasAttribute('data-bound')) {
          swatchesBar.setAttribute('data-bound', 'true');
          swatchesBar.innerHTML = colors
            .map(function (c, i) {
              return (
                '<div class="hue-swatch-item ' +
                (i === 0 ? 'is-active' : '') +
                '" data-hue-select="' +
                escapeHTML(c.key) +
                '" role="button" tabindex="0" aria-label="Explore ' +
                escapeHTML(c.name) +
                ' bags">' +
                '<span class="hue-swatch-circle" style="background-color: ' +
                escapeHTML(c.hex) +
                '; border-color: ' +
                escapeHTML(c.borderHex) +
                ';"></span>' +
                '<span class="hue-swatch-label">' +
                escapeHTML(c.name) +
                '</span>' +
                '</div>'
              );
            })
            .join('');

          swatchesBar.addEventListener('click', function (e) {
            const item = e.target.closest('[data-hue-select]');
            if (item) {
              renderHueSelection(item.getAttribute('data-hue-select'));
            }
          });

          swatchesBar.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') {
              const item = e.target.closest('[data-hue-select]');
              if (item) {
                e.preventDefault();
                renderHueSelection(item.getAttribute('data-hue-select'));
              }
            }
          });
        }

        renderHueSelection(currentHueKey);
      }

      // 4. Bestsellers Grid (uses `is_bestseller` and `is_featured` flags)
      if (bestsellersGrid) {
        let bestItems = products.filter(function (p) {
          return Boolean(p.isBestseller || p.is_bestseller);
        });
        if (bestItems.length === 0) {
          bestItems = products.filter(function (p) {
            return Boolean(p.isFeatured || p.is_featured);
          });
        }
        if (bestItems.length === 0) {
          bestItems = products.slice(0, 4);
        }
        bestsellersGrid.innerHTML = bestItems
          .slice(0, 4)
          .map(function (p, idx) {
            return renderProductCard(p, idx);
          })
          .join('');
      }

      if (window.observeReveals) window.observeReveals();
    }

    async function renderHomepageTestimonials() {
      const testimonialsGrid = document.getElementById('homeTestimonialsGrid');
      if (
        !testimonialsGrid ||
        !window.HandleHueData ||
        typeof window.HandleHueData.getHomepageReviews !== 'function'
      ) {
        return;
      }

      try {
        const homeReviews = await window.HandleHueData.getHomepageReviews();
        if (!Array.isArray(homeReviews) || homeReviews.length === 0) {
          // Keep the existing static testimonials as fallback
          return;
        }

        testimonialsGrid.innerHTML = homeReviews
          .slice(0, 6)
          .map(function (r, idx) {
            const stars = renderStarString(r.rating || 5);
            const reviewerLabel = r.reviewer_city
              ? escapeHTML(r.reviewer_name) + ' &mdash; ' + escapeHTML(r.reviewer_city)
              : escapeHTML(r.reviewer_name);
            const prodSlug = r.product_slug || r.product_id || '';
            const prodName = r.product_name || 'Handle & Hue Piece';
            const prodLinkHtml = prodSlug
              ? '<a href="product.html?id=' +
                encodeURIComponent(prodSlug) +
                '" class="testimonial-product-link">' +
                escapeHTML(prodName) +
                '</a>'
              : escapeHTML(prodName);

            return (
              '<article class="testimonial-card reveal ' +
              (idx > 0 ? 'delay-' + ((idx % 3) + 1) : '') +
              '">' +
              '<div>' +
              '<div class="testimonial-stars" aria-label="' +
              escapeHTML(r.rating || 5) +
              ' out of 5 stars">' +
              stars +
              '</div>' +
              (r.title
                ? '<h3 style="font-family:var(--font-heading); font-size:1.18rem; font-weight:600; margin-bottom:0.4rem; color:var(--color-charcoal);">' +
                  escapeHTML(r.title) +
                  '</h3>'
                : '') +
              '<p class="testimonial-quote">&ldquo;' +
              escapeHTML(r.comment) +
              '&rdquo;</p>' +
              '</div>' +
              '<div class="testimonial-author">' +
              '<div>' +
              '<strong>' +
              reviewerLabel +
              '</strong>' +
              '<span>Verified Buyer &bull; ' +
              prodLinkHtml +
              '</span>' +
              '</div>' +
              '</div>' +
              '</article>'
            );
          })
          .join('');

        if (window.observeReveals) window.observeReveals();
      } catch (e) {
        // Keep static testimonials on any error
      }
    }

    // Show skeletons briefly if products are empty, then render immediately
    if (getProducts().length === 0) {
      if (newArrivalsGrid) newArrivalsGrid.innerHTML = renderSkeletonGrid(4);
      if (huePreviewGrid) huePreviewGrid.innerHTML = renderSkeletonGrid(4);
      if (bestsellersGrid) bestsellersGrid.innerHTML = renderSkeletonGrid(4);
    } else {
      renderHomeSections();
    }

    renderHomepageTestimonials();

    window.addEventListener('handlehue:data-loaded', function () {
      renderHomeSections();
      renderHomepageTestimonials();
    });

    // Newsletter Form
    const newsletterForm = document.getElementById('newsletterForm');
    if (newsletterForm) {
      newsletterForm.addEventListener('submit', function (e) {
        e.preventDefault();
        const emailInput = newsletterForm.querySelector('input[type="email"]');
        if (emailInput && emailInput.value.trim()) {
          store.showToast(
            'Welcome to Handle & Hue. Use code HUE10 for 10% off your first order.'
          );
          newsletterForm.reset();
        }
      });
    }
  }

  /* ==========================================================================
     4. SHOP PAGE CONTROLLER (Filters, Swatches, Price Slider in PKR, Sorting)
     ========================================================================== */
  function initShopPage() {
    const shopGrid = document.getElementById('shopProductsGrid');
    if (!shopGrid) return;

    function computeMaxCatalogPrice() {
      const prods = getProducts();
      const maxFound = prods.reduce(function (m, p) {
        return Math.max(m, Number(p.price) || 0);
      }, 18000);
      return Math.max(18000, Math.ceil(maxFound / 1000) * 1000);
    }

    let maxCatalogPrice = computeMaxCatalogPrice();
    const params = new URLSearchParams(window.location.search);
    const state = {
      category: params.get('category') || 'All',
      color: params.get('color') || 'All',
      maxPrice: parseInt(params.get('maxPrice'), 10) || maxCatalogPrice,
      search: params.get('search') || '',
      sort: params.get('sort') || 'featured'
    };

    const shopSidebar = document.getElementById('shopSidebar');
    const mobileFilterToggleBtn = document.getElementById('mobileFilterToggleBtn');
    const catContainer = document.getElementById('shopCategoryFilters');
    const colorContainer = document.getElementById('shopColorFilters');
    const priceSlider = document.getElementById('shopPriceSlider');
    const priceLabel = document.getElementById('shopPriceValue');
    const searchInput = document.getElementById('shopSearchInput');
    const sortSelect = document.getElementById('shopSortSelect');
    const countLabel = document.getElementById('shopResultsCount');
    const activeFiltersBar = document.getElementById('activeFiltersBar');
    const clearAllBtn = document.getElementById('clearAllFiltersBtn');

    if (mobileFilterToggleBtn && shopSidebar) {
      mobileFilterToggleBtn.addEventListener('click', function () {
        const isOpen = shopSidebar.classList.toggle('is-open');
        mobileFilterToggleBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        const labelSpan = mobileFilterToggleBtn.querySelector('[data-filter-toggle-label]');
        if (labelSpan) {
          labelSpan.textContent = isOpen ? 'Hide Filters & Refine' : 'Filter & Refine Pieces';
        }
      });
    }

    function renderFilterControls() {
      const products = getProducts();
      if (catContainer) {
        const knownCatIds = categories.map(function (c) {
          return c.id;
        });
        products.forEach(function (p) {
          if (p.category && !knownCatIds.includes(p.category)) {
            knownCatIds.push(p.category);
          }
        });
        const allCats = ['All'].concat(knownCatIds);
        catContainer.innerHTML = allCats
          .map(function (catName) {
            const count =
              catName === 'All'
                ? products.length
                : products.filter(function (p) {
                    return p.category === catName;
                  }).length;
            return (
              '<li>' +
              '<button type="button" class="filter-btn ' +
              (state.category === catName ? 'is-active' : '') +
              '" data-filter-cat="' +
              escapeHTML(catName) +
              '">' +
              '<span>' +
              escapeHTML(catName === 'All' ? 'All Silhouettes' : catName) +
              '</span>' +
              '<span style="font-size:0.75rem; opacity:0.7;">(' +
              count +
              ')</span>' +
              '</button>' +
              '</li>'
            );
          })
          .join('');
      }

      if (colorContainer) {
        colorContainer.innerHTML =
          '<button type="button" class="filter-swatch-btn ' +
          (state.color === 'All' ? 'is-active' : '') +
          '" data-filter-color="All">' +
          '<span class="filter-swatch-circle" style="background: conic-gradient(#F4D9D0, #FAF6F0, #C9A66B, #2B2B2B, #C5CEBE, #F4D9D0);"></span>' +
          '<span>All</span>' +
          '</button>' +
          colors
            .map(function (c) {
              return (
                '<button type="button" class="filter-swatch-btn ' +
                (state.color === c.key ? 'is-active' : '') +
                '" data-filter-color="' +
                escapeHTML(c.key) +
                '" title="' +
                escapeHTML(c.name) +
                '">' +
                '<span class="filter-swatch-circle" style="background-color: ' +
                escapeHTML(c.hex) +
                ';"></span>' +
                '<span>' +
                escapeHTML(c.name.split(' ')[0]) +
                '</span>' +
                '</button>'
              );
            })
            .join('');
      }

      if (priceSlider) {
        priceSlider.max = String(maxCatalogPrice);
        priceSlider.value = String(state.maxPrice);
      }
      if (priceLabel) {
        priceLabel.textContent = formatPKR(state.maxPrice);
      }
      if (searchInput) {
        searchInput.value = state.search;
      }
      if (sortSelect) {
        sortSelect.value = state.sort;
      }
    }

    function applyFiltersAndRender() {
      const products = getProducts();
      const filtered = products.filter(function (prod) {
        if (state.category !== 'All' && prod.category !== state.category) {
          return false;
        }
        if (
          state.color !== 'All' &&
          !(prod.colors || []).some(function (c) {
            return c.name.toLowerCase() === state.color.toLowerCase();
          })
        ) {
          return false;
        }
        if (prod.price > state.maxPrice) {
          return false;
        }
        if (state.search.trim() !== '') {
          const q = state.search.trim().toLowerCase();
          const match =
            prod.name.toLowerCase().includes(q) ||
            (prod.subtitle && prod.subtitle.toLowerCase().includes(q)) ||
            prod.category.toLowerCase().includes(q) ||
            prod.primaryColor.toLowerCase().includes(q);
          if (!match) return false;
        }
        return true;
      });

      // Sorting (Featured prioritizes `is_featured` and `sort_order`)
      if (state.sort === 'featured') {
        filtered.sort(function (a, b) {
          const featDiff = Number(Boolean(b.isFeatured)) - Number(Boolean(a.isFeatured));
          if (featDiff !== 0) return featDiff;
          return (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0);
        });
      } else if (state.sort === 'price-asc') {
        filtered.sort(function (a, b) {
          return a.price - b.price;
        });
      } else if (state.sort === 'price-desc') {
        filtered.sort(function (a, b) {
          return b.price - a.price;
        });
      } else if (state.sort === 'newest') {
        filtered.sort(function (a, b) {
          return Number(Boolean(b.isNew)) - Number(Boolean(a.isNew));
        });
      } else if (state.sort === 'name-asc') {
        filtered.sort(function (a, b) {
          return a.name.localeCompare(b.name);
        });
      }

      if (countLabel) {
        countLabel.textContent =
          'Showing ' + filtered.length + ' of ' + products.length + ' handcrafted pieces';
      }

      if (activeFiltersBar) {
        const chips = [];
        if (state.category !== 'All') {
          chips.push(
            '<button type="button" class="filter-chip" data-clear-filter="category">Category: ' +
              escapeHTML(state.category) +
              ' &times;</button>'
          );
        }
        if (state.color !== 'All') {
          chips.push(
            '<button type="button" class="filter-chip" data-clear-filter="color">Hue: ' +
              escapeHTML(state.color) +
              ' &times;</button>'
          );
        }
        if (state.maxPrice < maxCatalogPrice) {
          chips.push(
            '<button type="button" class="filter-chip" data-clear-filter="price">Up to ' +
              formatPKR(state.maxPrice) +
              ' &times;</button>'
          );
        }
        if (state.search.trim()) {
          chips.push(
            '<button type="button" class="filter-chip" data-clear-filter="search">Search: "' +
              escapeHTML(state.search) +
              '" &times;</button>'
          );
        }
        activeFiltersBar.innerHTML = chips.join('');
      }

      if (filtered.length === 0) {
        shopGrid.innerHTML =
          '<div style="grid-column: 1 / -1; text-align:center; padding: 4.5rem 1.5rem; background: var(--color-ivory-pure); border: var(--border-thin); border-radius: var(--radius-md);">' +
          '<h3 style="font-size:1.75rem; margin-bottom:0.65rem;">No pieces match your current selection</h3>' +
          '<p style="color:var(--color-charcoal-soft); margin-bottom:1.5rem;">Try broadening your price range or exploring another signature hue.</p>' +
          '<button type="button" class="btn btn-primary" id="emptyResetFiltersBtn">Reset All Filters</button>' +
          '</div>';
        const resetBtn = document.getElementById('emptyResetFiltersBtn');
        if (resetBtn) resetBtn.addEventListener('click', resetAllFilters);
        return;
      }

      shopGrid.innerHTML = filtered
        .map(function (p, idx) {
          return renderProductCard(p, idx);
        })
        .join('');

      if (window.observeReveals) window.observeReveals();
    }

    function resetAllFilters() {
      state.category = 'All';
      state.color = 'All';
      state.maxPrice = maxCatalogPrice;
      state.search = '';
      state.sort = 'featured';
      renderFilterControls();
      applyFiltersAndRender();
    }

    if (catContainer) {
      catContainer.addEventListener('click', function (e) {
        const btn = e.target.closest('[data-filter-cat]');
        if (btn) {
          state.category = btn.getAttribute('data-filter-cat');
          renderFilterControls();
          applyFiltersAndRender();
        }
      });
    }

    if (colorContainer) {
      colorContainer.addEventListener('click', function (e) {
        const btn = e.target.closest('[data-filter-color]');
        if (btn) {
          state.color = btn.getAttribute('data-filter-color');
          renderFilterControls();
          applyFiltersAndRender();
        }
      });
    }

    if (priceSlider) {
      priceSlider.addEventListener('input', function (e) {
        state.maxPrice = parseInt(e.target.value, 10);
        if (priceLabel) priceLabel.textContent = formatPKR(state.maxPrice);
        applyFiltersAndRender();
      });
    }

    if (searchInput) {
      searchInput.addEventListener('input', function (e) {
        state.search = e.target.value;
        applyFiltersAndRender();
      });
    }

    if (sortSelect) {
      sortSelect.addEventListener('change', function (e) {
        state.sort = e.target.value;
        applyFiltersAndRender();
      });
    }

    if (activeFiltersBar) {
      activeFiltersBar.addEventListener('click', function (e) {
        const chip = e.target.closest('[data-clear-filter]');
        if (!chip) return;
        const type = chip.getAttribute('data-clear-filter');
        if (type === 'category') state.category = 'All';
        if (type === 'color') state.color = 'All';
        if (type === 'price') state.maxPrice = maxCatalogPrice;
        if (type === 'search') state.search = '';
        renderFilterControls();
        applyFiltersAndRender();
      });
    }

    if (clearAllBtn) {
      clearAllBtn.addEventListener('click', resetAllFilters);
    }

    renderFilterControls();
    applyFiltersAndRender();

    window.addEventListener('handlehue:data-loaded', function () {
      const prevMax = maxCatalogPrice;
      maxCatalogPrice = computeMaxCatalogPrice();
      if (state.maxPrice === prevMax) {
        state.maxPrice = maxCatalogPrice;
      }
      renderFilterControls();
      applyFiltersAndRender();
    });
  }

  /* ==========================================================================
     5. PRODUCT DETAIL PAGE CONTROLLER (Gallery, Sold Out State, WhatsApp)
     ========================================================================== */
  function initProductDetailPage() {
    const pdpRoot = document.getElementById('pdpDetailContainer');
    if (!pdpRoot) return;

    function renderPDP() {
      const products = getProducts();
      const settings = getSettings();
      const params = new URLSearchParams(window.location.search);
      const requestedId = params.get('id') || 'aurelia-tote';
      const product =
        (window.HandleHueData && window.HandleHueData.findProduct(requestedId)) ||
        products.find(function (p) {
          return p.id === requestedId || p.slug === requestedId || p.uuid === requestedId;
        }) ||
        products[0];

      if (!product) return;

      document.title = product.name + ' | Handle & Hue — Carry your color';

      const isSoldOut = product.inStock === false || product.in_stock === false;
      let selectedColor = product.primaryColor;
      let quantity = 1;

      const bcCategory = document.getElementById('pdpBreadcrumbCategory');
      const bcName = document.getElementById('pdpBreadcrumbName');
      if (bcCategory) {
        bcCategory.textContent = product.category;
        bcCategory.href = 'shop.html?category=' + encodeURIComponent(product.category);
      }
      if (bcName) bcName.textContent = product.name;

      const rawList =
        Array.isArray(product.imageList) && product.imageList.length > 0
          ? product.imageList
          : [
              product.images.primary,
              product.images.secondary,
              product.images.detail,
              product.images.lifestyle
            ].filter(Boolean);

      const viewLabels = [
        'Studio Front View',
        'Three-Quarter Plinth View',
        'Hardware & Leather Detail',
        'Atelier Edition View'
      ];

      const galleryViews = rawList.map(function (src, idx) {
        return {
          src: src,
          label: viewLabels[idx] || product.name + ' View ' + (idx + 1)
        };
      });

      const wished = store.isInWishlist(product.id);
      const compareHtml = product.compareAtPrice
        ? '<span style="font-size:1.05rem; color:var(--color-charcoal-muted); text-decoration:line-through; margin-left:0.6rem; font-weight:300;">' +
          formatPKR(product.compareAtPrice) +
          '</span>'
        : '';

      const soldOutPillHtml = isSoldOut
        ? '<span class="product-card__badge product-card__badge--soldout" style="position:static; margin-left:0.65rem; vertical-align:middle;">Sold out</span>'
        : '';

      const thumbsHtml = galleryViews
        .map(function (v, idx) {
          return (
            '<button type="button" class="pdp-thumb-btn ' +
            (idx === 0 ? 'is-active' : '') +
            '" data-thumb-src="' +
            escapeHTML(v.src) +
            '" aria-label="' +
            escapeHTML(v.label) +
            '">' +
            '<img src="' +
            escapeHTML(v.src) +
            '" alt="' +
            escapeHTML(v.label) +
            '">' +
            '</button>'
          );
        })
        .join('');

      const swatchesHtml = (product.colors || [])
        .map(function (c, i) {
          return (
            '<button type="button" class="pdp-swatch-btn ' +
            (i === 0 ? 'is-active' : '') +
            '" style="background-color:' +
            escapeHTML(c.hex) +
            ';" data-pdp-color="' +
            escapeHTML(c.name) +
            '" title="' +
            escapeHTML(c.name) +
            '" aria-label="Select ' +
            escapeHTML(c.name) +
            '"></button>'
          );
        })
        .join('');

      const addCartBtnHtml = isSoldOut
        ? '<button type="button" class="btn btn-primary is-disabled" id="pdpAddToCartBtn" style="flex:1;" disabled aria-disabled="true">' +
          'Sold Out' +
          '</button>'
        : '<button type="button" class="btn btn-primary" id="pdpAddToCartBtn" style="flex:1;">' +
          'Add to Shopping Bag &mdash; ' +
          formatPKR(product.price) +
          '</button>';

      const buyWaBtnHtml = isSoldOut
        ? '<button type="button" class="btn btn-gold is-disabled" id="pdpBuyWhatsAppBtn" disabled aria-disabled="true">' +
          '<span>Sold Out &mdash; Unavailable on WhatsApp</span>' +
          '</button>'
        : '<button type="button" class="btn btn-gold" id="pdpBuyWhatsAppBtn">' +
          '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">' +
          '<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>' +
          '</svg>' +
          '<span>Buy on WhatsApp</span>' +
          '</button>';

      pdpRoot.innerHTML =
        '<div class="pdp-gallery">' +
        '<div class="pdp-thumbs" id="pdpThumbs">' +
        thumbsHtml +
        '</div>' +
        '<div class="pdp-main-stage" id="pdpZoomStage" title="Move cursor to inspect leather grain and hardware">' +
        '<img src="' +
        escapeHTML(product.images.primary) +
        '" alt="' +
        escapeHTML(product.name) +
        '" id="pdpMainImage">' +
        '<span class="pdp-zoom-hint">Hover to Magnify</span>' +
        '</div>' +
        '</div>' +
        '<div class="pdp-info">' +
        '<span class="eyebrow">' +
        escapeHTML(product.category) +
        ' &bull; SKU: ' +
        escapeHTML(product.sku) +
        soldOutPillHtml +
        '</span>' +
        '<h1 class="pdp-info__title">' +
        escapeHTML(product.name) +
        '</h1>' +
        '<p style="font-style:italic; font-family:var(--font-heading); font-size:1.2rem; color:var(--color-charcoal-soft); margin-bottom:1rem;">' +
        escapeHTML(product.subtitle) +
        '</p>' +
        '<div class="pdp-info__price-row">' +
        '<span class="pdp-info__price">' +
        formatPKR(product.price) +
        compareHtml +
        '</span>' +
        '<span id="pdpHeaderRatingSlot">' +
        (Number(product.reviewsCount) > 0 && Number(product.rating) > 0
          ? '<a href="#pdpReviewsSection" class="pdp-info__rating">' +
            renderStarString(product.rating) +
            ' ' +
            escapeHTML(Number(product.rating).toFixed(1)) +
            ' (' +
            escapeHTML(product.reviewsCount) +
            ' ' +
            (Number(product.reviewsCount) === 1 ? 'Review' : 'Reviews') +
            ')</a>'
          : '') +
        '</span>' +
        '</div>' +
        '<p class="pdp-info__desc">' +
        escapeHTML(product.description) +
        '</p>' +
        '<div class="pdp-option-block">' +
        '<label class="pdp-option-label">Selected Hue: <span id="pdpSelectedColorName">' +
        escapeHTML(selectedColor) +
        '</span></label>' +
        '<div class="pdp-swatches" id="pdpSwatches">' +
        swatchesHtml +
        '</div>' +
        '</div>' +
        '<div class="pdp-dimensions-card">' +
        '<div class="pdp-dim-item">' +
        '<span>Dimensions</span>' +
        '<strong>' +
        escapeHTML((product.dimensions || '').split('(')[0].trim()) +
        '</strong>' +
        '</div>' +
        '<div class="pdp-dim-item">' +
        '<span>Strap Drop</span>' +
        '<strong>' +
        escapeHTML((product.strapDrop || '').split('|')[0].trim()) +
        '</strong>' +
        '</div>' +
        '<div class="pdp-dim-item">' +
        '<span>Availability</span>' +
        '<strong>' +
        (isSoldOut ? 'Sold Out' : 'In Stock') +
        '</strong>' +
        '</div>' +
        '</div>' +
        '<div class="pdp-actions-row">' +
        '<div class="qty-selector" aria-label="Quantity">' +
        '<button type="button" id="pdpQtyMinus" aria-label="Decrease quantity" ' +
        (isSoldOut ? 'disabled' : '') +
        '>&minus;</button>' +
        '<input type="text" id="pdpQtyInput" value="1" readonly aria-label="Quantity">' +
        '<button type="button" id="pdpQtyPlus" aria-label="Increase quantity" ' +
        (isSoldOut ? 'disabled' : '') +
        '>+</button>' +
        '</div>' +
        addCartBtnHtml +
        '<button type="button" class="btn btn-outline ' +
        (wished ? 'is-active' : '') +
        '" id="pdpWishlistBtn" data-wishlist-btn="' +
        escapeHTML(product.id) +
        '" aria-label="Add to Wishlist" style="padding:0.85rem 1.15rem;">' +
        '<svg viewBox="0 0 24 24" width="18" height="18" fill="' +
        (wished ? 'currentColor' : 'none') +
        '" stroke="currentColor" stroke-width="1.7">' +
        '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>' +
        '</svg>' +
        '</button>' +
        '</div>' +
        '<div class="pdp-whatsapp-row">' +
        buyWaBtnHtml +
        '</div>' +
        '<div class="pdp-accordions">' +
        '<div class="accordion-item is-open">' +
        '<button type="button" class="accordion-trigger">' +
        '<span>Materials &amp; Craftsmanship</span>' +
        '<span>&plus;</span>' +
        '</button>' +
        '<div class="accordion-content">' +
        '<p>' +
        escapeHTML(product.materials) +
        '</p>' +
        '<p style="margin-top:0.5rem;"><strong>Interior Capacity:</strong> ' +
        escapeHTML(product.capacity) +
        '.</p>' +
        '</div>' +
        '</div>' +
        '<div class="accordion-item">' +
        '<button type="button" class="accordion-trigger">' +
        '<span>Size, Strap &amp; Fit Specifications</span>' +
        '<span>&plus;</span>' +
        '</button>' +
        '<div class="accordion-content">' +
        '<p>Full Measurements: ' +
        escapeHTML(product.dimensions) +
        '<br>Strap Configuration: ' +
        escapeHTML(product.strapDrop) +
        '<br>Unladen Weight: ' +
        escapeHTML(product.weight) +
        '</p>' +
        '</div>' +
        '</div>' +
        '<div class="accordion-item">' +
        '<button type="button" class="accordion-trigger">' +
        '<span>Nationwide Delivery Across Pakistan &amp; Easy Exchange</span>' +
        '<span>&plus;</span>' +
        '</button>' +
        '<div class="accordion-content">' +
        '<p>Nationwide delivery across Pakistan in 3 to 5 working days. Enjoy free delivery on orders of ' +
        formatPKR(settings.free_shipping_threshold) +
        ' or above (flat ' +
        formatPKR(settings.shipping_fee) +
        ' nationwide shipping fee below ' +
        formatPKR(settings.free_shipping_threshold) +
        '). Cash on Delivery, Bank Transfer, JazzCash, and Easypaisa are available, backed by our hassle-free 14-day easy exchange policy.</p>' +
        '</div>' +
        '</div>' +
        '</div>' +
        '</div>';

      // Bind Gallery Thumbnails & Interactive Hover Zoom (Desktop Pointer Only)
      const mainImg = document.getElementById('pdpMainImage');
      const zoomStage = document.getElementById('pdpZoomStage');
      const thumbsContainer = document.getElementById('pdpThumbs');

      if (thumbsContainer && mainImg) {
        thumbsContainer.addEventListener('click', function (e) {
          const btn = e.target.closest('[data-thumb-src]');
          if (!btn) return;
          mainImg.src = btn.getAttribute('data-thumb-src');
          thumbsContainer
            .querySelectorAll('.pdp-thumb-btn')
            .forEach(function (b) {
              b.classList.remove('is-active');
            });
          btn.classList.add('is-active');
        });
      }

      const isTouchDevice =
        window.matchMedia('(hover: none), (pointer: coarse)').matches ||
        'ontouchstart' in window;

      if (zoomStage && mainImg && !isTouchDevice) {
        zoomStage.addEventListener('mousemove', function (e) {
          const rect = zoomStage.getBoundingClientRect();
          const x = ((e.clientX - rect.left) / rect.width) * 100;
          const y = ((e.clientY - rect.top) / rect.height) * 100;
          mainImg.style.transformOrigin = x + '% ' + y + '%';
          mainImg.style.transform = 'scale(1.65)';
        });
        zoomStage.addEventListener('mouseleave', function () {
          mainImg.style.transform = 'scale(1)';
          mainImg.style.transformOrigin = 'center center';
        });
      }

      // Bind Color Swatches
      const swatchesContainer = document.getElementById('pdpSwatches');
      const colorNameSpan = document.getElementById('pdpSelectedColorName');
      if (swatchesContainer) {
        swatchesContainer.addEventListener('click', function (e) {
          const btn = e.target.closest('[data-pdp-color]');
          if (!btn) return;
          selectedColor = btn.getAttribute('data-pdp-color');
          if (colorNameSpan) colorNameSpan.textContent = selectedColor;
          swatchesContainer
            .querySelectorAll('.pdp-swatch-btn')
            .forEach(function (b) {
              b.classList.remove('is-active');
            });
          btn.classList.add('is-active');
        });
      }

      // Bind Quantity, Add to Cart & Buy on WhatsApp
      const qtyInput = document.getElementById('pdpQtyInput');
      const minusBtn = document.getElementById('pdpQtyMinus');
      const plusBtn = document.getElementById('pdpQtyPlus');
      const addBtn = document.getElementById('pdpAddToCartBtn');
      const buyWhatsAppBtn = document.getElementById('pdpBuyWhatsAppBtn');

      if (!isSoldOut && minusBtn && plusBtn && qtyInput) {
        minusBtn.addEventListener('click', function () {
          if (quantity > 1) {
            quantity--;
            qtyInput.value = quantity;
            if (addBtn) {
              addBtn.innerHTML =
                'Add to Shopping Bag &mdash; ' + formatPKR(product.price * quantity);
            }
          }
        });
        plusBtn.addEventListener('click', function () {
          quantity++;
          qtyInput.value = quantity;
          if (addBtn) {
            addBtn.innerHTML =
              'Add to Shopping Bag &mdash; ' + formatPKR(product.price * quantity);
          }
        });
      }

      if (addBtn && !isSoldOut) {
        addBtn.addEventListener('click', function () {
          store.addToCart(product.id, selectedColor, quantity, true);
        });
      }

      if (buyWhatsAppBtn && !isSoldOut) {
        buyWhatsAppBtn.addEventListener('click', function () {
          const linePrice = formatPKR(product.price * quantity);
          const pageUrl = window.location.href;
          const messageLines = [
            'Hi Handle & Hue, I would like to buy this bag:',
            '',
            'Product: ' + product.name,
            'Selected Hue: ' + selectedColor,
            'Quantity: ' + quantity,
            'Price: ' +
              linePrice +
              (quantity > 1 ? ' (' + formatPKR(product.price) + ' each)' : ''),
            'Product Link: ' + pageUrl
          ];
          const waUrl = buildWhatsAppUrl(messageLines.join('\n'));
          window.open(waUrl, '_blank', 'noopener,noreferrer');
        });
      }

      // Bind Accordions
      pdpRoot.querySelectorAll('.accordion-trigger').forEach(function (trigger) {
        trigger.addEventListener('click', function () {
          const item = trigger.closest('.accordion-item');
          if (item) item.classList.toggle('is-open');
        });
      });

      // Populate "You May Also Like" Related Products
      const relatedGrid = document.getElementById('relatedProductsGrid');
      if (relatedGrid) {
        const related = products
          .filter(function (p) {
            return p.id !== product.id;
          })
          .sort(function (a, b) {
            return (
              Number(b.category === product.category) -
              Number(a.category === product.category)
            );
          })
          .slice(0, 4);
        relatedGrid.innerHTML = related
          .map(function (p, idx) {
            return renderProductCard(p, idx);
          })
          .join('');
      }

      initProductReviewsSection(product);

      if (window.observeReveals) window.observeReveals();
    }

    function updateProductJsonLd(product, avgRating, reviewCount) {
      const existingScript = document.getElementById('pdpProductJsonLd');
      const count = Number(reviewCount) || 0;
      const avg = Number(avgRating) || 0;

      // Inject Product with aggregateRating ONLY when approved reviews exist
      if (count <= 0 || avg <= 0) {
        if (existingScript && existingScript.parentNode) {
          existingScript.parentNode.removeChild(existingScript);
        }
        return;
      }

      const isSoldOut = product.inStock === false || product.in_stock === false;
      const schemaObj = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.name,
        description: product.description,
        sku: product.sku || product.id,
        image: [product.images && product.images.primary ? product.images.primary : ''],
        brand: {
          '@type': 'Brand',
          name: 'Handle & Hue'
        },
        offers: {
          '@type': 'Offer',
          priceCurrency: 'PKR',
          price: String(product.price || 0),
          availability: isSoldOut
            ? 'https://schema.org/OutOfStock'
            : 'https://schema.org/InStock',
          url: window.location.href
        },
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: avg.toFixed(1),
          reviewCount: String(count),
          bestRating: '5',
          worstRating: '1'
        }
      };

      let scriptEl = existingScript;
      if (!scriptEl) {
        scriptEl = document.createElement('script');
        scriptEl.type = 'application/ld+json';
        scriptEl.id = 'pdpProductJsonLd';
        document.head.appendChild(scriptEl);
      }
      scriptEl.textContent = JSON.stringify(schemaObj);
    }

    let boundReviewsProductId = null;

    function initProductReviewsSection(product) {
      const reviewsContainer = document.getElementById('pdpReviewsContainer');
      const reviewsSection = document.getElementById('pdpReviewsSection');
      if (!reviewsContainer || !product) return;

      const REVIEW_COOLDOWN_KEY = 'handle_hue_last_review_ts';
      const VISIBLE_STEP = 5;
      let approvedReviews = [];
      let visibleCount = VISIBLE_STEP;

      // Render shell once per product so typing in the form isn't interrupted
      if (boundReviewsProductId !== product.id || !document.getElementById('pdpReviewForm')) {
        boundReviewsProductId = product.id;

        reviewsContainer.innerHTML =
          '<div class="reviews-layout">' +
          '<div class="reviews-left-col">' +
          '<div class="reviews-summary-card" id="pdpReviewsSummaryBox">' +
          '<!-- Populated by renderSummaryAndBreakdown -->' +
          '</div>' +
          '<div class="review-write-card">' +
          '<h3 class="review-write-title">Write a Review</h3>' +
          '<p class="review-write-subtitle">Share your experience with ' +
          escapeHTML(product.name) +
          '. No email or phone number required.</p>' +
          '<div id="reviewFormFeedback" class="review-form-msg" role="alert" hidden></div>' +
          '<form id="pdpReviewForm" novalidate>' +
          '<div class="hp-trap" aria-hidden="true">' +
          '<label for="reviewWebsiteTrap">Website</label>' +
          '<input type="text" id="reviewWebsiteTrap" name="website" tabindex="-1" autocomplete="off">' +
          '</div>' +
          '<div class="form-field">' +
          '<label id="starPickerLabel">Your Rating *</label>' +
          '<div class="star-picker" id="reviewStarPicker" role="radiogroup" aria-labelledby="starPickerLabel">' +
          '<button type="button" class="star-picker-btn" data-star-value="1" aria-label="1 out of 5 stars" aria-pressed="false">&#9733;</button>' +
          '<button type="button" class="star-picker-btn" data-star-value="2" aria-label="2 out of 5 stars" aria-pressed="false">&#9733;</button>' +
          '<button type="button" class="star-picker-btn" data-star-value="3" aria-label="3 out of 5 stars" aria-pressed="false">&#9733;</button>' +
          '<button type="button" class="star-picker-btn" data-star-value="4" aria-label="4 out of 5 stars" aria-pressed="false">&#9733;</button>' +
          '<button type="button" class="star-picker-btn" data-star-value="5" aria-label="5 out of 5 stars" aria-pressed="false">&#9733;</button>' +
          '<span class="star-picker-caption" id="reviewStarCaption">Select stars</span>' +
          '</div>' +
          '<input type="hidden" id="reviewRatingValue" name="rating" value="0">' +
          '</div>' +
          '<div class="form-grid">' +
          '<div class="form-field">' +
          '<div class="field-label-row">' +
          '<label for="reviewNameInput">Your Name *</label>' +
          '<span class="char-counter" id="reviewNameCounter">0 / 60</span>' +
          '</div>' +
          '<input type="text" id="reviewNameInput" class="form-input" placeholder="e.g. Ayesha Khan" minlength="2" maxlength="60" required>' +
          '</div>' +
          '<div class="form-field">' +
          '<div class="field-label-row">' +
          '<label for="reviewCityInput">City (Optional)</label>' +
          '<span class="char-counter" id="reviewCityCounter">0 / 60</span>' +
          '</div>' +
          '<input type="text" id="reviewCityInput" class="form-input" placeholder="e.g. Lahore, Karachi" maxlength="60">' +
          '</div>' +
          '</div>' +
          '<div class="form-field">' +
          '<div class="field-label-row">' +
          '<label for="reviewTitleInput">Review Title (Optional)</label>' +
          '<span class="char-counter" id="reviewTitleCounter">0 / 100</span>' +
          '</div>' +
          '<input type="text" id="reviewTitleInput" class="form-input" placeholder="e.g. Sculptural silhouette &amp; silky leather" maxlength="100">' +
          '</div>' +
          '<div class="form-field">' +
          '<div class="field-label-row">' +
          '<label for="reviewCommentInput">Your Review *</label>' +
          '<span class="char-counter" id="reviewCommentCounter">0 / 1000</span>' +
          '</div>' +
          '<textarea id="reviewCommentInput" class="form-input" rows="4" placeholder="Tell us about the leather, hardware, colour, and how you style it (10 to 1,000 characters)..." minlength="10" maxlength="1000" required></textarea>' +
          '</div>' +
          '<button type="submit" class="btn btn-primary" id="reviewSubmitBtn" style="width:100%;">Submit Review</button>' +
          '</form>' +
          '</div>' +
          '</div>' +
          '<div class="reviews-right-col">' +
          '<div id="pdpApprovedReviewsList" class="reviews-list">' +
          '<!-- Populated by renderReviewsList -->' +
          '</div>' +
          '<div id="pdpLoadMoreWrap" class="reviews-load-more-wrap" hidden>' +
          '<button type="button" class="btn btn-outline" id="pdpLoadMoreReviewsBtn">Load More Reviews</button>' +
          '</div>' +
          '</div>' +
          '</div>';

        bindReviewFormEvents(product);
      }

      function renderSummaryAndBreakdown(list) {
        const summaryBox = document.getElementById('pdpReviewsSummaryBox');
        if (!summaryBox) return;

        const total = list.length;
        const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        let sum = 0;

        list.forEach(function (r) {
          const rt = Math.max(1, Math.min(5, Math.round(Number(r.rating) || 5)));
          counts[rt] = (counts[rt] || 0) + 1;
          sum += rt;
        });

        const avg = total > 0 ? Number((sum / total).toFixed(1)) : 0;

        // Update header rating slot & JSON-LD only when approved reviews exist
        const headerSlot = document.getElementById('pdpHeaderRatingSlot');
        if (headerSlot) {
          headerSlot.innerHTML =
            total > 0 && avg > 0
              ? '<a href="#pdpReviewsSection" class="pdp-info__rating">' +
                renderStarString(avg) +
                ' ' +
                escapeHTML(avg.toFixed(1)) +
                ' (' +
                escapeHTML(total) +
                ' ' +
                (total === 1 ? 'Review' : 'Reviews') +
                ')</a>'
              : '';
        }
        updateProductJsonLd(product, avg, total);

        const barsHtml = [5, 4, 3, 2, 1]
          .map(function (star) {
            const c = counts[star] || 0;
            const pct = total > 0 ? Math.round((c / total) * 100) : 0;
            return (
              '<div class="rating-bar-row">' +
              '<span class="rating-bar-label">' +
              star +
              ' &#9733;</span>' +
              '<div class="rating-bar-track" aria-hidden="true">' +
              '<div class="rating-bar-fill" style="width:' +
              pct +
              '%;"></div>' +
              '</div>' +
              '<span class="rating-bar-count">' +
              c +
              '</span>' +
              '</div>'
            );
          })
          .join('');

        summaryBox.innerHTML =
          '<div class="reviews-summary-top">' +
          '<div class="reviews-avg-number">' +
          (total > 0 ? escapeHTML(avg.toFixed(1)) : '&mdash;') +
          '</div>' +
          '<div>' +
          '<div class="reviews-avg-stars" aria-label="' +
          (total > 0 ? escapeHTML(avg.toFixed(1)) + ' out of 5 stars' : 'No ratings yet') +
          '">' +
          (total > 0 ? renderStarString(avg) : '&#9734;&#9734;&#9734;&#9734;&#9734;') +
          '</div>' +
          '<div class="reviews-avg-count">' +
          (total > 0
            ? 'Based on ' + escapeHTML(total) + ' Approved ' + (total === 1 ? 'Review' : 'Reviews')
            : 'No approved reviews yet') +
          '</div>' +
          '</div>' +
          '</div>' +
          '<div class="rating-breakdown" aria-label="Rating breakdown by star level">' +
          barsHtml +
          '</div>';
      }

      function renderReviewsList() {
        const listEl = document.getElementById('pdpApprovedReviewsList');
        const loadMoreWrap = document.getElementById('pdpLoadMoreWrap');
        const loadMoreBtn = document.getElementById('pdpLoadMoreReviewsBtn');
        if (!listEl) return;

        if (approvedReviews.length === 0) {
          listEl.innerHTML =
            '<div class="reviews-empty-state">' +
            '<h3 style="font-family:var(--font-heading); font-size:1.55rem; margin-bottom:0.45rem;">Be the First to Review This Piece</h3>' +
            '<p style="color:var(--color-charcoal-soft); font-size:0.9rem; max-width:440px; margin:0 auto;">' +
            'We welcome your impressions of ' +
            escapeHTML(product.name) +
            '. Every review is moderated by our atelier team before publication.' +
            '</p>' +
            '</div>';
          if (loadMoreWrap) loadMoreWrap.hidden = true;
          return;
        }

        const visibleItems = approvedReviews.slice(0, visibleCount);
        listEl.innerHTML = visibleItems
          .map(function (r) {
            const stars = renderStarString(r.rating || 5);
            const dateStr = formatReviewDate(r.created_at);
            const authorLocation = r.reviewer_city
              ? escapeHTML(r.reviewer_name) + ' &bull; ' + escapeHTML(r.reviewer_city)
              : escapeHTML(r.reviewer_name);

            return (
              '<article class="review-item">' +
              '<div class="review-item__header">' +
              '<span class="review-item__stars" aria-label="Rated ' +
              escapeHTML(r.rating || 5) +
              ' out of 5 stars">' +
              stars +
              '</span>' +
              (dateStr ? '<span class="review-item__date">' + escapeHTML(dateStr) + '</span>' : '') +
              '</div>' +
              (r.title
                ? '<h4 class="review-item__title">' + escapeHTML(r.title) + '</h4>'
                : '') +
              '<p class="review-item__comment">' +
              escapeHTML(r.comment) +
              '</p>' +
              '<div class="review-item__author">' +
              '<strong>' +
              authorLocation +
              '</strong>' +
              '<span class="review-item__verified">Verified Atelier Review</span>' +
              '</div>' +
              '</article>'
            );
          })
          .join('');

        if (loadMoreWrap && loadMoreBtn) {
          const remaining = approvedReviews.length - visibleCount;
          if (remaining > 0) {
            loadMoreWrap.hidden = false;
            loadMoreBtn.textContent = 'Load More Reviews (' + remaining + ' more)';
          } else {
            loadMoreWrap.hidden = true;
          }
        }
      }

      const loadMoreBtn = document.getElementById('pdpLoadMoreReviewsBtn');
      if (loadMoreBtn) {
        loadMoreBtn.onclick = function () {
          visibleCount += VISIBLE_STEP;
          renderReviewsList();
        };
      }

      function bindReviewFormEvents(currentProduct) {
        const form = document.getElementById('pdpReviewForm');
        const starPicker = document.getElementById('reviewStarPicker');
        const starCaption = document.getElementById('reviewStarCaption');
        const ratingInput = document.getElementById('reviewRatingValue');
        const nameInput = document.getElementById('reviewNameInput');
        const cityInput = document.getElementById('reviewCityInput');
        const titleInput = document.getElementById('reviewTitleInput');
        const commentInput = document.getElementById('reviewCommentInput');
        const nameCounter = document.getElementById('reviewNameCounter');
        const cityCounter = document.getElementById('reviewCityCounter');
        const titleCounter = document.getElementById('reviewTitleCounter');
        const commentCounter = document.getElementById('reviewCommentCounter');
        const honeypotInput = document.getElementById('reviewWebsiteTrap');
        const feedbackEl = document.getElementById('reviewFormFeedback');
        const submitBtn = document.getElementById('reviewSubmitBtn');

        if (!form) return;

        let formLoadedAt = Date.now();
        let selectedRating = 0;
        const ratingCaptions = {
          1: '1 Star — Poor',
          2: '2 Stars — Fair',
          3: '3 Stars — Good',
          4: '4 Stars — Very Good',
          5: '5 Stars — Exquisite'
        };

        function setFeedback(message, type) {
          if (!feedbackEl) return;
          if (!message) {
            feedbackEl.hidden = true;
            feedbackEl.textContent = '';
            feedbackEl.className = 'review-form-msg';
            return;
          }
          feedbackEl.hidden = false;
          feedbackEl.className =
            'review-form-msg ' +
            (type === 'success' ? 'review-form-msg--success' : 'review-form-msg--error');
          feedbackEl.textContent = message;
        }

        function updateStarsUI(val) {
          if (!starPicker) return;
          starPicker.querySelectorAll('.star-picker-btn').forEach(function (btn) {
            const bVal = parseInt(btn.getAttribute('data-star-value'), 10);
            const lit = bVal <= val;
            btn.classList.toggle('is-Lit', lit);
            btn.setAttribute('aria-pressed', bVal === val ? 'true' : 'false');
          });
          if (starCaption) {
            starCaption.textContent = ratingCaptions[val] || 'Select stars';
          }
          if (ratingInput) {
            ratingInput.value = String(val);
          }
        }

        if (starPicker) {
          starPicker.addEventListener('click', function (e) {
            const btn = e.target.closest('[data-star-value]');
            if (!btn) return;
            selectedRating = parseInt(btn.getAttribute('data-star-value'), 10) || 0;
            updateStarsUI(selectedRating);
            setFeedback('', '');
          });
        }

        function bindCounter(inputEl, counterEl, maxLen) {
          if (!inputEl || !counterEl) return;
          const update = function () {
            counterEl.textContent = inputEl.value.length + ' / ' + maxLen;
          };
          inputEl.addEventListener('input', update);
          update();
        }

        bindCounter(nameInput, nameCounter, 60);
        bindCounter(cityInput, cityCounter, 60);
        bindCounter(titleInput, titleCounter, 100);
        bindCounter(commentInput, commentCounter, 1000);

        function resetReviewForm() {
          form.reset();
          selectedRating = 0;
          updateStarsUI(0);
          if (nameCounter) nameCounter.textContent = '0 / 60';
          if (cityCounter) cityCounter.textContent = '0 / 60';
          if (titleCounter) titleCounter.textContent = '0 / 100';
          if (commentCounter) commentCounter.textContent = '0 / 1000';
          formLoadedAt = Date.now();
        }

        form.addEventListener('submit', async function (e) {
          e.preventDefault();
          setFeedback('', '');

          // 1. Honeypot check: reject silently if filled
          if (honeypotInput && honeypotInput.value.trim() !== '') {
            resetReviewForm();
            setFeedback(
              'Thank you! Your review will appear once our team approves it.',
              'success'
            );
            return;
          }

          // 2. Field trimming & validation
          const nameVal = nameInput ? nameInput.value.trim() : '';
          const cityVal = cityInput ? cityInput.value.trim() : '';
          const titleVal = titleInput ? titleInput.value.trim() : '';
          const commentVal = commentInput ? commentInput.value.trim() : '';

          if (!Number.isInteger(selectedRating) || selectedRating < 1 || selectedRating > 5) {
            setFeedback('Please select a star rating between 1 and 5.', 'error');
            return;
          }
          if (nameVal.length < 2 || nameVal.length > 60) {
            setFeedback('Please enter your name (between 2 and 60 characters).', 'error');
            if (nameInput) nameInput.focus();
            return;
          }
          if (cityVal.length > 60) {
            setFeedback('City name must be 60 characters or fewer.', 'error');
            if (cityInput) cityInput.focus();
            return;
          }
          if (titleVal.length > 100) {
            setFeedback('Review title must be 100 characters or fewer.', 'error');
            if (titleInput) titleInput.focus();
            return;
          }
          if (commentVal.length < 10 || commentVal.length > 1000) {
            setFeedback(
              'Please write a review comment between 10 and 1,000 characters.',
              'error'
            );
            if (commentInput) commentInput.focus();
            return;
          }

          // 3. Minimum 3-second time-on-form check
          if (Date.now() - formLoadedAt < 3000) {
            setFeedback(
              'Please take a moment to review your entry before submitting.',
              'error'
            );
            return;
          }

          // 4. 60-second cooldown between submissions stored in localStorage
          try {
            const lastSubmittedTs = Number(localStorage.getItem(REVIEW_COOLDOWN_KEY) || 0);
            if (lastSubmittedTs && Date.now() - lastSubmittedTs < 60000) {
              const waitSec = Math.ceil((60000 - (Date.now() - lastSubmittedTs)) / 1000);
              setFeedback(
                'Please wait ' + waitSec + ' seconds before submitting another review.',
                'error'
              );
              return;
            }
          } catch (err) {
            // Ignore storage access errors
          }

          if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Submitting Review...';
          }

          try {
            const res =
              window.HandleHueData && typeof window.HandleHueData.submitReview === 'function'
                ? await window.HandleHueData.submitReview({
                    product_id: currentProduct.uuid || currentProduct.id,
                    reviewer_name: nameVal,
                    reviewer_city: cityVal,
                    rating: selectedRating,
                    title: titleVal,
                    comment: commentVal
                  })
                : { ok: false, error: 'Review service is unavailable.' };

            if (!res || !res.ok) {
              setFeedback(
                (res && res.error) || 'Could not submit your review. Please try again.',
                'error'
              );
              return;
            }

            try {
              localStorage.setItem(REVIEW_COOLDOWN_KEY, String(Date.now()));
            } catch (err) {
              // Ignore localStorage write errors
            }

            resetReviewForm();
            setFeedback(
              'Thank you! Your review will appear once our team approves it.',
              'success'
            );
            store.showToast('Thank you! Your review will appear once our team approves it.');
          } finally {
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.textContent = 'Submit Review';
            }
          }
        });
      }

      // Render initial empty summary/list immediately, then fetch approved reviews
      renderSummaryAndBreakdown([]);
      renderReviewsList();

      if (window.HandleHueData && typeof window.HandleHueData.getApprovedReviews === 'function') {
        window.HandleHueData
          .getApprovedReviews(product.uuid || product.id)
          .then(function (items) {
            approvedReviews = Array.isArray(items) ? items : [];
            visibleCount = VISIBLE_STEP;
            renderSummaryAndBreakdown(approvedReviews);
            renderReviewsList();
          })
          .catch(function () {
            if (reviewsSection) {
              renderSummaryAndBreakdown([]);
              renderReviewsList();
            }
          });
      }
    }

    renderPDP();
    window.addEventListener('handlehue:data-loaded', renderPDP);
  }

  /* ==========================================================================
     6. CART & CHECKOUT PAGE CONTROLLER (WhatsApp Checkout & Dynamic Settings)
     ========================================================================== */
  function initCartPage() {
    const cartItemsContainer = document.getElementById('cartPageItems');
    if (!cartItemsContainer) return;

    let discountRate = 0;
    let activePromoCode = '';

    const shippingMeterText = document.getElementById('shippingMeterText');
    const shippingMeterFill = document.getElementById('shippingMeterFill');
    const summarySubtotal = document.getElementById('summarySubtotal');
    const summaryDiscountRow = document.getElementById('summaryDiscountRow');
    const summaryDiscount = document.getElementById('summaryDiscount');
    const summaryShipping = document.getElementById('summaryShipping');
    const summaryTotal = document.getElementById('summaryTotal');
    const promoForm = document.getElementById('promoCodeForm');
    const promoInput = document.getElementById('promoCodeInput');
    const checkoutForm = document.getElementById('checkoutForm');
    const whatsappOrderBtn = document.getElementById('whatsappOrderBtn');
    const paymentSelect = document.getElementById('checkoutPayment');
    const paymentNoteEl = document.getElementById('checkoutPaymentNote');
    const orderSuccessBox = document.getElementById('orderConfirmationBox');

    function getShippingValues() {
      const settings = getSettings();
      return {
        freeThreshold: Number(settings.free_shipping_threshold) || 10000,
        flatFee:
          settings.shipping_fee !== undefined ? Number(settings.shipping_fee) : 250,
        waDisplay: settings.whatsapp_display || '+92 346 9377256'
      };
    }

    function updatePaymentNoteText() {
      if (!paymentSelect || !paymentNoteEl) return;
      const cfg = getShippingValues();
      const paymentNotes = {
        cod:
          'Pay in cash (PKR) at your doorstep when our courier delivers your parcel anywhere in Pakistan. You will be contacted on WhatsApp (' +
          cfg.waDisplay +
          ') to confirm your order before dispatch.',
        bank:
          'You have selected Bank Transfer. Once you submit your order, our concierge team (' +
          cfg.waDisplay +
          ') will share our bank account details on WhatsApp to confirm your order.',
        jazzcash:
          'You have selected JazzCash. Once you submit your order, our concierge team (' +
          cfg.waDisplay +
          ') will share our JazzCash details on WhatsApp to confirm your order.',
        easypaisa:
          'You have selected Easypaisa. Once you submit your order, our concierge team (' +
          cfg.waDisplay +
          ') will share our Easypaisa details on WhatsApp to confirm your order.'
      };
      paymentNoteEl.textContent =
        paymentNotes[paymentSelect.value] || paymentNotes.cod;
    }

    function renderCartPage() {
      const cart = store.getCart();
      const subtotal = store.getCartSubtotal();
      const cfg = getShippingValues();
      const FREE_SHIPPING_THRESHOLD = cfg.freeThreshold;
      const FLAT_SHIPPING_FEE = cfg.flatFee;

      const pct =
        FREE_SHIPPING_THRESHOLD > 0
          ? Math.min(100, Math.round((subtotal / FREE_SHIPPING_THRESHOLD) * 100))
          : 100;
      if (shippingMeterFill) shippingMeterFill.style.width = pct + '%';
      if (shippingMeterText) {
        if (subtotal === 0) {
          shippingMeterText.innerHTML =
            'Enjoy <strong>Free Nationwide Delivery across Pakistan</strong> on orders of <strong>' +
            formatPKR(FREE_SHIPPING_THRESHOLD) +
            '</strong> or above (flat ' +
            formatPKR(FLAT_SHIPPING_FEE) +
            ' nationwide shipping below ' +
            formatPKR(FREE_SHIPPING_THRESHOLD) +
            ').';
        } else if (subtotal >= FREE_SHIPPING_THRESHOLD) {
          shippingMeterText.innerHTML =
            '&#10022; Your bag qualifies for <strong>Free Nationwide Delivery across Pakistan</strong> (3 to 5 working days)!';
        } else {
          const diff = FREE_SHIPPING_THRESHOLD - subtotal;
          shippingMeterText.innerHTML =
            'Add <strong>' +
            formatPKR(diff) +
            '</strong> more to unlock <strong>Free Nationwide Delivery</strong> (orders below ' +
            formatPKR(FREE_SHIPPING_THRESHOLD) +
            ' have a flat ' +
            formatPKR(FLAT_SHIPPING_FEE) +
            ' shipping fee).';
        }
      }

      if (cart.length === 0) {
        cartItemsContainer.innerHTML =
          '<div style="text-align:center; padding: 3.5rem 1rem;">' +
          '<h3 style="font-size: 1.85rem; margin-bottom: 0.65rem;">Your shopping bag is currently empty</h3>' +
          '<p style="color: var(--color-charcoal-soft); margin-bottom: 2rem;">Discover our sculptural silhouettes with nationwide delivery across Pakistan.</p>' +
          '<a href="shop.html" class="btn btn-primary">Shop the Collection</a>' +
          '</div>';
      } else {
        cartItemsContainer.innerHTML = cart
          .map(function (item) {
            const encodedId = encodeURIComponent(item.id);
            const safeName = escapeHTML(item.name);
            const safeColor = escapeHTML(item.color);
            const safeCat = escapeHTML(item.category);
            const safeImg = escapeHTML(item.image);
            const safeIdAttr = escapeHTML(item.id);
            return (
              '<div class="cart-row">' +
              '<a href="product.html?id=' +
              encodedId +
              '">' +
              '<img src="' +
              safeImg +
              '" alt="' +
              safeName +
              '" class="cart-row__img">' +
              '</a>' +
              '<div>' +
              '<span style="font-size:0.7rem; text-transform:uppercase; letter-spacing:0.18em; color:var(--color-charcoal-muted);">' +
              safeCat +
              '</span>' +
              '<h3 style="font-size:1.3rem; margin-bottom:0.25rem;">' +
              '<a href="product.html?id=' +
              encodedId +
              '">' +
              safeName +
              '</a>' +
              '</h3>' +
              '<p style="font-size:0.84rem; color:var(--color-charcoal-soft); margin-bottom:0.5rem;">Selected Hue: <strong>' +
              safeColor +
              '</strong> &bull; Unit Price: ' +
              formatPKR(item.price) +
              '</p>' +
              '<button type="button" style="font-size:0.72rem; text-transform:uppercase; letter-spacing:0.15em; color:var(--color-charcoal-muted); border-bottom:1px solid var(--color-gold);" data-cart-remove="' +
              safeIdAttr +
              '" data-cart-color="' +
              safeColor +
              '">Remove Item</button>' +
              '</div>' +
              '<div class="qty-selector">' +
              '<button type="button" data-cart-qty="' +
              safeIdAttr +
              '" data-cart-color="' +
              safeColor +
              '" data-delta="-1" aria-label="Decrease quantity">&minus;</button>' +
              '<input type="text" value="' +
              Number(item.qty) +
              '" readonly aria-label="Quantity">' +
              '<button type="button" data-cart-qty="' +
              safeIdAttr +
              '" data-cart-color="' +
              safeColor +
              '" data-delta="1" aria-label="Increase quantity">+</button>' +
              '</div>' +
              '<div style="font-size:1.05rem; font-weight:500; min-width:90px; text-align:right;">' +
              formatPKR(item.price * item.qty) +
              '</div>' +
              '</div>'
            );
          })
          .join('');
      }

      const discountAmount = Math.round(subtotal * discountRate);
      const effectiveShipping =
        subtotal === 0
          ? 0
          : subtotal >= FREE_SHIPPING_THRESHOLD
          ? 0
          : FLAT_SHIPPING_FEE;
      const total = Math.max(0, subtotal - discountAmount + effectiveShipping);

      if (summarySubtotal) summarySubtotal.textContent = formatPKR(subtotal);
      if (summaryDiscountRow && summaryDiscount) {
        summaryDiscountRow.style.display = discountAmount > 0 ? 'flex' : 'none';
        summaryDiscount.textContent = '-' + formatPKR(discountAmount);
      }
      if (summaryShipping) {
        if (subtotal === 0) {
          summaryShipping.textContent = formatPKR(FLAT_SHIPPING_FEE);
        } else if (effectiveShipping === 0) {
          summaryShipping.textContent = 'Free (' + formatPKR(0) + ')';
        } else {
          summaryShipping.textContent = formatPKR(effectiveShipping);
        }
      }
      if (summaryTotal) summaryTotal.textContent = formatPKR(total);
      updatePaymentNoteText();
    }

    cartItemsContainer.addEventListener('click', function (e) {
      const qtyBtn = e.target.closest('[data-cart-qty]');
      if (qtyBtn) {
        const id = qtyBtn.getAttribute('data-cart-qty');
        const color = qtyBtn.getAttribute('data-cart-color');
        const delta = parseInt(qtyBtn.getAttribute('data-delta'), 10);
        const item = store.getCart().find(function (i) {
          return i.id === id && i.color === color;
        });
        if (item) store.updateQuantity(id, color, item.qty + delta);
        return;
      }

      const rmBtn = e.target.closest('[data-cart-remove]');
      if (rmBtn) {
        store.removeFromCart(
          rmBtn.getAttribute('data-cart-remove'),
          rmBtn.getAttribute('data-cart-color')
        );
      }
    });

    window.addEventListener('handlehue:cart-updated', renderCartPage);
    window.addEventListener('handlehue:data-loaded', renderCartPage);

    if (promoForm && promoInput) {
      promoForm.addEventListener('submit', function (e) {
        e.preventDefault();
        const code = promoInput.value.trim().toUpperCase();
        if (code === 'HUE10' || code === 'WELCOME10') {
          discountRate = 0.1;
          activePromoCode = code;
          store.showToast(
            'Privilege code ' + escapeHTML(code) + ' applied: 10% off your PKR bag subtotal.'
          );
          renderCartPage();
        } else {
          store.showToast('Invalid code. Use HUE10 or WELCOME10 for 10% off.');
        }
      });
    }

    if (paymentSelect) {
      paymentSelect.addEventListener('change', updatePaymentNoteText);
    }

    function processOrderSubmission(openWhatsAppTab) {
      const cart = store.getCart();
      if (cart.length === 0) {
        store.showToast(
          'Your shopping bag is empty. Please add a piece before checkout.'
        );
        return;
      }

      if (checkoutForm && !checkoutForm.checkValidity()) {
        checkoutForm.reportValidity();
        return;
      }

      const cfg = getShippingValues();
      const FREE_SHIPPING_THRESHOLD = cfg.freeThreshold;
      const FLAT_SHIPPING_FEE = cfg.flatFee;

      const subtotal = store.getCartSubtotal();
      const discountAmount = Math.round(subtotal * discountRate);
      const effectiveShipping =
        subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING_FEE;
      const finalTotal = Math.max(
        0,
        subtotal - discountAmount + effectiveShipping
      );

      const orderRef =
        'HH-' +
        new Date().getFullYear() +
        '-' +
        Math.floor(1000 + Math.random() * 9000);

      const customerName =
        (document.getElementById('checkoutFullName')?.value || '').trim() ||
        'Valued Client';
      const customerPhone =
        (document.getElementById('checkoutPhone')?.value || '').trim();
      const customerCity =
        (document.getElementById('checkoutCity')?.value || '').trim();
      const customerProvince =
        (document.getElementById('checkoutProvince')?.value || '').trim();
      const customerAddress =
        (document.getElementById('checkoutAddress')?.value || '').trim();
      const orderNote =
        (document.getElementById('checkoutGiftNote')?.value || '').trim();

      const paymentMethodMap = {
        cod: 'Cash on Delivery',
        bank: 'Bank Transfer',
        jazzcash: 'JazzCash',
        easypaisa: 'Easypaisa'
      };
      const selectedPaymentKey = paymentSelect ? paymentSelect.value : 'cod';
      const paymentLabel =
        paymentMethodMap[selectedPaymentKey] || 'Cash on Delivery';

      const itemLines = cart.map(function (item, index) {
        return (
          index +
          1 +
          '. ' +
          item.name +
          ' (Hue: ' +
          item.color +
          ') x ' +
          item.qty +
          ' — ' +
          formatPKR(item.price * item.qty)
        );
      });

      const messageLines = [
        'Handle & Hue — New Atelier Order (' + orderRef + ')',
        '------------------------------',
        'Customer Details:',
        'Name: ' + customerName,
        'Phone: ' + customerPhone,
        'City: ' + customerCity,
        'Province: ' + customerProvince,
        'Address: ' + customerAddress,
        '',
        'Order Items:',
        itemLines.join('\n'),
        '',
        'Order Summary:',
        'Subtotal: ' + formatPKR(subtotal)
      ];

      if (discountAmount > 0) {
        messageLines.push(
          'Discount (' +
            (activePromoCode || '10%') +
            '): -' +
            formatPKR(discountAmount)
        );
      }

      messageLines.push(
        'Shipping Fee: ' +
          (effectiveShipping === 0
            ? 'Free (' + formatPKR(0) + ')'
            : formatPKR(effectiveShipping))
      );
      messageLines.push('Total: ' + formatPKR(finalTotal));
      messageLines.push('Payment Method: ' + paymentLabel);

      if (orderNote) {
        messageLines.push('Order Note: ' + orderNote);
      }

      const waUrl = buildWhatsAppUrl(messageLines.join('\n'));

      if (openWhatsAppTab) {
        window.open(waUrl, '_blank', 'noopener,noreferrer');
      }

      store.clearCart();
      discountRate = 0;
      activePromoCode = '';
      if (checkoutForm) checkoutForm.reset();
      renderCartPage();

      if (orderSuccessBox) {
        orderSuccessBox.style.display = 'block';
        orderSuccessBox.innerHTML =
          '<span class="eyebrow">Atelier Order Ready on WhatsApp</span>' +
          '<h3 style="font-size:1.95rem; margin-bottom:0.5rem;">Thank you, ' +
          escapeHTML(customerName) +
          '</h3>' +
          '<p style="color:var(--color-charcoal-soft); margin-bottom:0.75rem;">' +
          'Your order <strong>#' +
          escapeHTML(orderRef) +
          '</strong> for <strong>' +
          formatPKR(finalTotal) +
          '</strong> (' +
          escapeHTML(paymentLabel) +
          ') destined for <strong>' +
          escapeHTML(customerCity) +
          ', ' +
          escapeHTML(customerProvince) +
          '</strong> has been prepared.' +
          '</p>' +
          '<p style="color:var(--color-charcoal); font-weight:500; font-size:0.95rem; margin-bottom:1.25rem;">' +
          'Please send the pre-filled message in WhatsApp (' +
          escapeHTML(cfg.waDisplay) +
          ') to confirm your order.' +
          '</p>' +
          '<div style="display:flex; gap:0.85rem; justify-content:center; flex-wrap:wrap;">' +
          '<a href="' +
          escapeHTML(waUrl) +
          '" target="_blank" rel="noopener noreferrer" class="btn btn-gold">Open WhatsApp Message Again</a>' +
          '<a href="shop.html" class="btn btn-outline">Continue Exploring</a>' +
          '</div>';
        orderSuccessBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }

      store.showToast(
        'Please send the message in WhatsApp to confirm Order ' + escapeHTML(orderRef) + '!'
      );
    }

    if (whatsappOrderBtn) {
      whatsappOrderBtn.addEventListener('click', function (e) {
        e.preventDefault();
        processOrderSubmission(true);
      });
    }

    if (checkoutForm) {
      checkoutForm.addEventListener('submit', function (e) {
        e.preventDefault();
        processOrderSubmission(true);
      });
    }

    renderCartPage();
  }

  /* ==========================================================================
     7. CONTACT PAGE & FAQ ACCORDIONS
     ========================================================================== */
  function initContactPage() {
    const contactForm = document.getElementById('contactForm');
    const feedbackEl = document.getElementById('contactFormFeedback');

    if (contactForm) {
      contactForm.addEventListener('submit', function (e) {
        e.preventDefault();
        const nameInput = contactForm.querySelector('[name="name"]');
        const name = nameInput && nameInput.value ? nameInput.value : 'Guest';
        store.showToast(
          'Thank you, ' +
            escapeHTML(name) +
            '. Our Pakistan Atelier Concierge will reply within 24 hours.'
        );
        if (feedbackEl) {
          feedbackEl.style.display = 'block';
          feedbackEl.textContent =
            'Thank you, ' +
            name +
            '. Your message has been received by the Handle & Hue Concierge.';
        }
        contactForm.reset();
      });
    }

    document
      .querySelectorAll('.faq-accordion .accordion-trigger')
      .forEach(function (btn) {
        btn.addEventListener('click', function () {
          const item = btn.closest('.accordion-item');
          if (item) item.classList.toggle('is-open');
        });
      });
  }

  /* ==========================================================================
     Initialize Everything on DOMContentLoaded + Trigger Supabase Data Fetch
     ========================================================================== */
  document.addEventListener('DOMContentLoaded', function () {
    initHeaderAndDrawers();
    syncSettingsAcrossDOM();
    initHomePage();
    initShopPage();
    initProductDetailPage();
    initCartPage();
    initContactPage();

    window.addEventListener('handlehue:data-loaded', syncSettingsAcrossDOM);

    if (window.HandleHueData && typeof window.HandleHueData.loadAll === 'function') {
      window.HandleHueData.loadAll();
    }
  });
})();
