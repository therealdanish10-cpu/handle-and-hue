/**
 * ============================================================================
 * HANDLE & HUE — Main Application Controller (js/main.js)
 * ============================================================================
 * Handles:
 * - Sticky transparent-to-ivory navbar & mobile slide-in drawer
 * - Live search overlay
 * - Product card rendering & quick-add / swatch / wishlist interactions
 * - Home page sections (Categories, New Arrivals, Shop by Color, Bestsellers)
 * - Shop page filtering (Category, Color, Price Range, Search) & sorting
 * - Product Detail page (Gallery with hover zoom, Swatches, Accordions, Related)
 * - Cart & Checkout page (Order summary, Promo code, Checkout confirmation)
 * - Contact page form & FAQ accordions
 * ============================================================================
 */

(function () {
  'use strict';

  const products = window.HANDLE_HUE_PRODUCTS || [];
  const colors = window.HANDLE_HUE_COLORS || [];
  const categories = window.HANDLE_HUE_CATEGORIES || [];
  const store = window.HandleHueStore;

  /* ==========================================================================
     1. Sticky Navbar, Mobile Drawer & Global Overlays
     ========================================================================== */
  function initHeaderAndDrawers() {
    const header = document.getElementById('siteHeader');
    if (header) {
      const onScroll = () => {
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
      mobileBtn.addEventListener('click', () => {
        store.openSideDrawer('mobileNavDrawer');
      });
    }

    // Cart Drawer Trigger
    document.querySelectorAll('[data-open-cart]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        // If already on cart.html, let user scroll to cart or still open drawer
        if (window.location.pathname.endsWith('cart.html')) return;
        e.preventDefault();
        store.openSideDrawer('cartDrawer');
      });
    });

    // Wishlist Drawer Trigger
    document.querySelectorAll('[data-open-wishlist]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        store.openSideDrawer('wishlistDrawer');
      });
    });

    // Search Overlay Trigger
    const searchOverlay = document.getElementById('searchOverlay');
    const searchInput = document.getElementById('globalSearchInput');
    document.querySelectorAll('[data-open-search]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        store.closeAllDrawers();
        if (searchOverlay) {
          searchOverlay.classList.add('is-open');
          searchOverlay.setAttribute('aria-hidden', 'false');
          const backdrop = document.getElementById('drawerBackdrop');
          if (backdrop) backdrop.classList.add('is-open');
          setTimeout(() => searchInput && searchInput.focus(), 120);
        }
      });
    });

    // Close Buttons & Backdrop
    document.querySelectorAll('[data-close-drawer]').forEach((btn) => {
      btn.addEventListener('click', () => store.closeAllDrawers());
    });

    const backdrop = document.getElementById('drawerBackdrop');
    if (backdrop) {
      backdrop.addEventListener('click', () => store.closeAllDrawers());
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') store.closeAllDrawers();
    });

    // Live Search in Search Overlay
    const searchPreview = document.getElementById('globalSearchPreview');
    if (searchInput && searchPreview) {
      const renderSearchPreview = (query) => {
        const q = (query || '').trim().toLowerCase();
        const matches = q
          ? products.filter(
              (p) =>
                p.name.toLowerCase().includes(q) ||
                p.category.toLowerCase().includes(q) ||
                p.primaryColor.toLowerCase().includes(q) ||
                p.subtitle.toLowerCase().includes(q)
            )
          : products.slice(0, 4);

        if (matches.length === 0) {
          searchPreview.innerHTML = `<p style="grid-column: 1/-1; color: var(--color-charcoal-soft); font-size:0.9rem;">No pieces found matching "${query}". Try searching for "Tote", "Blush", or "Clutch".</p>`;
          return;
        }

        searchPreview.innerHTML = matches
          .slice(0, 4)
          .map(
            (p) => `
          <a href="product.html?id=${encodeURIComponent(p.id)}" style="display:flex; align-items:center; gap:0.8rem; padding:0.65rem; background:var(--color-ivory-pure); border:var(--border-thin); border-radius:var(--radius-sm);">
            <img src="${p.images.primary}" alt="${p.name}" style="width:54px; height:62px; object-fit:cover; border-radius:4px;">
            <div>
              <div style="font-family:var(--font-heading); font-weight:600; font-size:1.05rem;">${p.name}</div>
              <div style="font-size:0.76rem; color:var(--color-charcoal-muted);">${p.primaryColor} &bull; $${p.price}</div>
            </div>
          </a>
        `
          )
          .join('');
      };

      searchInput.addEventListener('input', (e) => renderSearchPreview(e.target.value));
      renderSearchPreview('');
    }
  }

  /* ==========================================================================
     2. Reusable Product Card Renderer & Global Card Events
     ========================================================================== */
  function renderProductCard(product, staggerIndex = 0) {
    const wished = store.isInWishlist(product.id);
    const delayClass = staggerIndex > 0 ? `delay-${(staggerIndex % 4) + 1}` : '';
    const badgeClass =
      product.badge === 'Limited Hue' ? 'product-card__badge--gold' : '';

    return `
      <article class="product-card reveal ${delayClass}" data-product-card="${product.id}" data-selected-color="${product.primaryColor}">
        <div class="product-card__media">
          ${
            product.badge
              ? `<span class="product-card__badge ${badgeClass}">${product.badge}</span>`
              : ''
          }
          <button type="button" class="product-card__wishlist ${wished ? 'is-active' : ''}" data-wishlist-btn="${product.id}" aria-label="Save ${product.name} to wishlist" aria-pressed="${wished}">
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.7">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </button>
          <a href="product.html?id=${encodeURIComponent(product.id)}" aria-label="View ${product.name}">
            <img src="${product.images.primary}" alt="${product.name} in ${product.primaryColor}" class="product-card__img product-card__img--primary" loading="lazy">
            <img src="${product.images.secondary}" alt="${product.name} alternate studio view" class="product-card__img product-card__img--secondary" loading="lazy">
          </a>
          <button type="button" class="product-card__quick-add" data-quick-add="${product.id}">
            <span>+ Quick Add</span>
          </button>
        </div>
        <div class="product-card__body">
          <div class="product-card__category">${product.category} &bull; <span data-card-color-label>${product.primaryColor}</span></div>
          <h3 class="product-card__title">
            <a href="product.html?id=${encodeURIComponent(product.id)}">${product.name}</a>
          </h3>
          <div class="product-card__price-row">
            <span class="product-card__price">$${product.price}</span>
            <div class="product-card__swatches" role="group" aria-label="Available colors">
              ${product.colors
                .map(
                  (c, idx) => `
                <button type="button" class="swatch-dot ${idx === 0 ? 'is-selected' : ''}" style="background-color: ${c.hex};" title="${c.name}" aria-label="Select ${c.name}" data-card-swatch="${c.name}"></button>
              `
                )
                .join('')}
            </div>
          </div>
        </div>
      </article>
    `;
  }

  // Global delegation for Product Card interactions (Quick Add, Wishlist Heart, Swatch Dot)
  document.addEventListener('click', (e) => {
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
        card.querySelectorAll('[data-card-swatch]').forEach((b) => b.classList.remove('is-selected'));
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
        .map(
          (cat, idx) => `
        <a href="shop.html?category=${encodeURIComponent(cat.id)}" class="category-card reveal delay-${(idx % 5) + 1}">
          <img src="${cat.image}" alt="${cat.name} Collection" class="category-card__img" loading="lazy">
          <div class="category-card__overlay">
            <h3 class="category-card__title">${cat.name}</h3>
            <span class="category-card__count">${cat.subtitle}</span>
          </div>
        </a>
      `
        )
        .join('');
    }

    // 2. New Arrivals Grid (4 items)
    const newArrivalsGrid = document.getElementById('newArrivalsGrid');
    if (newArrivalsGrid) {
      const newItems = products.filter((p) => p.isNew).slice(0, 4);
      newArrivalsGrid.innerHTML = newItems
        .map((p, idx) => renderProductCard(p, idx))
        .join('');
    }

    // 3. "Shop by Color" ("Carry Your Color") Interactive Swatch Explorer
    const swatchesBar = document.getElementById('hueSwatchesBar');
    const huePreviewGrid = document.getElementById('huePreviewGrid');
    const hueDescription = document.getElementById('hueActiveDescription');
    const hueShopLink = document.getElementById('hueShopFilterLink');

    if (swatchesBar && huePreviewGrid) {
      const renderHueSelection = (selectedColorKey) => {
        const hueObj =
          colors.find((c) => c.key === selectedColorKey) || colors[0];

        swatchesBar.querySelectorAll('[data-hue-select]').forEach((el) => {
          el.classList.toggle(
            'is-active',
            el.getAttribute('data-hue-select') === hueObj.key
          );
        });

        if (hueDescription) {
          hueDescription.innerHTML = `<strong>${hueObj.name}</strong> &mdash; ${hueObj.poetic}`;
        }
        if (hueShopLink) {
          hueShopLink.href = `shop.html?color=${encodeURIComponent(hueObj.key)}`;
          hueShopLink.textContent = `Shop All ${hueObj.name} Pieces`;
        }

        const matchingProducts = products
          .filter((p) => p.colors.some((c) => c.name === hueObj.key))
          .slice(0, 4);

        huePreviewGrid.innerHTML = matchingProducts
          .map((p, idx) => renderProductCard(p, idx))
          .join('');

        if (window.observeReveals) window.observeReveals();
      };

      swatchesBar.innerHTML = colors
        .map(
          (c, i) => `
        <div class="hue-swatch-item ${i === 0 ? 'is-active' : ''}" data-hue-select="${c.key}" role="button" tabindex="0" aria-label="Explore ${c.name} bags">
          <span class="hue-swatch-circle" style="background-color: ${c.hex}; border-color: ${c.borderHex};"></span>
          <span class="hue-swatch-label">${c.name}</span>
        </div>
      `
        )
        .join('');

      swatchesBar.addEventListener('click', (e) => {
        const item = e.target.closest('[data-hue-select]');
        if (item) {
          renderHueSelection(item.getAttribute('data-hue-select'));
        }
      });

      swatchesBar.addEventListener('keydown', (e) => {
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
      const bestItems = products.filter((p) => p.isBestseller).slice(0, 4);
      bestsellersGrid.innerHTML = bestItems
        .map((p, idx) => renderProductCard(p, idx))
        .join('');
    }

    // 5. Newsletter Form
    const newsletterForm = document.getElementById('newsletterForm');
    if (newsletterForm) {
      newsletterForm.addEventListener('submit', (e) => {
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
     4. SHOP PAGE CONTROLLER (Filters, Swatches, Price Slider, Sorting)
     ========================================================================== */
  function initShopPage() {
    const shopGrid = document.getElementById('shopProductsGrid');
    if (!shopGrid) return;

    const params = new URLSearchParams(window.location.search);
    const state = {
      category: params.get('category') || 'All',
      color: params.get('color') || 'All',
      maxPrice: parseInt(params.get('maxPrice'), 10) || 400,
      search: params.get('search') || '',
      sort: params.get('sort') || 'featured'
    };

    const catContainer = document.getElementById('shopCategoryFilters');
    const colorContainer = document.getElementById('shopColorFilters');
    const priceSlider = document.getElementById('shopPriceSlider');
    const priceLabel = document.getElementById('shopPriceValue');
    const searchInput = document.getElementById('shopSearchInput');
    const sortSelect = document.getElementById('shopSortSelect');
    const countLabel = document.getElementById('shopResultsCount');
    const activeFiltersBar = document.getElementById('activeFiltersBar');
    const clearAllBtn = document.getElementById('clearAllFiltersBtn');

    function renderFilterControls() {
      if (catContainer) {
        const allCats = ['All', ...categories.map((c) => c.id)];
        catContainer.innerHTML = allCats
          .map((catName) => {
            const count =
              catName === 'All'
                ? products.length
                : products.filter((p) => p.category === catName).length;
            return `
              <li>
                <button type="button" class="filter-btn ${state.category === catName ? 'is-active' : ''}" data-filter-cat="${catName}">
                  <span>${catName === 'All' ? 'All Silhouettes' : catName}</span>
                  <span style="font-size:0.75rem; opacity:0.7;">(${count})</span>
                </button>
              </li>
            `;
          })
          .join('');
      }

      if (colorContainer) {
        colorContainer.innerHTML = `
          <button type="button" class="filter-swatch-btn ${state.color === 'All' ? 'is-active' : ''}" data-filter-color="All">
            <span class="filter-swatch-circle" style="background: conic-gradient(#F4D9D0, #FAF6F0, #C9A66B, #2B2B2B, #C5CEBE, #F4D9D0);"></span>
            <span>All</span>
          </button>
          ${colors
            .map(
              (c) => `
            <button type="button" class="filter-swatch-btn ${state.color === c.key ? 'is-active' : ''}" data-filter-color="${c.key}" title="${c.name}">
              <span class="filter-swatch-circle" style="background-color: ${c.hex};"></span>
              <span>${c.name.split(' ')[0]}</span>
            </button>
          `
            )
            .join('')}
        `;
      }

      if (priceSlider) {
        priceSlider.value = state.maxPrice;
      }
      if (priceLabel) {
        priceLabel.textContent = `$${state.maxPrice}`;
      }
      if (searchInput) {
        searchInput.value = state.search;
      }
      if (sortSelect) {
        sortSelect.value = state.sort;
      }
    }

    function applyFiltersAndRender() {
      let filtered = products.filter((prod) => {
        if (state.category !== 'All' && prod.category !== state.category) {
          return false;
        }
        if (
          state.color !== 'All' &&
          !prod.colors.some((c) => c.name.toLowerCase() === state.color.toLowerCase())
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
        filtered.sort((a, b) => a.price - b.price);
      } else if (state.sort === 'price-desc') {
        filtered.sort((a, b) => b.price - a.price);
      } else if (state.sort === 'newest') {
        filtered.sort((a, b) => Number(b.isNew) - Number(a.isNew));
      } else if (state.sort === 'name-asc') {
        filtered.sort((a, b) => a.name.localeCompare(b.name));
      }

      if (countLabel) {
        countLabel.textContent = `Showing ${filtered.length} of ${products.length} handcrafted pieces`;
      }

      // Render active filter chips
      if (activeFiltersBar) {
        const chips = [];
        if (state.category !== 'All') {
          chips.push(`<button type="button" class="filter-chip" data-clear-filter="category">Category: ${state.category} &times;</button>`);
        }
        if (state.color !== 'All') {
          chips.push(`<button type="button" class="filter-chip" data-clear-filter="color">Hue: ${state.color} &times;</button>`);
        }
        if (state.maxPrice < 400) {
          chips.push(`<button type="button" class="filter-chip" data-clear-filter="price">Under $${state.maxPrice} &times;</button>`);
        }
        if (state.search.trim()) {
          chips.push(`<button type="button" class="filter-chip" data-clear-filter="search">Search: "${state.search}" &times;</button>`);
        }
        activeFiltersBar.innerHTML = chips.join('');
      }

      if (filtered.length === 0) {
        shopGrid.innerHTML = `
          <div style="grid-column: 1 / -1; text-align:center; padding: 4.5rem 1.5rem; background: var(--color-ivory-pure); border: var(--border-thin); border-radius: var(--radius-md);">
            <h3 style="font-size:1.75rem; margin-bottom:0.65rem;">No pieces match your current selection</h3>
            <p style="color:var(--color-charcoal-soft); margin-bottom:1.5rem;">Try broadening your price range or exploring another signature hue.</p>
            <button type="button" class="btn btn-primary" id="emptyResetFiltersBtn">Reset All Filters</button>
          </div>
        `;
        const resetBtn = document.getElementById('emptyResetFiltersBtn');
        if (resetBtn) resetBtn.addEventListener('click', resetAllFilters);
        return;
      }

      shopGrid.innerHTML = filtered
        .map((p, idx) => renderProductCard(p, idx))
        .join('');

      if (window.observeReveals) window.observeReveals();
    }

    function resetAllFilters() {
      state.category = 'All';
      state.color = 'All';
      state.maxPrice = 400;
      state.search = '';
      state.sort = 'featured';
      renderFilterControls();
      applyFiltersAndRender();
    }

    // Event Listeners
    if (catContainer) {
      catContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-filter-cat]');
        if (btn) {
          state.category = btn.getAttribute('data-filter-cat');
          renderFilterControls();
          applyFiltersAndRender();
        }
      });
    }

    if (colorContainer) {
      colorContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-filter-color]');
        if (btn) {
          state.color = btn.getAttribute('data-filter-color');
          renderFilterControls();
          applyFiltersAndRender();
        }
      });
    }

    if (priceSlider) {
      priceSlider.addEventListener('input', (e) => {
        state.maxPrice = parseInt(e.target.value, 10);
        if (priceLabel) priceLabel.textContent = `$${state.maxPrice}`;
        applyFiltersAndRender();
      });
    }

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        state.search = e.target.value;
        applyFiltersAndRender();
      });
    }

    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        state.sort = e.target.value;
        applyFiltersAndRender();
      });
    }

    if (activeFiltersBar) {
      activeFiltersBar.addEventListener('click', (e) => {
        const chip = e.target.closest('[data-clear-filter]');
        if (!chip) return;
        const type = chip.getAttribute('data-clear-filter');
        if (type === 'category') state.category = 'All';
        if (type === 'color') state.color = 'All';
        if (type === 'price') state.maxPrice = 400;
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
     5. PRODUCT DETAIL PAGE CONTROLLER (Gallery Zoom, Swatches, Related)
     ========================================================================== */
  function initProductDetailPage() {
    const pdpRoot = document.getElementById('pdpDetailContainer');
    if (!pdpRoot) return;

    const params = new URLSearchParams(window.location.search);
    const productId = params.get('id') || 'aurelia-tote';
    const product =
      products.find((p) => p.id === productId) || products[0];

    document.title = `${product.name} | Handle & Hue — Carry your color`;

    let selectedColor = product.primaryColor;
    let quantity = 1;

    // Update Breadcrumbs
    const bcCategory = document.getElementById('pdpBreadcrumbCategory');
    const bcName = document.getElementById('pdpBreadcrumbName');
    if (bcCategory) {
      bcCategory.textContent = product.category;
      bcCategory.href = `shop.html?category=${encodeURIComponent(product.category)}`;
    }
    if (bcName) bcName.textContent = product.name;

    const galleryViews = [
      { key: 'primary', label: 'Studio Front View', src: product.images.primary },
      { key: 'secondary', label: 'Three-Quarter Plinth View', src: product.images.secondary },
      { key: 'detail', label: 'Hardware & Leather Detail', src: product.images.detail },
      { key: 'lifestyle', label: 'Atelier Edition View', src: product.images.lifestyle }
    ];

    const wished = store.isInWishlist(product.id);

    pdpRoot.innerHTML = `
      <div class="pdp-gallery">
        <div class="pdp-thumbs" id="pdpThumbs">
          ${galleryViews
            .map(
              (v, idx) => `
            <button type="button" class="pdp-thumb-btn ${idx === 0 ? 'is-active' : ''}" data-thumb-src="${v.src}" aria-label="${v.label}">
              <img src="${v.src}" alt="${v.label}">
            </button>
          `
            )
            .join('')}
        </div>
        <div class="pdp-main-stage" id="pdpZoomStage" title="Move cursor to inspect leather grain and hardware">
          <img src="${product.images.primary}" alt="${product.name}" id="pdpMainImage">
          <span class="pdp-zoom-hint">Hover to Magnify</span>
        </div>
      </div>

      <div class="pdp-info">
        <span class="eyebrow">${product.category} &bull; SKU: ${product.sku}</span>
        <h1 class="pdp-info__title">${product.name}</h1>
        <p style="font-style:italic; font-family:var(--font-heading); font-size:1.2rem; color:var(--color-charcoal-soft); margin-bottom:1rem;">${product.subtitle}</p>

        <div class="pdp-info__price-row">
          <span class="pdp-info__price">$${product.price}</span>
          <span class="pdp-info__rating">&#9733;&#9733;&#9733;&#9733;&#9733; ${product.rating} (${product.reviewsCount} Atelier Reviews)</span>
        </div>

        <p class="pdp-info__desc">${product.description}</p>

        <div class="pdp-option-block">
          <label class="pdp-option-label">Selected Hue: <span id="pdpSelectedColorName">${selectedColor}</span></label>
          <div class="pdp-swatches" id="pdpSwatches">
            ${product.colors
              .map(
                (c, i) => `
              <button type="button" class="pdp-swatch-btn ${i === 0 ? 'is-active' : ''}" style="background-color:${c.hex};" data-pdp-color="${c.name}" title="${c.name}" aria-label="Select ${c.name}"></button>
            `
              )
              .join('')}
          </div>
        </div>

        <div class="pdp-dimensions-card">
          <div class="pdp-dim-item">
            <span>Dimensions</span>
            <strong>${product.dimensions.split('(')[0].trim()}</strong>
          </div>
          <div class="pdp-dim-item">
            <span>Strap Drop</span>
            <strong>${product.strapDrop.split('|')[0].trim()}</strong>
          </div>
          <div class="pdp-dim-item">
            <span>Weight</span>
            <strong>${product.weight}</strong>
          </div>
        </div>

        <div class="pdp-actions-row">
          <div class="qty-selector" aria-label="Quantity">
            <button type="button" id="pdpQtyMinus" aria-label="Decrease quantity">&minus;</button>
            <input type="text" id="pdpQtyInput" value="1" readonly aria-label="Quantity">
            <button type="button" id="pdpQtyPlus" aria-label="Increase quantity">+</button>
          </div>
          <button type="button" class="btn btn-primary" id="pdpAddToCartBtn" style="flex:1;">
            Add to Shopping Bag &mdash; $${product.price}
          </button>
          <button type="button" class="btn btn-outline ${wished ? 'is-active' : ''}" id="pdpWishlistBtn" data-wishlist-btn="${product.id}" aria-label="Add to Wishlist" style="padding:0.95rem 1.25rem;">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="${wished ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.7">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </button>
        </div>

        <div class="pdp-accordions">
          <div class="accordion-item is-open">
            <button type="button" class="accordion-trigger">
              <span>Materials &amp; Italian Craftsmanship</span>
              <span>&plus;</span>
            </button>
            <div class="accordion-content">
              <p>${product.materials}</p>
              <p style="margin-top:0.5rem;"><strong>Interior Capacity:</strong> ${product.capacity}.</p>
            </div>
          </div>
          <div class="accordion-item">
            <button type="button" class="accordion-trigger">
              <span>Size, Strap &amp; Fit Specifications</span>
              <span>&plus;</span>
            </button>
            <div class="accordion-content">
              <p>Full Measurements: ${product.dimensions}<br>Strap Configuration: ${product.strapDrop}<br>Unladen Weight: ${product.weight}</p>
            </div>
          </div>
          <div class="accordion-item">
            <button type="button" class="accordion-trigger">
              <span>Complimentary Delivery, Packaging &amp; Care</span>
              <span>&plus;</span>
            </button>
            <div class="accordion-content">
              <p>Every Handle &amp; Hue piece arrives in our signature blush linen dust bag and embossed ivory presentation box. Complimentary express shipping on orders over $250 and 30-day boutique returns.</p>
            </div>
          </div>
        </div>
      </div>
    `;

    // Bind Gallery Thumbnails & Interactive Hover Zoom
    const mainImg = document.getElementById('pdpMainImage');
    const zoomStage = document.getElementById('pdpZoomStage');
    const thumbsContainer = document.getElementById('pdpThumbs');

    if (thumbsContainer && mainImg) {
      thumbsContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-thumb-src]');
        if (!btn) return;
        mainImg.src = btn.getAttribute('data-thumb-src');
        thumbsContainer
          .querySelectorAll('.pdp-thumb-btn')
          .forEach((b) => b.classList.remove('is-active'));
        btn.classList.add('is-active');
      });
    }

    if (zoomStage && mainImg) {
      zoomStage.addEventListener('mousemove', (e) => {
        const rect = zoomStage.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        mainImg.style.transformOrigin = `${x}% ${y}%`;
        mainImg.style.transform = 'scale(1.65)';
      });
      zoomStage.addEventListener('mouseleave', () => {
        mainImg.style.transform = 'scale(1)';
        mainImg.style.transformOrigin = 'center center';
      });
    }

    // Bind Color Swatches
    const swatchesContainer = document.getElementById('pdpSwatches');
    const colorNameSpan = document.getElementById('pdpSelectedColorName');
    if (swatchesContainer) {
      swatchesContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-pdp-color]');
        if (!btn) return;
        selectedColor = btn.getAttribute('data-pdp-color');
        if (colorNameSpan) colorNameSpan.textContent = selectedColor;
        swatchesContainer
          .querySelectorAll('.pdp-swatch-btn')
          .forEach((b) => b.classList.remove('is-active'));
        btn.classList.add('is-active');
      });
    }

    // Bind Quantity & Add to Cart
    const qtyInput = document.getElementById('pdpQtyInput');
    const minusBtn = document.getElementById('pdpQtyMinus');
    const plusBtn = document.getElementById('pdpQtyPlus');
    const addBtn = document.getElementById('pdpAddToCartBtn');

    if (minusBtn && plusBtn && qtyInput) {
      minusBtn.addEventListener('click', () => {
        if (quantity > 1) {
          quantity--;
          qtyInput.value = quantity;
          if (addBtn)
            addBtn.innerHTML = `Add to Shopping Bag &mdash; $${(product.price * quantity).toLocaleString()}`;
        }
      });
      plusBtn.addEventListener('click', () => {
        quantity++;
        qtyInput.value = quantity;
        if (addBtn)
          addBtn.innerHTML = `Add to Shopping Bag &mdash; $${(product.price * quantity).toLocaleString()}`;
      });
    }

    if (addBtn) {
      addBtn.addEventListener('click', () => {
        store.addToCart(product.id, selectedColor, quantity, true);
      });
    }

    // Bind Accordions
    pdpRoot.querySelectorAll('.accordion-trigger').forEach((trigger) => {
      trigger.addEventListener('click', () => {
        const item = trigger.closest('.accordion-item');
        if (item) item.classList.toggle('is-open');
      });
    });

    // Populate "You May Also Like" Related Products
    const relatedGrid = document.getElementById('relatedProductsGrid');
    if (relatedGrid) {
      const related = products
        .filter((p) => p.id !== product.id)
        .sort((a, b) => Number(b.category === product.category) - Number(a.category === product.category))
        .slice(0, 4);
      relatedGrid.innerHTML = related
        .map((p, idx) => renderProductCard(p, idx))
        .join('');
    }

    if (window.observeReveals) window.observeReveals();
  }

  /* ==========================================================================
     6. CART & CHECKOUT PAGE CONTROLLER
     ========================================================================== */
  function initCartPage() {
    const cartItemsContainer = document.getElementById('cartPageItems');
    if (!cartItemsContainer) return;

    let discountRate = 0;
    let shippingCost = 0;
    const FREE_SHIPPING_THRESHOLD = 250;

    const shippingMeterText = document.getElementById('shippingMeterText');
    const shippingMeterFill = document.getElementById('shippingMeterFill');
    const summarySubtotal = document.getElementById('summarySubtotal');
    const summaryDiscountRow = document.getElementById('summaryDiscountRow');
    const summaryDiscount = document.getElementById('summaryDiscount');
    const summaryShipping = document.getElementById('summaryShipping');
    const summaryTotal = document.getElementById('summaryTotal');
    const promoForm = document.getElementById('promoCodeForm');
    const promoInput = document.getElementById('promoCodeInput');
    const shippingSelect = document.getElementById('shippingMethodSelect');
    const checkoutForm = document.getElementById('checkoutForm');
    const orderSuccessBox = document.getElementById('orderConfirmationBox');

    function renderCartPage() {
      const cart = store.getCart();
      const subtotal = store.getCartSubtotal();

      // Update Free Shipping Meter
      const pct = Math.min(100, Math.round((subtotal / FREE_SHIPPING_THRESHOLD) * 100));
      if (shippingMeterFill) shippingMeterFill.style.width = `${pct}%`;
      if (shippingMeterText) {
        if (subtotal === 0) {
          shippingMeterText.innerHTML = `Enjoy <strong>Complimentary Express Courier</strong> on all orders over $${FREE_SHIPPING_THRESHOLD}.`;
        } else if (subtotal >= FREE_SHIPPING_THRESHOLD) {
          shippingMeterText.innerHTML = `&#10022; Your order qualifies for <strong>Complimentary Express Boutique Delivery</strong>.`;
        } else {
          const diff = FREE_SHIPPING_THRESHOLD - subtotal;
          shippingMeterText.innerHTML = `Add <strong>$${diff}</strong> more to unlock Complimentary Express Delivery.`;
        }
      }

      if (cart.length === 0) {
        cartItemsContainer.innerHTML = `
          <div style="text-align:center; padding: 3.5rem 1rem;">
            <h3 style="font-size: 1.85rem; margin-bottom: 0.65rem;">Your shopping bag is currently empty</h3>
            <p style="color: var(--color-charcoal-soft); margin-bottom: 2rem;">Discover our sculptural silhouettes crafted in full-grain Italian calfskin.</p>
            <a href="shop.html" class="btn btn-primary">Shop the Collection</a>
          </div>
        `;
      } else {
        cartItemsContainer.innerHTML = cart
          .map(
            (item) => `
          <div class="cart-row">
            <a href="product.html?id=${encodeURIComponent(item.id)}">
              <img src="${item.image}" alt="${item.name}" class="cart-row__img">
            </a>
            <div>
              <span style="font-size:0.7rem; text-transform:uppercase; letter-spacing:0.18em; color:var(--color-charcoal-muted);">${item.category}</span>
              <h3 style="font-size:1.35rem; margin-bottom:0.25rem;">
                <a href="product.html?id=${encodeURIComponent(item.id)}">${item.name}</a>
              </h3>
              <p style="font-size:0.84rem; color:var(--color-charcoal-soft); margin-bottom:0.5rem;">Selected Hue: <strong>${item.color}</strong> &bull; Unit Price: $${item.price}</p>
              <button type="button" style="font-size:0.72rem; text-transform:uppercase; letter-spacing:0.15em; color:var(--color-charcoal-muted); border-bottom:1px solid var(--color-gold);" data-cart-remove="${item.id}" data-cart-color="${item.color}">Remove Item</button>
            </div>
            <div class="qty-selector">
              <button type="button" data-cart-qty="${item.id}" data-cart-color="${item.color}" data-delta="-1" aria-label="Decrease quantity">&minus;</button>
              <input type="text" value="${item.qty}" readonly aria-label="Quantity">
              <button type="button" data-cart-qty="${item.id}" data-cart-color="${item.color}" data-delta="1" aria-label="Increase quantity">+</button>
            </div>
            <div style="font-size:1.1rem; font-weight:500; min-width:75px; text-align:right;">
              $${(item.price * item.qty).toLocaleString()}
            </div>
          </div>
        `
          )
          .join('');
      }

      // Summary Totals
      const discountAmount = Math.round(subtotal * discountRate);
      const effectiveShipping = subtotal === 0 ? 0 : shippingCost;
      const total = Math.max(0, subtotal - discountAmount + effectiveShipping);

      if (summarySubtotal) summarySubtotal.textContent = `$${subtotal.toLocaleString()}`;
      if (summaryDiscountRow && summaryDiscount) {
        summaryDiscountRow.style.display = discountAmount > 0 ? 'flex' : 'none';
        summaryDiscount.textContent = `-$${discountAmount.toLocaleString()}`;
      }
      if (summaryShipping) {
        summaryShipping.textContent =
          effectiveShipping === 0 ? 'Complimentary' : `$${effectiveShipping}`;
      }
      if (summaryTotal) summaryTotal.textContent = `$${total.toLocaleString()}`;
    }

    cartItemsContainer.addEventListener('click', (e) => {
      const qtyBtn = e.target.closest('[data-cart-qty]');
      if (qtyBtn) {
        const id = qtyBtn.getAttribute('data-cart-qty');
        const color = qtyBtn.getAttribute('data-cart-color');
        const delta = parseInt(qtyBtn.getAttribute('data-delta'), 10);
        const item = store.getCart().find((i) => i.id === id && i.color === color);
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
      promoForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const code = promoInput.value.trim().toUpperCase();
        if (code === 'HUE10' || code === 'WELCOME10') {
          discountRate = 0.1;
          store.showToast('Privilege code applied: 10% off your order.');
          renderCartPage();
        } else {
          store.showToast('Invalid code. Try HUE10 for 10% off.');
        }
      });
    }

    if (shippingSelect) {
      shippingSelect.addEventListener('change', (e) => {
        shippingCost = parseInt(e.target.value, 10) || 0;
        renderCartPage();
      });
    }

    if (checkoutForm) {
      checkoutForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (store.getCartCount() === 0) {
          store.showToast('Your shopping bag is empty. Please add a piece before checkout.');
          return;
        }
        const orderRef = `HH-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
        const customerName =
          document.getElementById('checkoutFirstName')?.value || 'Valued Guest';
        const totalText = summaryTotal ? summaryTotal.textContent : '';

        store.clearCart();
        checkoutForm.reset();

        if (orderSuccessBox) {
          orderSuccessBox.style.display = 'block';
          orderSuccessBox.innerHTML = `
            <span class="eyebrow">Atelier Order Confirmed</span>
            <h3 style="font-size:2rem; margin-bottom:0.5rem;">Thank you, ${customerName}</h3>
            <p style="color:var(--color-charcoal-soft); margin-bottom:1rem;">
              Your order <strong>#${orderRef}</strong> (${totalText}) has been received by our craftsmanship studio and is being prepared in signature blush &amp; champagne gold packaging.
            </p>
            <a href="shop.html" class="btn btn-gold">Continue Exploring</a>
          `;
          orderSuccessBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        store.showToast(`Order ${orderRef} confirmed! Thank you for shopping with Handle & Hue.`);
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
      contactForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = contactForm.querySelector('[name="name"]')?.value || 'Guest';
        store.showToast(`Thank you, ${name}. Our Atelier Concierge will reply within 24 hours.`);
        if (feedbackEl) {
          feedbackEl.style.display = 'block';
          feedbackEl.textContent = `Thank you, ${name}. Your message has been received by the Handle & Hue Concierge.`;
        }
        contactForm.reset();
      });
    }

    document.querySelectorAll('.faq-accordion .accordion-trigger').forEach((btn) => {
      btn.addEventListener('click', () => {
        const item = btn.closest('.accordion-item');
        if (item) item.classList.toggle('is-open');
      });
    });
  }

  /* ==========================================================================
     Initialize Everything on DOMContentLoaded
     ========================================================================== */
  document.addEventListener('DOMContentLoaded', () => {
    initHeaderAndDrawers();
    initHomePage();
    initShopPage();
    initProductDetailPage();
    initCartPage();
    initContactPage();
  });
})();
