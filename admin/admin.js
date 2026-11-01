/**
 * ============================================================================
 * HANDLE & HUE — Private Atelier Admin Controller (admin/admin.js)
 * ============================================================================
 * Features:
 * - Supabase Auth email/password sign-in, session persistence, and sign-out
 * - Strict unauthenticated guard (shows only login screen when logged out)
 * - Products CRUD (Search, Category filter, Quick Toggles for in_stock, is_new,
 *   is_bestseller, is_featured, Delete confirmation)
 * - Add/Edit Product Modal with auto-slug, Color Swatch Editor, and Multi-Image
 *   upload to Supabase Storage bucket `product-images` + drag-and-drop reorder
 * - Global Boutique Settings editor (WhatsApp number, shipping fee, free
 *   shipping threshold, announcement bar text)
 * - Full HTML escaping (`escapeHTML`) for XSS protection
 * ============================================================================
 */

(function () {
  'use strict';

  const escapeHTML =
    window.escapeHTML ||
    function (value) {
      if (value === null || value === undefined) return '';
      return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    };

  const formatPKR =
    window.formatPKR ||
    function (amount) {
      const numeric = Math.round(Number(amount) || 0);
      return 'Rs. ' + numeric.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    };

  const supabase =
    window.HandleHueSupabase ||
    (window.supabase &&
    typeof window.supabase.createClient === 'function' &&
    window.SUPABASE_URL &&
    window.SUPABASE_ANON_KEY
      ? window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY)
      : null);

  /* ------------------------------------------------------------------------
     DOM Elements
     ------------------------------------------------------------------------ */
  const loginScreen = document.getElementById('adminLoginScreen');
  const appScreen = document.getElementById('adminAppScreen');
  const loginForm = document.getElementById('adminLoginForm');
  const loginEmailInput = document.getElementById('loginEmail');
  const loginPasswordInput = document.getElementById('loginPassword');
  const loginSubmitBtn = document.getElementById('loginSubmitBtn');
  const loginErrorBanner = document.getElementById('loginErrorBanner');
  const adminUserEmail = document.getElementById('adminUserEmail');
  const adminLogoutBtn = document.getElementById('adminLogoutBtn');
  const dbNoticeBanner = document.getElementById('dbNoticeBanner');

  // Navigation Tabs
  const tabBtnProducts = document.getElementById('tabBtnProducts');
  const tabBtnSettings = document.getElementById('tabBtnSettings');
  const tabPanelProducts = document.getElementById('tabPanelProducts');
  const tabPanelSettings = document.getElementById('tabPanelSettings');

  // Stats
  const statTotalProducts = document.getElementById('statTotalProducts');
  const statInStock = document.getElementById('statInStock');
  const statNewArrivals = document.getElementById('statNewArrivals');
  const statFeatured = document.getElementById('statFeatured');

  // Products Toolbar & Table
  const refreshProductsBtn = document.getElementById('refreshProductsBtn');
  const openAddProductBtn = document.getElementById('openAddProductBtn');
  const adminSearchInput = document.getElementById('adminSearchInput');
  const adminCategoryFilter = document.getElementById('adminCategoryFilter');
  const adminProductsTableBody = document.getElementById('adminProductsTableBody');

  // Product Modal & Form
  const productModalBackdrop = document.getElementById('productModalBackdrop');
  const productModalTitle = document.getElementById('productModalTitle');
  const productModalEyebrow = document.getElementById('productModalEyebrow');
  const closeProductModalBtn = document.getElementById('closeProductModalBtn');
  const cancelProductModalBtn = document.getElementById('cancelProductModalBtn');
  const productEditorForm = document.getElementById('productEditorForm');
  const productFormError = document.getElementById('productFormError');
  const saveProductSubmitBtn = document.getElementById('saveProductSubmitBtn');

  const prodIdInput = document.getElementById('prodIdInput');
  const prodNameInput = document.getElementById('prodNameInput');
  const prodSlugInput = document.getElementById('prodSlugInput');
  const regenSlugBtn = document.getElementById('regenSlugBtn');
  const prodCategoryInput = document.getElementById('prodCategoryInput');
  const prodSortOrderInput = document.getElementById('prodSortOrderInput');
  const prodPriceInput = document.getElementById('prodPriceInput');
  const prodSalePriceInput = document.getElementById('prodSalePriceInput');
  const prodDimensionsInput = document.getElementById('prodDimensionsInput');
  const prodDescriptionInput = document.getElementById('prodDescriptionInput');
  const prodInStockInput = document.getElementById('prodInStockInput');
  const prodIsNewInput = document.getElementById('prodIsNewInput');
  const prodIsBestsellerInput = document.getElementById('prodIsBestsellerInput');
  const prodIsFeaturedInput = document.getElementById('prodIsFeaturedInput');

  const presetHuesBar = document.getElementById('presetHuesBar');
  const addColorRowBtn = document.getElementById('addColorRowBtn');
  const colorEditorRows = document.getElementById('colorEditorRows');

  const productImagesUploadInput = document.getElementById('productImagesUploadInput');
  const imageUploadStatus = document.getElementById('imageUploadStatus');
  const manualImageUrlInput = document.getElementById('manualImageUrlInput');
  const addManualImageBtn = document.getElementById('addManualImageBtn');
  const productImagesPreviewList = document.getElementById('productImagesPreviewList');

  // Delete Modal
  const deleteModalBackdrop = document.getElementById('deleteModalBackdrop');
  const deleteModalMessage = document.getElementById('deleteModalMessage');
  const closeDeleteModalBtn = document.getElementById('closeDeleteModalBtn');
  const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
  const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');

  // Settings Form
  const adminSettingsForm = document.getElementById('adminSettingsForm');
  const settingWhatsapp = document.getElementById('settingWhatsapp');
  const settingShippingFee = document.getElementById('settingShippingFee');
  const settingFreeThreshold = document.getElementById('settingFreeThreshold');
  const settingAnnouncement = document.getElementById('settingAnnouncement');
  const saveSettingsBtn = document.getElementById('saveSettingsBtn');

  /* ------------------------------------------------------------------------
     State
     ------------------------------------------------------------------------ */
  let currentSession = null;
  let adminProducts = [];
  let slugManuallyEdited = false;
  let editorColors = [];
  let editorImages = [];
  let dragSourceIndex = null;
  let pendingDeleteProduct = null;

  /* ------------------------------------------------------------------------
     Helpers: Toast, Slugify & Preview Image Path Resolution
     ------------------------------------------------------------------------ */
  function showToast(message, isError) {
    const container = document.getElementById('adminToastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'admin-toast' + (isError ? ' admin-toast--error' : '');
    toast.innerHTML =
      '<span style="color:var(--color-gold);">&#10022;</span>' +
      '<span>' +
      escapeHTML(message) +
      '</span>';
    container.appendChild(toast);

    setTimeout(function () {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(function () {
        toast.remove();
      }, 300);
    }, 3500);
  }

  function slugify(text) {
    return String(text || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80);
  }

  function resolveAdminPreviewSrc(url) {
    const raw = String(url || '').trim();
    if (!raw) return '../assets/images/products/aurelia-tote-primary.svg';
    if (
      raw.startsWith('http://') ||
      raw.startsWith('https://') ||
      raw.startsWith('data:') ||
      raw.startsWith('../') ||
      raw.startsWith('/')
    ) {
      return raw;
    }
    return '../' + raw;
  }

  function invalidatePublicCache() {
    if (window.HandleHueData && typeof window.HandleHueData.clearCache === 'function') {
      window.HandleHueData.clearCache();
    }
  }

  /* ------------------------------------------------------------------------
     1. Authentication & Session Management
     ------------------------------------------------------------------------ */
  function setAuthenticatedUI(session) {
    currentSession = session || null;
    if (currentSession && currentSession.user) {
      loginScreen.hidden = true;
      appScreen.hidden = false;
      if (adminUserEmail) {
        adminUserEmail.textContent = currentSession.user.email || 'Administrator';
      }
      loadAdminData();
    } else {
      currentSession = null;
      appScreen.hidden = true;
      productModalBackdrop.hidden = true;
      deleteModalBackdrop.hidden = true;
      loginScreen.hidden = false;
    }
  }

  async function initAuth() {
    if (!supabase) {
      showLoginError('Supabase client failed to initialize. Check js/config.js.');
      return;
    }

    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        setAuthenticatedUI(null);
      } else {
        setAuthenticatedUI(data ? data.session : null);
      }
    } catch (err) {
      setAuthenticatedUI(null);
    }

    supabase.auth.onAuthStateChange(function (_event, session) {
      setAuthenticatedUI(session);
    });
  }

  function showLoginError(msg) {
    if (!loginErrorBanner) return;
    if (!msg) {
      loginErrorBanner.hidden = true;
      loginErrorBanner.textContent = '';
    } else {
      loginErrorBanner.hidden = false;
      loginErrorBanner.textContent = msg;
    }
  }

  if (loginForm) {
    loginForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      showLoginError('');

      const email = (loginEmailInput.value || '').trim();
      const password = loginPasswordInput.value || '';

      if (!email || !password) {
        showLoginError('Please enter both your administrator email and password.');
        return;
      }

      loginSubmitBtn.disabled = true;
      loginSubmitBtn.textContent = 'Signing In...';

      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email,
          password: password
        });

        if (error) {
          showLoginError(error.message || 'Invalid login credentials.');
        } else if (data && data.session) {
          loginForm.reset();
          showToast('Signed in to Handle & Hue Atelier Console.');
          setAuthenticatedUI(data.session);
        }
      } catch (err) {
        showLoginError('Network error while signing in. Please try again.');
      } finally {
        loginSubmitBtn.disabled = false;
        loginSubmitBtn.textContent = 'Sign In to Atelier';
      }
    });
  }

  if (adminLogoutBtn) {
    adminLogoutBtn.addEventListener('click', async function () {
      adminLogoutBtn.disabled = true;
      try {
        await supabase.auth.signOut();
        showToast('You have been signed out.');
        setAuthenticatedUI(null);
      } catch (err) {
        showToast('Error signing out.', true);
      } finally {
        adminLogoutBtn.disabled = false;
      }
    });
  }

  /* ------------------------------------------------------------------------
     2. Tab Switching (Products vs Settings)
     ------------------------------------------------------------------------ */
  function switchAdminTab(tabKey) {
    const isProducts = tabKey === 'products';
    tabBtnProducts.classList.toggle('is-active', isProducts);
    tabBtnSettings.classList.toggle('is-active', !isProducts);
    tabPanelProducts.hidden = !isProducts;
    tabPanelSettings.hidden = isProducts;
  }

  if (tabBtnProducts) {
    tabBtnProducts.addEventListener('click', function () {
      switchAdminTab('products');
    });
  }
  if (tabBtnSettings) {
    tabBtnSettings.addEventListener('click', function () {
      switchAdminTab('settings');
    });
  }

  /* ------------------------------------------------------------------------
     3. Load Products & Settings from Supabase
     ------------------------------------------------------------------------ */
  async function loadAdminData() {
    if (!currentSession) return;
    await Promise.all([fetchAdminProducts(), fetchAdminSettings()]);
  }

  async function fetchAdminProducts() {
    if (!supabase || !currentSession) return;

    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) {
        if (dbNoticeBanner) {
          dbNoticeBanner.hidden = false;
          dbNoticeBanner.innerHTML =
            '<strong>Database setup required:</strong> Could not query <code>public.products</code> (' +
            escapeHTML(error.message) +
            '). Run <code>supabase/schema.sql</code> in your Supabase SQL Editor first.';
        }
        adminProducts = [];
      } else {
        if (dbNoticeBanner) dbNoticeBanner.hidden = true;
        adminProducts = Array.isArray(data) ? data : [];
      }
    } catch (err) {
      adminProducts = [];
    }

    updateStatsUI();
    renderProductsTable();
  }

  async function fetchAdminSettings() {
    if (!supabase || !currentSession) return;

    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        settingWhatsapp.value = String(data.whatsapp_number || '923469377256').replace(
          /\D/g,
          ''
        );
        settingShippingFee.value =
          data.shipping_fee !== undefined && data.shipping_fee !== null
            ? data.shipping_fee
            : 250;
        settingFreeThreshold.value =
          data.free_shipping_threshold !== undefined &&
          data.free_shipping_threshold !== null
            ? data.free_shipping_threshold
            : 10000;
        settingAnnouncement.value =
          data.announcement_text !== undefined && data.announcement_text !== null
            ? data.announcement_text
            : '';
        return;
      }
    } catch (err) {
      // Fallback to defaults below
    }

    settingWhatsapp.value = '923469377256';
    settingShippingFee.value = 250;
    settingFreeThreshold.value = 10000;
    settingAnnouncement.value =
      'Free Nationwide Delivery Across Pakistan Over Rs. 10,000 • Welcome Privilege Code: HUE10';
  }

  /* ------------------------------------------------------------------------
     4. Render Stats & Products Table
     ------------------------------------------------------------------------ */
  function updateStatsUI() {
    const total = adminProducts.length;
    const inStockCount = adminProducts.filter(function (p) {
      return p.in_stock !== false;
    }).length;
    const newCount = adminProducts.filter(function (p) {
      return Boolean(p.is_new);
    }).length;
    const featuredCount = adminProducts.filter(function (p) {
      return Boolean(p.is_bestseller || p.is_featured);
    }).length;

    if (statTotalProducts) statTotalProducts.textContent = String(total);
    if (statInStock) statInStock.textContent = String(inStockCount);
    if (statNewArrivals) statNewArrivals.textContent = String(newCount);
    if (statFeatured) statFeatured.textContent = String(featuredCount);
  }

  function renderProductsTable() {
    if (!adminProductsTableBody) return;

    const query = (adminSearchInput ? adminSearchInput.value : '').trim().toLowerCase();
    const catFilter = adminCategoryFilter ? adminCategoryFilter.value : 'All';

    const filtered = adminProducts.filter(function (p) {
      if (catFilter !== 'All' && p.category !== catFilter) return false;
      if (query) {
        const match =
          String(p.name || '').toLowerCase().includes(query) ||
          String(p.slug || '').toLowerCase().includes(query) ||
          String(p.category || '').toLowerCase().includes(query);
        if (!match) return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      adminProductsTableBody.innerHTML =
        '<tr>' +
        '<td colspan="6" style="text-align:center; padding:3rem 1rem; color:var(--color-charcoal-soft);">' +
        (adminProducts.length === 0
          ? 'No products found in the database yet. Click <strong>+ Add New Piece</strong> or run <code>supabase/schema.sql</code> to seed the 14 atelier pieces.'
          : 'No pieces match your current search or category filter.') +
        '</td>' +
        '</tr>';
      return;
    }

    adminProductsTableBody.innerHTML = filtered
      .map(function (prod) {
        const id = escapeHTML(prod.id);
        const name = escapeHTML(prod.name);
        const slug = escapeHTML(prod.slug);
        const category = escapeHTML(prod.category);

        const imagesArr = Array.isArray(prod.images) ? prod.images : [];
        const mainImg = resolveAdminPreviewSrc(imagesArr[0]);

        const regPrice = Math.round(Number(prod.price) || 0);
        const salePrice =
          prod.sale_price !== null &&
          prod.sale_price !== undefined &&
          Number(prod.sale_price) > 0 &&
          Number(prod.sale_price) < regPrice
            ? Math.round(Number(prod.sale_price))
            : null;

        const priceHtml = salePrice
          ? '<div><strong>' +
            formatPKR(salePrice) +
            '</strong> <span style="font-size:0.78rem; color:var(--color-charcoal-muted); text-decoration:line-through;">' +
            formatPKR(regPrice) +
            '</span></div>'
          : '<strong>' + formatPKR(regPrice) + '</strong>';

        const inStock = prod.in_stock !== false;
        const statusBadge = inStock
          ? '<span class="admin-status-badge admin-status-badge--instock">In Stock</span>'
          : '<span class="admin-status-badge admin-status-badge--soldout">Sold Out</span>';

        return (
          '<tr data-row-id="' +
          id +
          '">' +
          '<td>' +
          '<div class="admin-prod-cell">' +
          '<img src="' +
          escapeHTML(mainImg) +
          '" alt="' +
          name +
          '" class="admin-prod-thumb">' +
          '<div>' +
          '<div class="admin-prod-name">' +
          name +
          '</div>' +
          '<div class="admin-prod-slug">/' +
          slug +
          '</div>' +
          '</div>' +
          '</div>' +
          '</td>' +
          '<td>' +
          category +
          '</td>' +
          '<td>' +
          priceHtml +
          '</td>' +
          '<td>' +
          statusBadge +
          '</td>' +
          '<td>' +
          '<div class="admin-flags-group">' +
          '<button type="button" class="admin-flag-toggle ' +
          (inStock ? 'is-on' : '') +
          '" data-quick-toggle="in_stock" data-prod-id="' +
          id +
          '" title="Toggle In Stock">' +
          'In Stock' +
          '</button>' +
          '<button type="button" class="admin-flag-toggle ' +
          (prod.is_new ? 'is-on' : '') +
          '" data-quick-toggle="is_new" data-prod-id="' +
          id +
          '" title="Toggle New Arrival">' +
          'New' +
          '</button>' +
          '<button type="button" class="admin-flag-toggle ' +
          (prod.is_bestseller ? 'is-on' : '') +
          '" data-quick-toggle="is_bestseller" data-prod-id="' +
          id +
          '" title="Toggle Bestseller">' +
          'Bestseller' +
          '</button>' +
          '<button type="button" class="admin-flag-toggle ' +
          (prod.is_featured ? 'is-on' : '') +
          '" data-quick-toggle="is_featured" data-prod-id="' +
          id +
          '" title="Toggle Featured">' +
          'Featured' +
          '</button>' +
          '</div>' +
          '</td>' +
          '<td>' +
          '<div class="admin-row-actions">' +
          '<button type="button" class="admin-btn admin-btn--outline admin-btn--sm" data-edit-prod="' +
          id +
          '">Edit</button>' +
          '<button type="button" class="admin-btn admin-btn--ghost admin-btn--sm" style="color:var(--color-danger);" data-delete-prod="' +
          id +
          '">Delete</button>' +
          '</div>' +
          '</td>' +
          '</tr>'
        );
      })
      .join('');
  }

  if (adminSearchInput) {
    adminSearchInput.addEventListener('input', renderProductsTable);
  }
  if (adminCategoryFilter) {
    adminCategoryFilter.addEventListener('change', renderProductsTable);
  }
  if (refreshProductsBtn) {
    refreshProductsBtn.addEventListener('click', function () {
      fetchAdminProducts();
      showToast('Inventory refreshed.');
    });
  }

  /* ------------------------------------------------------------------------
     5. Table Delegation: Quick Toggles, Edit & Delete
     ------------------------------------------------------------------------ */
  if (adminProductsTableBody) {
    adminProductsTableBody.addEventListener('click', async function (e) {
      const toggleBtn = e.target.closest('[data-quick-toggle]');
      if (toggleBtn) {
        const field = toggleBtn.getAttribute('data-quick-toggle');
        const prodId = toggleBtn.getAttribute('data-prod-id');
        const prod = adminProducts.find(function (p) {
          return String(p.id) === String(prodId);
        });
        if (!prod) return;

        const nextVal = !Boolean(prod[field]);
        toggleBtn.disabled = true;

        try {
          const patch = {};
          patch[field] = nextVal;
          const { error } = await supabase
            .from('products')
            .update(patch)
            .eq('id', prod.id);

          if (error) {
            showToast('Failed to update flag: ' + error.message, true);
          } else {
            prod[field] = nextVal;
            invalidatePublicCache();
            updateStatsUI();
            renderProductsTable();
            showToast('Updated "' + prod.name + '" (' + field.replace('is_', '') + ').');
          }
        } catch (err) {
          showToast('Network error updating product flag.', true);
        } finally {
          toggleBtn.disabled = false;
        }
        return;
      }

      const editBtn = e.target.closest('[data-edit-prod]');
      if (editBtn) {
        const prodId = editBtn.getAttribute('data-edit-prod');
        const prod = adminProducts.find(function (p) {
          return String(p.id) === String(prodId);
        });
        if (prod) openProductModal(prod);
        return;
      }

      const delBtn = e.target.closest('[data-delete-prod]');
      if (delBtn) {
        const prodId = delBtn.getAttribute('data-delete-prod');
        const prod = adminProducts.find(function (p) {
          return String(p.id) === String(prodId);
        });
        if (prod) openDeleteModal(prod);
      }
    });
  }

  /* ------------------------------------------------------------------------
     6. Add / Edit Product Modal, Color Editor & Image Upload/Reorder
     ------------------------------------------------------------------------ */
  function initPresetHuesBar() {
    if (!presetHuesBar) return;
    const presets = window.HANDLE_HUE_COLORS || [
      { name: 'Blush Pink', hex: '#F4D9D0' },
      { name: 'Warm Ivory', hex: '#FAF6F0' },
      { name: 'Champagne Gold', hex: '#C9A66B' },
      { name: 'Deep Charcoal', hex: '#2B2B2B' },
      { name: 'Sage Mist', hex: '#C5CEBE' },
      { name: 'Terracotta', hex: '#C98A74' },
      { name: 'Dusty Mauve', hex: '#D4B5B8' }
    ];

    presetHuesBar.innerHTML = presets
      .map(function (c) {
        return (
          '<button type="button" class="admin-preset-pill" data-preset-name="' +
          escapeHTML(c.name) +
          '" data-preset-hex="' +
          escapeHTML(c.hex) +
          '">' +
          '<span class="admin-preset-dot" style="background-color:' +
          escapeHTML(c.hex) +
          ';"></span>' +
          '<span>+ ' +
          escapeHTML(c.name) +
          '</span>' +
          '</button>'
        );
      })
      .join('');

    presetHuesBar.addEventListener('click', function (e) {
      const btn = e.target.closest('[data-preset-name]');
      if (!btn) return;
      const name = btn.getAttribute('data-preset-name');
      const hex = btn.getAttribute('data-preset-hex');
      syncColorEditorFromDOM();
      const exists = editorColors.some(function (c) {
        return c.name.toLowerCase() === name.toLowerCase();
      });
      if (!exists) {
        editorColors.push({ name: name, hex: hex });
        renderColorEditorRows();
      }
    });
  }

  function syncColorEditorFromDOM() {
    if (!colorEditorRows) return;
    const rows = colorEditorRows.querySelectorAll('.admin-color-row');
    const list = [];
    rows.forEach(function (row) {
      const nameIn = row.querySelector('[data-color-name]');
      const hexIn = row.querySelector('[data-color-hex]');
      const name = (nameIn ? nameIn.value : '').trim();
      const hex = (hexIn ? hexIn.value : '#F4D9D0').trim();
      if (name || hex) {
        list.push({
          name: name || 'Signature Hue',
          hex: /^#[0-9A-Fa-f]{6}$/.test(hex) ? hex : '#F4D9D0'
        });
      }
    });
    editorColors = list;
  }

  function renderColorEditorRows() {
    if (!colorEditorRows) return;
    if (editorColors.length === 0) {
      editorColors = [{ name: 'Blush Pink', hex: '#F4D9D0' }];
    }

    colorEditorRows.innerHTML = editorColors
      .map(function (c, idx) {
        const safeHex = /^#[0-9A-Fa-f]{6}$/.test(c.hex) ? c.hex : '#F4D9D0';
        return (
          '<div class="admin-color-row" data-color-idx="' +
          idx +
          '">' +
          '<input type="color" class="admin-color-picker" value="' +
          escapeHTML(safeHex) +
          '" data-color-picker="' +
          idx +
          '" aria-label="Pick color swatch">' +
          '<input type="text" class="admin-input" value="' +
          escapeHTML(safeHex) +
          '" data-color-hex="' +
          idx +
          '" placeholder="#F4D9D0" aria-label="Hex color code">' +
          '<input type="text" class="admin-input" value="' +
          escapeHTML(c.name) +
          '" data-color-name="' +
          idx +
          '" placeholder="Color Name (e.g. Blush Pink)" aria-label="Color name">' +
          '<button type="button" class="admin-btn admin-btn--ghost admin-btn--sm" data-remove-color="' +
          idx +
          '" aria-label="Remove color">&times;</button>' +
          '</div>'
        );
      })
      .join('');
  }

  if (colorEditorRows) {
    colorEditorRows.addEventListener('input', function (e) {
      const picker = e.target.closest('[data-color-picker]');
      if (picker) {
        const row = picker.closest('.admin-color-row');
        const hexInput = row ? row.querySelector('[data-color-hex]') : null;
        if (hexInput) hexInput.value = picker.value.toUpperCase();
        return;
      }

      const hexInput = e.target.closest('[data-color-hex]');
      if (hexInput) {
        const row = hexInput.closest('.admin-color-row');
        const pickerEl = row ? row.querySelector('[data-color-picker]') : null;
        if (pickerEl && /^#[0-9A-Fa-f]{6}$/.test(hexInput.value.trim())) {
          pickerEl.value = hexInput.value.trim();
        }
      }
    });

    colorEditorRows.addEventListener('click', function (e) {
      const rmBtn = e.target.closest('[data-remove-color]');
      if (!rmBtn) return;
      syncColorEditorFromDOM();
      const idx = parseInt(rmBtn.getAttribute('data-remove-color'), 10);
      editorColors.splice(idx, 1);
      renderColorEditorRows();
    });
  }

  if (addColorRowBtn) {
    addColorRowBtn.addEventListener('click', function () {
      syncColorEditorFromDOM();
      editorColors.push({ name: '', hex: '#C9A66B' });
      renderColorEditorRows();
    });
  }

  /* ------------------------------------------------------------------------
     Image Upload to `product-images` & Drag/Button Reorder
     ------------------------------------------------------------------------ */
  function renderImageEditorList() {
    if (!productImagesPreviewList) return;

    if (editorImages.length === 0) {
      productImagesPreviewList.innerHTML =
        '<p style="grid-column:1/-1; font-size:0.84rem; color:var(--color-charcoal-muted);">No images added yet. Upload files above or paste an image URL.</p>';
      return;
    }

    productImagesPreviewList.innerHTML = editorImages
      .map(function (url, idx) {
        const isMain = idx === 0;
        const previewSrc = resolveAdminPreviewSrc(url);
        return (
          '<div class="admin-img-card ' +
          (isMain ? 'is-main' : '') +
          '" draggable="true" data-img-index="' +
          idx +
          '">' +
          (isMain ? '<span class="admin-img-badge">Main Image</span>' : '') +
          '<img src="' +
          escapeHTML(previewSrc) +
          '" alt="Product image ' +
          (idx + 1) +
          '">' +
          '<div class="admin-img-controls">' +
          (isMain
            ? '<span style="font-size:0.65rem; color:var(--color-gold-dark); font-weight:600;">Primary</span>'
            : '<button type="button" class="admin-img-btn" data-img-set-main="' +
              idx +
              '" title="Set as main image">Set Main</button>') +
          '<div style="display:flex; gap:0.2rem;">' +
          '<button type="button" class="admin-img-btn" data-img-move="-1" data-img-idx="' +
          idx +
          '" ' +
          (idx === 0 ? 'disabled' : '') +
          ' aria-label="Move image left">&larr;</button>' +
          '<button type="button" class="admin-img-btn" data-img-move="1" data-img-idx="' +
          idx +
          '" ' +
          (idx === editorImages.length - 1 ? 'disabled' : '') +
          ' aria-label="Move image right">&rarr;</button>' +
          '<button type="button" class="admin-img-btn" style="color:var(--color-danger);" data-img-remove="' +
          idx +
          '" aria-label="Remove image">&times;</button>' +
          '</div>' +
          '</div>' +
          '</div>'
        );
      })
      .join('');
  }

  if (productImagesPreviewList) {
    productImagesPreviewList.addEventListener('click', function (e) {
      const setMainBtn = e.target.closest('[data-img-set-main]');
      if (setMainBtn) {
        const idx = parseInt(setMainBtn.getAttribute('data-img-set-main'), 10);
        if (idx > 0 && idx < editorImages.length) {
          const chosen = editorImages.splice(idx, 1)[0];
          editorImages.unshift(chosen);
          renderImageEditorList();
        }
        return;
      }

      const moveBtn = e.target.closest('[data-img-move]');
      if (moveBtn) {
        const idx = parseInt(moveBtn.getAttribute('data-img-idx'), 10);
        const delta = parseInt(moveBtn.getAttribute('data-img-move'), 10);
        const targetIdx = idx + delta;
        if (targetIdx >= 0 && targetIdx < editorImages.length) {
          const temp = editorImages[idx];
          editorImages[idx] = editorImages[targetIdx];
          editorImages[targetIdx] = temp;
          renderImageEditorList();
        }
        return;
      }

      const rmBtn = e.target.closest('[data-img-remove]');
      if (rmBtn) {
        const idx = parseInt(rmBtn.getAttribute('data-img-remove'), 10);
        if (idx >= 0 && idx < editorImages.length) {
          editorImages.splice(idx, 1);
          renderImageEditorList();
        }
      }
    });

    // HTML5 Drag and Drop reordering
    productImagesPreviewList.addEventListener('dragstart', function (e) {
      const card = e.target.closest('[data-img-index]');
      if (!card) return;
      dragSourceIndex = parseInt(card.getAttribute('data-img-index'), 10);
      e.dataTransfer.effectAllowed = 'move';
    });

    productImagesPreviewList.addEventListener('dragover', function (e) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    });

    productImagesPreviewList.addEventListener('drop', function (e) {
      e.preventDefault();
      const targetCard = e.target.closest('[data-img-index]');
      if (!targetCard || dragSourceIndex === null) return;
      const targetIndex = parseInt(targetCard.getAttribute('data-img-index'), 10);
      if (dragSourceIndex !== targetIndex) {
        const moved = editorImages.splice(dragSourceIndex, 1)[0];
        editorImages.splice(targetIndex, 0, moved);
        renderImageEditorList();
      }
      dragSourceIndex = null;
    });
  }

  if (addManualImageBtn && manualImageUrlInput) {
    addManualImageBtn.addEventListener('click', function () {
      const val = manualImageUrlInput.value.trim();
      if (!val) return;
      editorImages.push(val);
      manualImageUrlInput.value = '';
      renderImageEditorList();
    });
  }

  if (productImagesUploadInput) {
    productImagesUploadInput.addEventListener('change', async function (e) {
      const files = Array.from(e.target.files || []);
      if (files.length === 0 || !supabase) return;

      if (imageUploadStatus) {
        imageUploadStatus.hidden = false;
        imageUploadStatus.textContent =
          'Uploading ' + files.length + ' image(s) to product-images bucket...';
      }

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
        const cleanSlug = slugify(prodSlugInput.value || prodNameInput.value || 'bag');
        const filePath =
          cleanSlug + '/' + Date.now() + '-' + Math.random().toString(36).slice(2, 7) + '.' + ext;

        try {
          const { error: uploadError } = await supabase.storage
            .from('product-images')
            .upload(filePath, file, {
              cacheControl: '3600',
              upsert: false
            });

          if (uploadError) {
            showToast('Upload failed for ' + file.name + ': ' + uploadError.message, true);
          } else {
            const { data: pubData } = supabase.storage
              .from('product-images')
              .getPublicUrl(filePath);
            if (pubData && pubData.publicUrl) {
              editorImages.push(pubData.publicUrl);
            }
          }
        } catch (err) {
          showToast('Error uploading ' + file.name, true);
        }
      }

      if (imageUploadStatus) {
        imageUploadStatus.hidden = true;
        imageUploadStatus.textContent = '';
      }
      productImagesUploadInput.value = '';
      renderImageEditorList();
      showToast('Image upload complete.');
    });
  }

  /* ------------------------------------------------------------------------
     Open / Close Product Editor Modal & Save Product
     ------------------------------------------------------------------------ */
  function showProductFormError(msg) {
    if (!productFormError) return;
    if (!msg) {
      productFormError.hidden = true;
      productFormError.textContent = '';
    } else {
      productFormError.hidden = false;
      productFormError.textContent = msg;
    }
  }

  function openProductModal(product) {
    showProductFormError('');
    const isEdit = Boolean(product && product.id);

    productModalEyebrow.textContent = isEdit ? 'Edit Atelier Piece' : 'New Atelier Piece';
    productModalTitle.textContent = isEdit ? 'Edit ' + product.name : 'Add New Piece';

    prodIdInput.value = isEdit ? product.id : '';
    prodNameInput.value = isEdit ? product.name || '' : '';
    prodSlugInput.value = isEdit ? product.slug || '' : '';
    slugManuallyEdited = isEdit;

    prodCategoryInput.value = isEdit ? product.category || 'Totes' : 'Totes';
    prodSortOrderInput.value =
      isEdit && product.sort_order !== undefined && product.sort_order !== null
        ? product.sort_order
        : adminProducts.length + 1;
    prodPriceInput.value = isEdit && product.price ? product.price : '';
    prodSalePriceInput.value =
      isEdit && product.sale_price !== null && product.sale_price !== undefined
        ? product.sale_price
        : '';
    prodDimensionsInput.value = isEdit ? product.dimensions || '' : '';
    prodDescriptionInput.value = isEdit ? product.description || '' : '';

    prodInStockInput.checked = isEdit ? product.in_stock !== false : true;
    prodIsNewInput.checked = isEdit ? Boolean(product.is_new) : false;
    prodIsBestsellerInput.checked = isEdit ? Boolean(product.is_bestseller) : false;
    prodIsFeaturedInput.checked = isEdit ? Boolean(product.is_featured) : false;

    editorColors =
      isEdit && Array.isArray(product.colors) && product.colors.length > 0
        ? product.colors.map(function (c) {
            return { name: c.name || 'Blush Pink', hex: c.hex || '#F4D9D0' };
          })
        : [{ name: 'Blush Pink', hex: '#F4D9D0' }];

    editorImages =
      isEdit && Array.isArray(product.images) ? product.images.slice() : [];

    renderColorEditorRows();
    renderImageEditorList();

    productModalBackdrop.hidden = false;
    productModalBackdrop.setAttribute('aria-hidden', 'false');
    prodNameInput.focus();
  }

  function closeProductModal() {
    productModalBackdrop.hidden = true;
    productModalBackdrop.setAttribute('aria-hidden', 'true');
  }

  if (openAddProductBtn) {
    openAddProductBtn.addEventListener('click', function () {
      openProductModal(null);
    });
  }
  if (closeProductModalBtn) {
    closeProductModalBtn.addEventListener('click', closeProductModal);
  }
  if (cancelProductModalBtn) {
    cancelProductModalBtn.addEventListener('click', closeProductModal);
  }

  if (prodNameInput && prodSlugInput) {
    prodNameInput.addEventListener('input', function () {
      if (!slugManuallyEdited) {
        prodSlugInput.value = slugify(prodNameInput.value);
      }
    });
    prodSlugInput.addEventListener('input', function () {
      slugManuallyEdited = true;
    });
  }

  if (regenSlugBtn && prodNameInput && prodSlugInput) {
    regenSlugBtn.addEventListener('click', function () {
      prodSlugInput.value = slugify(prodNameInput.value);
      slugManuallyEdited = false;
    });
  }

  if (productEditorForm) {
    productEditorForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      showProductFormError('');
      syncColorEditorFromDOM();

      const id = prodIdInput.value.trim();
      const name = prodNameInput.value.trim();
      const slug = slugify(prodSlugInput.value.trim() || name);
      const category = prodCategoryInput.value.trim();
      const priceVal = Number(prodPriceInput.value);
      const rawSale = prodSalePriceInput.value.trim();
      const saleVal = rawSale !== '' ? Number(rawSale) : null;
      const sortOrder = parseInt(prodSortOrderInput.value, 10) || 0;
      const dimensions = prodDimensionsInput.value.trim();
      const description = prodDescriptionInput.value.trim();

      if (!name) {
        showProductFormError('Product name is required.');
        return;
      }
      if (!slug) {
        showProductFormError('A valid URL slug is required.');
        return;
      }
      if (!category) {
        showProductFormError('Please select a product category.');
        return;
      }
      if (!Number.isFinite(priceVal) || priceVal <= 0) {
        showProductFormError('Regular price (PKR) is required and must be greater than 0.');
        return;
      }
      if (saleVal !== null) {
        if (!Number.isFinite(saleVal) || saleVal <= 0) {
          showProductFormError('Sale price must be a positive PKR number.');
          return;
        }
        if (saleVal >= priceVal) {
          showProductFormError('Sale price must be lower than the regular price.');
          return;
        }
      }

      const payload = {
        slug: slug,
        name: name,
        category: category,
        price: Math.round(priceVal),
        sale_price: saleVal !== null ? Math.round(saleVal) : null,
        description: description,
        colors:
          editorColors.length > 0
            ? editorColors
            : [{ name: 'Blush Pink', hex: '#F4D9D0' }],
        images:
          editorImages.length > 0
            ? editorImages
            : ['assets/images/products/aurelia-tote-primary.svg'],
        dimensions: dimensions,
        in_stock: Boolean(prodInStockInput.checked),
        is_new: Boolean(prodIsNewInput.checked),
        is_bestseller: Boolean(prodIsBestsellerInput.checked),
        is_featured: Boolean(prodIsFeaturedInput.checked),
        sort_order: sortOrder
      };

      saveProductSubmitBtn.disabled = true;
      saveProductSubmitBtn.textContent = 'Saving...';

      try {
        let result;
        if (id) {
          result = await supabase.from('products').update(payload).eq('id', id);
        } else {
          result = await supabase.from('products').insert([payload]);
        }

        if (result.error) {
          showProductFormError(result.error.message || 'Could not save product.');
        } else {
          invalidatePublicCache();
          closeProductModal();
          await fetchAdminProducts();
          showToast(id ? 'Updated "' + name + '".' : 'Added "' + name + '" to catalog.');
        }
      } catch (err) {
        showProductFormError('Network error while saving product.');
      } finally {
        saveProductSubmitBtn.disabled = false;
        saveProductSubmitBtn.textContent = 'Save Piece';
      }
    });
  }

  /* ------------------------------------------------------------------------
     7. Delete Confirmation Modal
     ------------------------------------------------------------------------ */
  function openDeleteModal(product) {
    pendingDeleteProduct = product;
    if (deleteModalMessage) {
      deleteModalMessage.innerHTML =
        'Are you sure you want to permanently delete <strong>' +
        escapeHTML(product.name) +
        '</strong> (<code>' +
        escapeHTML(product.slug) +
        '</code>)? This action cannot be undone.';
    }
    deleteModalBackdrop.hidden = false;
    deleteModalBackdrop.setAttribute('aria-hidden', 'false');
  }

  function closeDeleteModal() {
    pendingDeleteProduct = null;
    deleteModalBackdrop.hidden = true;
    deleteModalBackdrop.setAttribute('aria-hidden', 'true');
  }

  if (closeDeleteModalBtn) closeDeleteModalBtn.addEventListener('click', closeDeleteModal);
  if (cancelDeleteBtn) cancelDeleteBtn.addEventListener('click', closeDeleteModal);

  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener('click', async function () {
      if (!pendingDeleteProduct || !supabase) return;
      const target = pendingDeleteProduct;
      confirmDeleteBtn.disabled = true;
      confirmDeleteBtn.textContent = 'Deleting...';

      try {
        const { error } = await supabase.from('products').delete().eq('id', target.id);
        if (error) {
          showToast('Delete failed: ' + error.message, true);
        } else {
          invalidatePublicCache();
          closeDeleteModal();
          await fetchAdminProducts();
          showToast('Deleted "' + target.name + '".');
        }
      } catch (err) {
        showToast('Network error deleting product.', true);
      } finally {
        confirmDeleteBtn.disabled = false;
        confirmDeleteBtn.textContent = 'Delete Permanently';
      }
    });
  }

  /* ------------------------------------------------------------------------
     8. Boutique Settings Save Handler
     ------------------------------------------------------------------------ */
  if (adminSettingsForm) {
    adminSettingsForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      if (!supabase) return;

      const rawWa = (settingWhatsapp.value || '').replace(/\D/g, '');
      const shipFee = Math.round(Number(settingShippingFee.value));
      const freeThresh = Math.round(Number(settingFreeThreshold.value));
      const announcement = (settingAnnouncement.value || '').trim();

      if (!/^[0-9]{10,15}$/.test(rawWa)) {
        showToast(
          'WhatsApp number must contain 10 to 15 digits with country code (e.g. 923469377256).',
          true
        );
        return;
      }
      if (!Number.isFinite(shipFee) || shipFee < 0) {
        showToast('Shipping fee must be 0 or a positive PKR integer.', true);
        return;
      }
      if (!Number.isFinite(freeThresh) || freeThresh < 0) {
        showToast('Free shipping threshold must be 0 or a positive PKR integer.', true);
        return;
      }

      settingWhatsapp.value = rawWa;
      saveSettingsBtn.disabled = true;
      saveSettingsBtn.textContent = 'Saving...';

      try {
        const payload = {
          id: 1,
          whatsapp_number: rawWa,
          shipping_fee: shipFee,
          free_shipping_threshold: freeThresh,
          announcement_text: announcement
        };

        const { error } = await supabase
          .from('settings')
          .upsert(payload, { onConflict: 'id' });

        if (error) {
          showToast('Could not save settings: ' + error.message, true);
        } else {
          invalidatePublicCache();
          showToast('Boutique settings saved successfully.');
        }
      } catch (err) {
        showToast('Network error saving settings.', true);
      } finally {
        saveSettingsBtn.disabled = false;
        saveSettingsBtn.textContent = 'Save Boutique Settings';
      }
    });
  }

  /* ------------------------------------------------------------------------
     Initialize Admin Console
     ------------------------------------------------------------------------ */
  document.addEventListener('DOMContentLoaded', function () {
    initPresetHuesBar();
    initAuth();
  });
})();
