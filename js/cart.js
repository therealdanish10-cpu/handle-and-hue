/**
 * ============================================================================
 * HANDLE & HUE — Cart & Wishlist State Manager (js/cart.js)
 * ============================================================================
 * Persists shopping bag and wishlist items in localStorage.
 * Synchronizes navbar badges, slide-in drawers, and toast notifications.
 * ============================================================================
 */

(function () {
  'use strict';

  const CART_STORAGE_KEY = 'handle_hue_cart_v1';
  const WISHLIST_STORAGE_KEY = 'handle_hue_wishlist_v1';

  function findProduct(productId) {
    return (window.HANDLE_HUE_PRODUCTS || []).find((p) => p.id === productId);
  }

  /* ------------------------------------------------------------------------
     Cart Operations
     ------------------------------------------------------------------------ */
  function getCart() {
    try {
      const raw = localStorage.getItem(CART_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function saveCart(cart) {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch (e) {
      // Ignore storage quota errors
    }
    syncCartUI();
    window.dispatchEvent(new CustomEvent('handlehue:cart-updated', { detail: { cart } }));
  }

  function addToCart(productId, colorName, quantity = 1, openDrawer = false) {
    const product = findProduct(productId);
    if (!product) return;

    const selectedColor =
      colorName ||
      product.primaryColor ||
      (product.colors && product.colors[0] ? product.colors[0].name : 'Signature Hue');

    const cart = getCart();
    const existingIndex = cart.findIndex(
      (item) => item.id === productId && item.color === selectedColor
    );

    if (existingIndex > -1) {
      cart[existingIndex].qty += Number(quantity) || 1;
    } else {
      cart.push({
        id: product.id,
        name: product.name,
        price: product.price,
        color: selectedColor,
        image: product.images.primary,
        category: product.category,
        qty: Number(quantity) || 1
      });
    }

    saveCart(cart);
    showToast(`Added "${product.name}" (${selectedColor}) to your bag.`);

    if (openDrawer) {
      openSideDrawer('cartDrawer');
    }
  }

  function updateQuantity(productId, colorName, newQty) {
    let cart = getCart();
    const idx = cart.findIndex((item) => item.id === productId && item.color === colorName);
    if (idx === -1) return;

    if (newQty <= 0) {
      cart.splice(idx, 1);
    } else {
      cart[idx].qty = newQty;
    }
    saveCart(cart);
  }

  function removeFromCart(productId, colorName) {
    const cart = getCart().filter(
      (item) => !(item.id === productId && item.color === colorName)
    );
    saveCart(cart);
    showToast('Item removed from your shopping bag.');
  }

  function clearCart() {
    saveCart([]);
  }

  function getCartCount() {
    return getCart().reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
  }

  function getCartSubtotal() {
    return getCart().reduce((sum, item) => sum + item.price * item.qty, 0);
  }

  /* ------------------------------------------------------------------------
     Wishlist Operations
     ------------------------------------------------------------------------ */
  function getWishlist() {
    try {
      const raw = localStorage.getItem(WISHLIST_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function saveWishlist(list) {
    try {
      localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      // Ignore storage errors
    }
    syncWishlistUI();
    window.dispatchEvent(new CustomEvent('handlehue:wishlist-updated', { detail: { list } }));
  }

  function isInWishlist(productId) {
    return getWishlist().includes(productId);
  }

  function toggleWishlist(productId) {
    const product = findProduct(productId);
    let list = getWishlist();
    const exists = list.includes(productId);

    if (exists) {
      list = list.filter((id) => id !== productId);
      saveWishlist(list);
      if (product) showToast(`Removed "${product.name}" from your wishlist.`);
      return false;
    } else {
      list.push(productId);
      saveWishlist(list);
      if (product) showToast(`Saved "${product.name}" to your wishlist.`);
      return true;
    }
  }

  /* ------------------------------------------------------------------------
     UI Synchronization (Badges, Drawers, Toast)
     ------------------------------------------------------------------------ */
  function syncCartUI() {
    const count = getCartCount();
    document.querySelectorAll('[data-cart-count]').forEach((badge) => {
      badge.textContent = count;
      badge.style.display = count > 0 ? 'flex' : 'none';
    });
    renderCartDrawer();
  }

  function syncWishlistUI() {
    const list = getWishlist();
    const count = list.length;
    document.querySelectorAll('[data-wishlist-count]').forEach((badge) => {
      badge.textContent = count;
      badge.style.display = count > 0 ? 'flex' : 'none';
    });

    // Update heart buttons across page
    document.querySelectorAll('[data-wishlist-btn]').forEach((btn) => {
      const id = btn.getAttribute('data-wishlist-btn');
      const active = list.includes(id);
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });

    renderWishlistDrawer();
  }

  function renderCartDrawer() {
    const bodyEl = document.getElementById('cartDrawerBody');
    const subtotalEl = document.getElementById('cartDrawerSubtotal');
    if (!bodyEl) return;

    const cart = getCart();
    if (subtotalEl) {
      subtotalEl.textContent = `$${getCartSubtotal().toLocaleString()}`;
    }

    if (cart.length === 0) {
      bodyEl.innerHTML = `
        <div style="text-align:center; padding: 3.5rem 1rem;">
          <p style="font-family: var(--font-heading); font-size: 1.45rem; margin-bottom: 0.6rem;">Your atelier bag is empty</p>
          <p style="font-size: 0.88rem; color: var(--color-charcoal-soft); margin-bottom: 1.75rem;">Explore our signature silhouettes and carry your color.</p>
          <a href="shop.html" class="btn btn-primary">Explore the Collection</a>
        </div>
      `;
      return;
    }

    bodyEl.innerHTML = cart
      .map(
        (item) => `
      <div class="drawer-item">
        <a href="product.html?id=${encodeURIComponent(item.id)}">
          <img src="${item.image}" alt="${item.name}" class="drawer-item-img">
        </a>
        <div>
          <a href="product.html?id=${encodeURIComponent(item.id)}" class="drawer-item-title">${item.name}</a>
          <div class="drawer-item-meta">Hue: ${item.color} &bull; $${item.price}</div>
          <div class="drawer-qty">
            <button type="button" aria-label="Decrease quantity" data-drawer-qty="${item.id}" data-drawer-color="${item.color}" data-delta="-1">&minus;</button>
            <span>${item.qty}</span>
            <button type="button" aria-label="Increase quantity" data-drawer-qty="${item.id}" data-drawer-color="${item.color}" data-delta="1">+</button>
          </div>
        </div>
        <div style="text-align:right;">
          <div style="font-weight:500; margin-bottom:0.5rem;">$${(item.price * item.qty).toLocaleString()}</div>
          <button type="button" style="font-size:0.72rem; text-transform:uppercase; letter-spacing:0.12em; color:var(--color-charcoal-muted);" data-drawer-remove="${item.id}" data-drawer-color="${item.color}">Remove</button>
        </div>
      </div>
    `
      )
      .join('');
  }

  function renderWishlistDrawer() {
    const bodyEl = document.getElementById('wishlistDrawerBody');
    if (!bodyEl) return;

    const list = getWishlist();
    const items = list.map((id) => findProduct(id)).filter(Boolean);

    if (items.length === 0) {
      bodyEl.innerHTML = `
        <div style="text-align:center; padding: 3.5rem 1rem;">
          <p style="font-family: var(--font-heading); font-size: 1.45rem; margin-bottom: 0.6rem;">Your wishlist is empty</p>
          <p style="font-size: 0.88rem; color: var(--color-charcoal-soft); margin-bottom: 1.75rem;">Tap the heart icon on any piece to curate your personal edit.</p>
          <a href="shop.html" class="btn btn-outline">Discover Pieces</a>
        </div>
      `;
      return;
    }

    bodyEl.innerHTML = items
      .map(
        (prod) => `
      <div class="drawer-item">
        <a href="product.html?id=${encodeURIComponent(prod.id)}">
          <img src="${prod.images.primary}" alt="${prod.name}" class="drawer-item-img">
        </a>
        <div>
          <a href="product.html?id=${encodeURIComponent(prod.id)}" class="drawer-item-title">${prod.name}</a>
          <div class="drawer-item-meta">${prod.primaryColor} &bull; $${prod.price}</div>
          <button type="button" class="link-arrow" style="font-size:0.68rem;" data-wishlist-move="${prod.id}">Move to Bag</button>
        </div>
        <button type="button" aria-label="Remove from wishlist" style="font-size:1.1rem; color:var(--color-charcoal-muted);" data-wishlist-remove="${prod.id}">&times;</button>
      </div>
    `
      )
      .join('');
  }

  /* ------------------------------------------------------------------------
     Drawer & Toast Helpers
     ------------------------------------------------------------------------ */
  function openSideDrawer(drawerId) {
    closeAllDrawers();
    const drawer = document.getElementById(drawerId);
    const backdrop = document.getElementById('drawerBackdrop');
    if (drawer) {
      drawer.classList.add('is-open');
      drawer.setAttribute('aria-hidden', 'false');
    }
    if (backdrop) backdrop.classList.add('is-open');
    document.body.classList.add('drawer-open');
  }

  function closeAllDrawers() {
    document
      .querySelectorAll('.side-drawer, .mobile-nav-drawer, .search-overlay')
      .forEach((el) => {
        el.classList.remove('is-open');
        el.setAttribute('aria-hidden', 'true');
      });
    const backdrop = document.getElementById('drawerBackdrop');
    if (backdrop) backdrop.classList.remove('is-open');
    document.body.classList.remove('drawer-open');
  }

  function showToast(message) {
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.className = 'toast-container';
      container.setAttribute('aria-live', 'polite');
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
      <span style="color: var(--color-gold); font-size:1rem;">&#10022;</span>
      <span>${message}</span>
    `;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.35s ease';
      setTimeout(() => toast.remove(), 350);
    }, 3200);
  }

  // Event delegation for drawer controls
  document.addEventListener('click', (e) => {
    const qtyBtn = e.target.closest('[data-drawer-qty]');
    if (qtyBtn) {
      const id = qtyBtn.getAttribute('data-drawer-qty');
      const color = qtyBtn.getAttribute('data-drawer-color');
      const delta = parseInt(qtyBtn.getAttribute('data-delta'), 10);
      const cart = getCart();
      const item = cart.find((i) => i.id === id && i.color === color);
      if (item) updateQuantity(id, color, item.qty + delta);
      return;
    }

    const rmBtn = e.target.closest('[data-drawer-remove]');
    if (rmBtn) {
      removeFromCart(
        rmBtn.getAttribute('data-drawer-remove'),
        rmBtn.getAttribute('data-drawer-color')
      );
      return;
    }

    const wishMove = e.target.closest('[data-wishlist-move]');
    if (wishMove) {
      const id = wishMove.getAttribute('data-wishlist-move');
      addToCart(id, null, 1, true);
      return;
    }

    const wishRm = e.target.closest('[data-wishlist-remove]');
    if (wishRm) {
      toggleWishlist(wishRm.getAttribute('data-wishlist-remove'));
      return;
    }
  });

  window.HandleHueStore = {
    getCart,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    getCartCount,
    getCartSubtotal,
    getWishlist,
    toggleWishlist,
    isInWishlist,
    syncCartUI,
    syncWishlistUI,
    openSideDrawer,
    closeAllDrawers,
    showToast
  };

  document.addEventListener('DOMContentLoaded', () => {
    syncCartUI();
    syncWishlistUI();
  });
})();
