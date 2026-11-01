/**
 * ============================================================================
 * HANDLE & HUE — Main Application Controller (js/main.js)
 * ============================================================================
 * Adapted for the Pakistan Market (PKR Currency via window.formatPKR &
 * WhatsApp Checkout via window.WHATSAPP_NUMBER = 923469377256):
 * - Sticky transparent-to-ivory navbar & mobile slide-in drawer
 * - Floating WhatsApp chat button on every page
 * - Live search overlay with PKR pricing
 * - Product card rendering & quick-add / swatch / wishlist interactions
 * - Home page sections (Categories, New Arrivals, Shop by Color, Bestsellers)
 * - Shop page filtering (collapsible mobile filter panel, Category, Color,
 *   Price Range in PKR, Search) & sorting
 * - Product Detail page (Gallery with desktop hover zoom, disabled on touch,
 *   "Buy on WhatsApp" button, Swatches, Accordions, Related)
 * - Cart & Checkout page ("Order on WhatsApp" button, Rs. 10,000 free shipping
 *   threshold, flat Rs. 250 fee, HUE10 / WELCOME10 promo codes, Pakistan
 *   province dropdown, COD / Bank Transfer / JazzCash / Easypaisa options)
 * - Contact page form & FAQ accordions
 * ============================================================================
 */

(function () {
  'use strict';

  const products = window.HANDLE_HUE_PRODUCTS || [];
  const colors = window.HANDLE_HUE_COLORS || [];
  const categories = window.HANDLE_HUE_CATEGORIES || [];
  const store = window.HandleHueStore;
  const formatPKR =
    window.formatPKR ||
    function (n) {
      return 'Rs. ' + Math.round(Number(n) || 0).toLocaleString();
    };
  const WHATSAPP_NUMBER = window.WHATSAPP_NUMBER || '923469377256';
  const buildWhatsAppUrl =
    window.buildWhatsAppUrl ||
    function (msg) {
      const base = 'https://wa.me/' + WHATSAPP_NUMBER;
      return msg ? base + '?text=' + encodeURIComponent(msg) : base;
    };

  /* ==========================================================================
     1. Sticky Navbar, Mobile Drawer, Global Overlays & Floating WhatsApp Button
     ========================================================================== */
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

    // Mobile Menu Trigger
    const mobileBtn = document.getElementById('mobileMenuBtn');
    if (mobileBtn) {
      mobileBtn.addEventListener('click', function () {
        store.openSideDrawer('mobileNavDrawer');
      });
    }

    // Cart Drawer Trigger
    document.querySelectorAll('[data-open-cart]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        if (window.location.pathname.endsWith('cart.html')) return;
        e.preventDefault();
        store.openSideDrawer('cartDrawer');
      });
    });

    // Wishlist Drawer Trigger
    document.querySelectorAll('[data-open-wishlist]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        store.openSideDrawer('wishlistDrawer');
      });
    });

    // Search Overlay Trigger
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

    // Close Buttons & Backdrop
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
        const q = (query || '').trim().toLowerCase();
        const matches = q
          ? products.filter(function (p) {
              return (
                p.name.toLowerCase().includes(q) ||
                p.category.toLowerCase().includes(q) ||
                p.primaryColor.toLowerCase().includes(q) ||
                p.subtitle.toLowerCase().includes(q)
              );
            })
          : products.slice(0, 4);

        if (matches.length === 0) {
          searchPreview.innerHTML =
            '<p style="grid-column: 1/-1; color: var(--color-charcoal-soft); font-size:0.9rem;">No pieces found matching "' +
            query +
            '". Try searching for "Tote", "Blush", or "Clutch".</p>';
          return;
        }

        searchPreview.innerHTML = matches
          .slice(0, 4)
          .map(function (p) {
            return (
              '<a href="product.html?id=' +
              encodeURIComponent(p.id) +
              '" style="display:flex; align-items:center; gap:0.8rem; padding:0.65rem; background:var(--color-ivory-pure); border:var(--border-thin); border-radius:var(--radius-sm);">' +
              '<img src="' +
              p.images.primary +
              '" alt="' +
              p.name +
              '" style="width:54px; height:62px; object-fit:cover; border-radius:4px;">' +
              '<div>' +
              '<div style="font-family:var(--font-heading); font-weight:600; font-size:1.05rem;">' +
              p.name +
              '</div>' +
              '<div style="font-size:0.76rem; color:var(--color-charcoal-muted);">' +
              p.primaryColor +
              ' &bull; ' +
              formatPKR(p.price) +
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
      renderSearchPreview('');
    }

    // Floating WhatsApp Chat Button on Every Page
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
  function renderProductCard(product, staggerIndex) {
    const idx = Number(staggerIndex) || 0;
    const wished = store.isInWishlist(product.id);
    const delayClass = idx > 0 ? 'delay-' + ((idx % 4) + 1) : '';
    const badgeClass =
      product.badge === 'Limited Hue' ? 'product-card__badge--gold' : '';
    const encodedId = encodeURIComponent(product.id);

    const comparePriceHtml = product.compareAtPrice
      ? '<span style="font-size:0.76rem; color:var(--color-charcoal-muted); text-decoration:line-through; margin-left:0.35rem; font-weight:300;">' +
        formatPKR(product.compareAtPrice) +
        '</span>'
      : '';

    const swatchesHtml = product.colors
      .map(function (c, sIdx) {
        return (
          '<button type="button" class="swatch-dot ' +
          (sIdx === 0 ? 'is-selected' : '') +
          '" style="background-color: ' +
          c.hex +
          ';" title="' +
          c.name +
          '" aria-label="Select ' +
          c.name +
          '" data-card-swatch="' +
          c.name +
          '"></button>'
        );
      })
      .join('');

    return (
      '<article class="product-card reveal ' +
      delayClass +
      '" data-product-card="' +
      product.id +
      '" data-selected-color="' +
      product.primaryColor +
      '">' +
      '<div class="product-card__media">' +
      (product.badge
        ? '<span class="product-card__badge ' +
          badgeClass +
          '">' +
          product.badge +
          '</span>'
        : '') +
      '<button type="button" class="product-card__wishlist ' +
      (wished ? 'is-active' : '') +
      '" data-wishlist-btn="' +
      product.id +
      '" aria-label="Save ' +
      product.name +
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
      product.name +
      '">' +
      '<img src="' +
      product.images.primary +
      '" alt="' +
      product.name +
      ' in ' +
      product.primaryColor +
      '" class="product-card__img product-card__img--primary" loading="lazy">' +
      '<img src="' +
      product.images.secondary +
      '" alt="' +
      product.name +
      ' alternate studio view" class="product-card__img product-card__img--secondary" loading="lazy">' +
      '</a>' +
      '<button type="button" class="product-card__quick-add" data-quick-add="' +
      product.id +
      '">' +
      '<span>+ Quick Add</span>' +
      '</button>' +
      '</div>' +
      '<div class="product-card__body">' +
      '<div class="product-card__category">' +
      product.category +
      ' &bull; <span data-card-color-label>' +
      product.primaryColor +
      '</span></div>' +
      '<h3 class="product-card__title">' +
      '<a href="product.html?id=' +
      encodedId +
      '">' +
      product.name +
      '</a>' +
      '</h3>' +
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
    // 1. Featured Categories
    const catGrid = document.getElementById('homeCategoriesGrid');
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
            cat.image +
            '" alt="' +
            cat.name +
            ' Collection" class="category-card__img" loading="lazy">' +
            '<div class="category-card__overlay">' +
            '<h3 class="category-card__title">' +
            cat.name +
            '</h3>' +
            '<span class="category-card__count">' +
            cat.subtitle +
            '</span>' +
            '</div>' +
            '</a>'
          );
        })
        .join('');
    }

    // 2. New Arrivals Grid (4 items)
    const newArrivalsGrid = document.getElementById('newArrivalsGrid');
    if (newArrivalsGrid) {
      const newItems = products
        .filter(function (p) {
          return p.isNew;
        })
        .slice(0, 4);
      newArrivalsGrid.innerHTML = newItems
        .map(function (p, idx) {
          return renderProductCard(p, idx);
        })
        .join('');
    }

    // 3. "Shop by Color" ("Carry Your Color") Interactive Swatch Explorer
    const swatchesBar = document.getElementById('hueSwatchesBar');
    const huePreviewGrid = document.getElementById('huePreviewGrid');
    const hueDescription = document.getElementById('hueActiveDescription');
    const hueShopLink = document.getElementById('hueShopFilterLink');

    if (swatchesBar && huePreviewGrid) {
      const renderHueSelection = function (selectedColorKey) {
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
            '<strong>' + hueObj.name + '</strong> &mdash; ' + hueObj.poetic;
        }
        if (hueShopLink) {
          hueShopLink.href = 'shop.html?color=' + encodeURIComponent(hueObj.key);
          hueShopLink.textContent = 'Shop All ' + hueObj.name + ' Pieces';
        }

        const matchingProducts = products
          .filter(function (p) {
            return p.colors.some(function (c) {
              return c.name === hueObj.key;
            });
          })
          .slice(0, 4);

        huePreviewGrid.innerHTML = matchingProducts
          .map(function (p, idx) {
            return renderProductCard(p, idx);
          })
          .join('');

        if (window.observeReveals) window.observeReveals();
      };

      swatchesBar.innerHTML = colors
        .map(function (c, i) {
          return (
            '<div class="hue-swatch-item ' +
            (i === 0 ? 'is-active' : '') +
            '" data-hue-select="' +
            c.key +
            '" role="button" tabindex="0" aria-label="Explore ' +
            c.name +
            ' bags">' +
            '<span class="hue-swatch-circle" style="background-color: ' +
            c.hex +
            '; border-color: ' +
            c.borderHex +
            ';"></span>' +
            '<span class="hue-swatch-label">' +
            c.name +
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

      renderHueSelection('Blush Pink');
    }

    // 4. Bestsellers Grid (4 items)
    const bestsellersGrid = document.getElementById('bestsellersGrid');
    if (bestsellersGrid) {
      const bestItems = products
        .filter(function (p) {
          return p.isBestseller;
        })
        .slice(0, 4);
      bestsellersGrid.innerHTML = bestItems
        .map(function (p, idx) {
          return renderProductCard(p, idx);
        })
        .join('');
    }

    // 5. Newsletter Form
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

    if (window.observeReveals) window.observeReveals();
  }

  /* ==========================================================================
     4. SHOP PAGE CONTROLLER (Filters, Swatches, Price Slider in PKR, Sorting)
     ========================================================================== */
  function initShopPage() {
    const shopGrid = document.getElementById('shopProductsGrid');
    if (!shopGrid) return;

    const MAX_CATALOG_PRICE = 18000;
    const params = new URLSearchParams(window.location.search);
    const state = {
      category: params.get('category') || 'All',
      color: params.get('color') || 'All',
      maxPrice: parseInt(params.get('maxPrice'), 10) || MAX_CATALOG_PRICE,
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

    // Mobile Collapsible Filter Panel Toggle
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
      if (catContainer) {
        const allCats = ['All'].concat(
          categories.map(function (c) {
            return c.id;
          })
        );
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
              catName +
              '">' +
              '<span>' +
              (catName === 'All' ? 'All Silhouettes' : catName) +
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
                c.key +
                '" title="' +
                c.name +
                '">' +
                '<span class="filter-swatch-circle" style="background-color: ' +
                c.hex +
                ';"></span>' +
                '<span>' +
                c.name.split(' ')[0] +
                '</span>' +
                '</button>'
              );
            })
            .join('');
      }

      if (priceSlider) {
        priceSlider.value = state.maxPrice;
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
      const filtered = products.filter(function (prod) {
        if (state.category !== 'All' && prod.category !== state.category) {
          return false;
        }
        if (
          state.color !== 'All' &&
          !prod.colors.some(function (c) {
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
            prod.subtitle.toLowerCase().includes(q) ||
            prod.category.toLowerCase().includes(q) ||
            prod.primaryColor.toLowerCase().includes(q);
          if (!match) return false;
        }
        return true;
      });

      // Sorting
      if (state.sort === 'price-asc') {
        filtered.sort(function (a, b) {
          return a.price - b.price;
        });
      } else if (state.sort === 'price-desc') {
        filtered.sort(function (a, b) {
          return b.price - a.price;
        });
      } else if (state.sort === 'newest') {
        filtered.sort(function (a, b) {
          return Number(b.isNew) - Number(a.isNew);
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

      // Render active filter chips
      if (activeFiltersBar) {
        const chips = [];
        if (state.category !== 'All') {
          chips.push(
            '<button type="button" class="filter-chip" data-clear-filter="category">Category: ' +
              state.category +
              ' &times;</button>'
          );
        }
        if (state.color !== 'All') {
          chips.push(
            '<button type="button" class="filter-chip" data-clear-filter="color">Hue: ' +
              state.color +
              ' &times;</button>'
          );
        }
        if (state.maxPrice < MAX_CATALOG_PRICE) {
          chips.push(
            '<button type="button" class="filter-chip" data-clear-filter="price">Up to ' +
              formatPKR(state.maxPrice) +
              ' &times;</button>'
          );
        }
        if (state.search.trim()) {
          chips.push(
            '<button type="button" class="filter-chip" data-clear-filter="search">Search: "' +
              state.search +
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
      state.maxPrice = MAX_CATALOG_PRICE;
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
        if (type === 'price') state.maxPrice = MAX_CATALOG_PRICE;
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
  }

  /* ==========================================================================
     5. PRODUCT DETAIL PAGE CONTROLLER (Gallery Zoom, Buy on WhatsApp, Related)
     ========================================================================== */
  function initProductDetailPage() {
    const pdpRoot = document.getElementById('pdpDetailContainer');
    if (!pdpRoot) return;

    const params = new URLSearchParams(window.location.search);
    const productId = params.get('id') || 'aurelia-tote';
    const product =
      products.find(function (p) {
        return p.id === productId;
      }) || products[0];

    document.title = product.name + ' | Handle & Hue — Carry your color';

    let selectedColor = product.primaryColor;
    let quantity = 1;

    // Update Breadcrumbs
    const bcCategory = document.getElementById('pdpBreadcrumbCategory');
    const bcName = document.getElementById('pdpBreadcrumbName');
    if (bcCategory) {
      bcCategory.textContent = product.category;
      bcCategory.href = 'shop.html?category=' + encodeURIComponent(product.category);
    }
    if (bcName) bcName.textContent = product.name;

    const galleryViews = [
      { key: 'primary', label: 'Studio Front View', src: product.images.primary },
      { key: 'secondary', label: 'Three-Quarter Plinth View', src: product.images.secondary },
      { key: 'detail', label: 'Hardware & Leather Detail', src: product.images.detail },
      { key: 'lifestyle', label: 'Atelier Edition View', src: product.images.lifestyle }
    ];

    const wished = store.isInWishlist(product.id);
    const compareHtml = product.compareAtPrice
      ? '<span style="font-size:1.05rem; color:var(--color-charcoal-muted); text-decoration:line-through; margin-left:0.6rem; font-weight:300;">' +
        formatPKR(product.compareAtPrice) +
        '</span>'
      : '';

    const thumbsHtml = galleryViews
      .map(function (v, idx) {
        return (
          '<button type="button" class="pdp-thumb-btn ' +
          (idx === 0 ? 'is-active' : '') +
          '" data-thumb-src="' +
          v.src +
          '" aria-label="' +
          v.label +
          '">' +
          '<img src="' +
          v.src +
          '" alt="' +
          v.label +
          '">' +
          '</button>'
        );
      })
      .join('');

    const swatchesHtml = product.colors
      .map(function (c, i) {
        return (
          '<button type="button" class="pdp-swatch-btn ' +
          (i === 0 ? 'is-active' : '') +
          '" style="background-color:' +
          c.hex +
          ';" data-pdp-color="' +
          c.name +
          '" title="' +
          c.name +
          '" aria-label="Select ' +
          c.name +
          '"></button>'
        );
      })
      .join('');

    pdpRoot.innerHTML =
      '<div class="pdp-gallery">' +
      '<div class="pdp-thumbs" id="pdpThumbs">' +
      thumbsHtml +
      '</div>' +
      '<div class="pdp-main-stage" id="pdpZoomStage" title="Move cursor to inspect leather grain and hardware">' +
      '<img src="' +
      product.images.primary +
      '" alt="' +
      product.name +
      '" id="pdpMainImage">' +
      '<span class="pdp-zoom-hint">Hover to Magnify</span>' +
      '</div>' +
      '</div>' +
      '<div class="pdp-info">' +
      '<span class="eyebrow">' +
      product.category +
      ' &bull; SKU: ' +
      product.sku +
      '</span>' +
      '<h1 class="pdp-info__title">' +
      product.name +
      '</h1>' +
      '<p style="font-style:italic; font-family:var(--font-heading); font-size:1.2rem; color:var(--color-charcoal-soft); margin-bottom:1rem;">' +
      product.subtitle +
      '</p>' +
      '<div class="pdp-info__price-row">' +
      '<span class="pdp-info__price">' +
      formatPKR(product.price) +
      compareHtml +
      '</span>' +
      '<span class="pdp-info__rating">&#9733;&#9733;&#9733;&#9733;&#9733; ' +
      product.rating +
      ' (' +
      product.reviewsCount +
      ' Atelier Reviews)</span>' +
      '</div>' +
      '<p class="pdp-info__desc">' +
      product.description +
      '</p>' +
      '<div class="pdp-option-block">' +
      '<label class="pdp-option-label">Selected Hue: <span id="pdpSelectedColorName">' +
      selectedColor +
      '</span></label>' +
      '<div class="pdp-swatches" id="pdpSwatches">' +
      swatchesHtml +
      '</div>' +
      '</div>' +
      '<div class="pdp-dimensions-card">' +
      '<div class="pdp-dim-item">' +
      '<span>Dimensions</span>' +
      '<strong>' +
      product.dimensions.split('(')[0].trim() +
      '</strong>' +
      '</div>' +
      '<div class="pdp-dim-item">' +
      '<span>Strap Drop</span>' +
      '<strong>' +
      product.strapDrop.split('|')[0].trim() +
      '</strong>' +
      '</div>' +
      '<div class="pdp-dim-item">' +
      '<span>Weight</span>' +
      '<strong>' +
      product.weight +
      '</strong>' +
      '</div>' +
      '</div>' +
      '<div class="pdp-actions-row">' +
      '<div class="qty-selector" aria-label="Quantity">' +
      '<button type="button" id="pdpQtyMinus" aria-label="Decrease quantity">&minus;</button>' +
      '<input type="text" id="pdpQtyInput" value="1" readonly aria-label="Quantity">' +
      '<button type="button" id="pdpQtyPlus" aria-label="Increase quantity">+</button>' +
      '</div>' +
      '<button type="button" class="btn btn-primary" id="pdpAddToCartBtn" style="flex:1;">' +
      'Add to Shopping Bag &mdash; ' +
      formatPKR(product.price) +
      '</button>' +
      '<button type="button" class="btn btn-outline ' +
      (wished ? 'is-active' : '') +
      '" id="pdpWishlistBtn" data-wishlist-btn="' +
      product.id +
      '" aria-label="Add to Wishlist" style="padding:0.85rem 1.15rem;">' +
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="' +
      (wished ? 'currentColor' : 'none') +
      '" stroke="currentColor" stroke-width="1.7">' +
      '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>' +
      '</svg>' +
      '</button>' +
      '</div>' +
      '<div class="pdp-whatsapp-row">' +
      '<button type="button" class="btn btn-gold" id="pdpBuyWhatsAppBtn">' +
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">' +
      '<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>' +
      '</svg>' +
      '<span>Buy on WhatsApp</span>' +
      '</button>' +
      '</div>' +
      '<div class="pdp-accordions">' +
      '<div class="accordion-item is-open">' +
      '<button type="button" class="accordion-trigger">' +
      '<span>Materials &amp; Craftsmanship</span>' +
      '<span>&plus;</span>' +
      '</button>' +
      '<div class="accordion-content">' +
      '<p>' +
      product.materials +
      '</p>' +
      '<p style="margin-top:0.5rem;"><strong>Interior Capacity:</strong> ' +
      product.capacity +
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
      product.dimensions +
      '<br>Strap Configuration: ' +
      product.strapDrop +
      '<br>Unladen Weight: ' +
      product.weight +
      '</p>' +
      '</div>' +
      '</div>' +
      '<div class="accordion-item">' +
      '<button type="button" class="accordion-trigger">' +
      '<span>Nationwide Delivery Across Pakistan &amp; Easy Exchange</span>' +
      '<span>&plus;</span>' +
      '</button>' +
      '<div class="accordion-content">' +
      '<p>Nationwide delivery across Pakistan in 3 to 5 working days. Enjoy free delivery on orders of Rs. 10,000 or above (flat Rs. 250 nationwide shipping fee below Rs. 10,000). Cash on Delivery, Bank Transfer, JazzCash, and Easypaisa are available, backed by our hassle-free 14-day easy exchange policy.</p>' +
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

    if (minusBtn && plusBtn && qtyInput) {
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

    if (addBtn) {
      addBtn.addEventListener('click', function () {
        store.addToCart(product.id, selectedColor, quantity, true);
      });
    }

    if (buyWhatsAppBtn) {
      buyWhatsAppBtn.addEventListener('click', function () {
        const linePrice = formatPKR(product.price * quantity);
        const pageUrl = window.location.href;
        const messageLines = [
          'Hi Handle & Hue, I would like to buy this bag:',
          '',
          'Product: ' + product.name,
          'Selected Hue: ' + selectedColor,
          'Quantity: ' + quantity,
          'Price: ' + linePrice + (quantity > 1 ? ' (' + formatPKR(product.price) + ' each)' : ''),
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

    if (window.observeReveals) window.observeReveals();
  }

  /* ==========================================================================
     6. CART & CHECKOUT PAGE CONTROLLER (WhatsApp Checkout & PKR Totals)
     ========================================================================== */
  function initCartPage() {
    const cartItemsContainer = document.getElementById('cartPageItems');
    if (!cartItemsContainer) return;

    const shippingCfg = window.HANDLE_HUE_SHIPPING_CONFIG || {
      freeShippingThreshold: 10000,
      flatShippingFee: 250
    };
    const FREE_SHIPPING_THRESHOLD = shippingCfg.freeShippingThreshold; // Rs. 10,000
    const FLAT_SHIPPING_FEE = shippingCfg.flatShippingFee;             // Rs. 250

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

    function renderCartPage() {
      const cart = store.getCart();
      const subtotal = store.getCartSubtotal();

      // Update Free Shipping Meter (Threshold: Rs. 10,000)
      const pct = Math.min(100, Math.round((subtotal / FREE_SHIPPING_THRESHOLD) * 100));
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
            return (
              '<div class="cart-row">' +
              '<a href="product.html?id=' +
              encodedId +
              '">' +
              '<img src="' +
              item.image +
              '" alt="' +
              item.name +
              '" class="cart-row__img">' +
              '</a>' +
              '<div>' +
              '<span style="font-size:0.7rem; text-transform:uppercase; letter-spacing:0.18em; color:var(--color-charcoal-muted);">' +
              item.category +
              '</span>' +
              '<h3 style="font-size:1.3rem; margin-bottom:0.25rem;">' +
              '<a href="product.html?id=' +
              encodedId +
              '">' +
              item.name +
              '</a>' +
              '</h3>' +
              '<p style="font-size:0.84rem; color:var(--color-charcoal-soft); margin-bottom:0.5rem;">Selected Hue: <strong>' +
              item.color +
              '</strong> &bull; Unit Price: ' +
              formatPKR(item.price) +
              '</p>' +
              '<button type="button" style="font-size:0.72rem; text-transform:uppercase; letter-spacing:0.15em; color:var(--color-charcoal-muted); border-bottom:1px solid var(--color-gold);" data-cart-remove="' +
              item.id +
              '" data-cart-color="' +
              item.color +
              '">Remove Item</button>' +
              '</div>' +
              '<div class="qty-selector">' +
              '<button type="button" data-cart-qty="' +
              item.id +
              '" data-cart-color="' +
              item.color +
              '" data-delta="-1" aria-label="Decrease quantity">&minus;</button>' +
              '<input type="text" value="' +
              item.qty +
              '" readonly aria-label="Quantity">' +
              '<button type="button" data-cart-qty="' +
              item.id +
              '" data-cart-color="' +
              item.color +
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

      // Summary Totals in PKR
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

    if (promoForm && promoInput) {
      promoForm.addEventListener('submit', function (e) {
        e.preventDefault();
        const code = promoInput.value.trim().toUpperCase();
        if (code === 'HUE10' || code === 'WELCOME10') {
          discountRate = 0.1;
          activePromoCode = code;
          store.showToast(
            'Privilege code ' + code + ' applied: 10% off your PKR bag subtotal.'
          );
          renderCartPage();
        } else {
          store.showToast('Invalid code. Use HUE10 or WELCOME10 for 10% off.');
        }
      });
    }

    // Update payment method instruction note dynamically
    if (paymentSelect && paymentNoteEl) {
      const paymentNotes = {
        cod: 'Pay in cash (PKR) at your doorstep when our courier delivers your parcel anywhere in Pakistan. You will be contacted on WhatsApp (+92 346 9377256) to confirm your order before dispatch.',
        bank: 'You have selected Bank Transfer. Once you submit your order, our concierge team (+92 346 9377256) will share our bank account details on WhatsApp to confirm your order.',
        jazzcash: 'You have selected JazzCash. Once you submit your order, our concierge team (+92 346 9377256) will share our JazzCash details on WhatsApp to confirm your order.',
        easypaisa: 'You have selected Easypaisa. Once you submit your order, our concierge team (+92 346 9377256) will share our Easypaisa details on WhatsApp to confirm your order.'
      };
      paymentSelect.addEventListener('change', function (e) {
        paymentNoteEl.textContent =
          paymentNotes[e.target.value] || paymentNotes.cod;
      });
    }

    /**
     * Build the formatted WhatsApp Order message and process order
     */
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

      // Build formatted WhatsApp order message
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

      // Clear cart and reset form after opening WhatsApp
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
          customerName +
          '</h3>' +
          '<p style="color:var(--color-charcoal-soft); margin-bottom:0.75rem;">' +
          'Your order <strong>#' +
          orderRef +
          '</strong> for <strong>' +
          formatPKR(finalTotal) +
          '</strong> (' +
          paymentLabel +
          ') destined for <strong>' +
          customerCity +
          ', ' +
          customerProvince +
          '</strong> has been prepared.' +
          '</p>' +
          '<p style="color:var(--color-charcoal); font-weight:500; font-size:0.95rem; margin-bottom:1.25rem;">' +
          'Please send the pre-filled message in WhatsApp (+92 346 9377256) to confirm your order.' +
          '</p>' +
          '<div style="display:flex; gap:0.85rem; justify-content:center; flex-wrap:wrap;">' +
          '<a href="' +
          waUrl +
          '" target="_blank" rel="noopener noreferrer" class="btn btn-gold">Open WhatsApp Message Again</a>' +
          '<a href="shop.html" class="btn btn-outline">Continue Exploring</a>' +
          '</div>';
        orderSuccessBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }

      store.showToast(
        'Please send the message in WhatsApp to confirm Order ' + orderRef + '!'
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
            name +
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
     Initialize Everything on DOMContentLoaded
     ========================================================================== */
  document.addEventListener('DOMContentLoaded', function () {
    initHeaderAndDrawers();
    initHomePage();
    initShopPage();
    initProductDetailPage();
    initCartPage();
    initContactPage();
  });
})();
