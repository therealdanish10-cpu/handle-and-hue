/**
 * ============================================================================
 * HANDLE & HUE — Shared Supabase Data Layer & Fallback Manager (js/data.js)
 * ============================================================================
 * - Initializes the Supabase client using window.SUPABASE_URL and window.SUPABASE_ANON_KEY
 * - Fetches `products` and `settings` from Supabase with short in-memory caching
 * - Automatically falls back to static `js/products.js` data if Supabase tables
 *   are not created yet, are empty, or if the network request fails
 * - Provides `window.escapeHTML()` to sanitize dynamic text rendered into the DOM
 * ============================================================================
 */

(function () {
  'use strict';

  const CACHE_TTL_MS = 60 * 1000; // 60 seconds in-memory cache
  const SESSION_CACHE_KEY = 'handle_hue_supabase_cache_v1';

  /* ------------------------------------------------------------------------
     1. HTML Escaping Helper (XSS Prevention)
     ------------------------------------------------------------------------ */
  function escapeHTML(value) {
    if (value === null || value === undefined) return '';
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  window.escapeHTML = escapeHTML;

  /* ------------------------------------------------------------------------
     2. Initialize Supabase Client (via jsDelivr CDN UMD bundle)
     ------------------------------------------------------------------------ */
  let supabaseClient = null;
  if (
    window.supabase &&
    typeof window.supabase.createClient === 'function' &&
    window.SUPABASE_URL &&
    window.SUPABASE_ANON_KEY
  ) {
    try {
      supabaseClient = window.supabase.createClient(
        window.SUPABASE_URL,
        window.SUPABASE_ANON_KEY
      );
    } catch (err) {
      supabaseClient = null;
    }
  }
  window.HandleHueSupabase = supabaseClient;

  /* ------------------------------------------------------------------------
     3. Default Settings & Phone Formatting Helper
     ------------------------------------------------------------------------ */
  const DEFAULT_SETTINGS = {
    whatsapp_number: window.WHATSAPP_NUMBER || '923469377256',
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

  function formatWhatsAppDisplay(digitsOnly) {
    const clean = String(digitsOnly || '923469377256').replace(/\D/g, '');
    if (clean.startsWith('92') && clean.length === 12) {
      return '+' + clean.slice(0, 2) + ' ' + clean.slice(2, 5) + ' ' + clean.slice(5);
    }
    return '+' + clean;
  }

  /* ------------------------------------------------------------------------
     4. Product & Settings Normalization
     ------------------------------------------------------------------------ */
  const STATIC_FALLBACK_PRODUCTS = Array.isArray(window.HANDLE_HUE_PRODUCTS)
    ? window.HANDLE_HUE_PRODUCTS.slice()
    : [];

  // Map static fallback metadata by slug so DB rows inherit rich details if omitted
  const STATIC_BY_SLUG = {};
  STATIC_FALLBACK_PRODUCTS.forEach(function (item, idx) {
    const key = item.slug || item.id;
    if (key) STATIC_BY_SLUG[key] = Object.assign({ _index: idx }, item);
  });

  function normalizeProduct(raw, index) {
    const idx = typeof index === 'number' ? index : 0;
    const slug = String(raw.slug || raw.id || 'piece-' + (idx + 1)).trim();
    const fallbackMeta = STATIC_BY_SLUG[slug] || {};

    // Colors array of { name, hex }
    let colors = [];
    if (Array.isArray(raw.colors) && raw.colors.length > 0) {
      colors = raw.colors
        .map(function (c) {
          if (!c) return null;
          return {
            name: String(c.name || 'Blush Pink').trim(),
            hex: String(c.hex || '#F4D9D0').trim()
          };
        })
        .filter(Boolean);
    } else if (Array.isArray(fallbackMeta.colors) && fallbackMeta.colors.length > 0) {
      colors = fallbackMeta.colors.slice();
    } else {
      colors = [{ name: 'Blush Pink', hex: '#F4D9D0' }];
    }

    const primaryColor =
      raw.primaryColor ||
      (colors[0] && colors[0].name) ||
      fallbackMeta.primaryColor ||
      'Blush Pink';

    // Images normalization: supports JSONB array of URLs OR { primary, secondary, detail, lifestyle }
    let imageList = [];
    if (Array.isArray(raw.images)) {
      imageList = raw.images
        .map(function (u) {
          return typeof u === 'string' ? u.trim() : '';
        })
        .filter(Boolean);
    } else if (raw.images && typeof raw.images === 'object') {
      imageList = [
        raw.images.primary,
        raw.images.secondary,
        raw.images.detail,
        raw.images.lifestyle
      ].filter(Boolean);
    }

    if (imageList.length === 0 && fallbackMeta.images) {
      if (Array.isArray(fallbackMeta.images)) {
        imageList = fallbackMeta.images.slice();
      } else if (typeof fallbackMeta.images === 'object') {
        imageList = [
          fallbackMeta.images.primary,
          fallbackMeta.images.secondary,
          fallbackMeta.images.detail,
          fallbackMeta.images.lifestyle
        ].filter(Boolean);
      }
    }

    if (imageList.length === 0) {
      imageList = ['assets/images/products/aurelia-tote-primary.svg'];
    }

    const imagesObj = {
      primary: imageList[0],
      secondary: imageList[1] || imageList[0],
      detail: imageList[2] || imageList[0],
      lifestyle: imageList[3] || imageList[1] || imageList[0],
      list: imageList
    };

    // Price & Sale Price normalization
    // In Supabase DB: `price` is the regular price and `sale_price` (nullable, < price) is the discounted price.
    // In static products.js: `price` is the effective price and `compareAtPrice` is the original price.
    let regularPrice = 0;
    let salePrice = null;
    let effectivePrice = 0;
    let compareAtPrice = null;

    if ('sale_price' in raw) {
      regularPrice = Math.round(Number(raw.price) || 0);
      const rawSale =
        raw.sale_price !== null && raw.sale_price !== undefined && raw.sale_price !== ''
          ? Math.round(Number(raw.sale_price))
          : null;
      if (rawSale !== null && rawSale > 0 && rawSale < regularPrice) {
        salePrice = rawSale;
        effectivePrice = rawSale;
        compareAtPrice = regularPrice;
      } else {
        salePrice = null;
        effectivePrice = regularPrice;
        compareAtPrice = null;
      }
    } else {
      effectivePrice = Math.round(Number(raw.price) || 0);
      compareAtPrice =
        raw.compareAtPrice && Number(raw.compareAtPrice) > effectivePrice
          ? Math.round(Number(raw.compareAtPrice))
          : null;
      regularPrice = compareAtPrice || effectivePrice;
      salePrice = compareAtPrice ? effectivePrice : null;
    }

    const inStock =
      raw.in_stock !== undefined
        ? Boolean(raw.in_stock)
        : raw.inStock !== undefined
        ? Boolean(raw.inStock)
        : true;

    const isNew =
      raw.is_new !== undefined ? Boolean(raw.is_new) : Boolean(raw.isNew);

    const isBestseller =
      raw.is_bestseller !== undefined
        ? Boolean(raw.is_bestseller)
        : Boolean(raw.isBestseller);

    const isFeatured =
      raw.is_featured !== undefined
        ? Boolean(raw.is_featured)
        : raw.isFeatured !== undefined
        ? Boolean(raw.isFeatured)
        : Boolean(isBestseller || idx < 4);

    const sortOrder =
      raw.sort_order !== undefined && raw.sort_order !== null
        ? Number(raw.sort_order)
        : raw.sortOrder !== undefined
        ? Number(raw.sortOrder)
        : idx + 1;

    const category = String(raw.category || fallbackMeta.category || 'Handbags').trim();
    const catPrefix = category.slice(0, 3).toUpperCase();
    const sku =
      raw.sku ||
      fallbackMeta.sku ||
      'HH-' + catPrefix + '-' + String(idx + 1).padStart(3, '0');

    let badge = '';
    if (!inStock) {
      badge = 'Sold out';
    } else if (isNew) {
      badge = 'New';
    } else if (isBestseller) {
      badge = 'Bestseller';
    } else if (salePrice !== null) {
      badge = 'Sale';
    } else if (isFeatured) {
      badge = 'Featured';
    } else if (raw.badge) {
      badge = String(raw.badge);
    }

    return {
      id: slug,
      uuid: raw.id || slug,
      slug: slug,
      sku: sku,
      name: String(raw.name || fallbackMeta.name || 'Atelier Piece').trim(),
      subtitle: String(
        raw.subtitle || fallbackMeta.subtitle || category + ' Atelier Edition'
      ).trim(),
      category: category,
      price: effectivePrice,
      regularPrice: regularPrice,
      salePrice: salePrice,
      compareAtPrice: compareAtPrice,
      primaryColor: primaryColor,
      colors: colors,
      images: imagesObj,
      imageList: imageList,
      dimensions: String(
        raw.dimensions || fallbackMeta.dimensions || '28 × 22 × 12 cm'
      ).trim(),
      strapDrop: String(
        raw.strapDrop ||
          fallbackMeta.strapDrop ||
          'Sculpted top handle & detachable shoulder strap'
      ).trim(),
      weight: String(raw.weight || fallbackMeta.weight || '0.58 kg').trim(),
      capacity: String(
        raw.capacity ||
          fallbackMeta.capacity ||
          'Fits daily essentials, smartphone, wallet & keys'
      ).trim(),
      materials: String(
        raw.materials ||
          fallbackMeta.materials ||
          'Full-grain leather finish, soft cotton-suede lining, brushed champagne gold hardware.'
      ).trim(),
      description: String(raw.description || fallbackMeta.description || '').trim(),
      inStock: inStock,
      in_stock: inStock,
      isNew: isNew,
      is_new: isNew,
      isBestseller: isBestseller,
      is_bestseller: isBestseller,
      isFeatured: isFeatured,
      is_featured: isFeatured,
      sortOrder: sortOrder,
      sort_order: sortOrder,
      badge: badge,
      rating: Number(raw.rating || fallbackMeta.rating || 4.9),
      reviewsCount: Number(raw.reviewsCount || fallbackMeta.reviewsCount || 64)
    };
  }

  function normalizeSettings(raw) {
    const src = raw && typeof raw === 'object' ? raw : {};
    const cleanPhone = String(
      src.whatsapp_number || DEFAULT_SETTINGS.whatsapp_number
    ).replace(/\D/g, '') || '923469377256';

    const shippingFee =
      src.shipping_fee !== undefined && src.shipping_fee !== null && src.shipping_fee !== ''
        ? Math.max(0, Math.round(Number(src.shipping_fee) || 0))
        : DEFAULT_SETTINGS.shipping_fee;

    const freeThreshold =
      src.free_shipping_threshold !== undefined &&
      src.free_shipping_threshold !== null &&
      src.free_shipping_threshold !== ''
        ? Math.max(0, Math.round(Number(src.free_shipping_threshold) || 0))
        : DEFAULT_SETTINGS.free_shipping_threshold;

    const announcementText =
      src.announcement_text !== undefined && src.announcement_text !== null
        ? String(src.announcement_text)
        : DEFAULT_SETTINGS.announcement_text;

    return {
      whatsapp_number: cleanPhone,
      whatsapp_display: formatWhatsAppDisplay(cleanPhone),
      whatsapp_tel: '+' + cleanPhone,
      shipping_fee: shippingFee,
      free_shipping_threshold: freeThreshold,
      announcement_text: announcementText
    };
  }

  function applyGlobalState(normalizedProducts, normalizedSettings) {
    window.HANDLE_HUE_PRODUCTS = normalizedProducts;
    window.HANDLE_HUE_SETTINGS = normalizedSettings;

    window.WHATSAPP_NUMBER = normalizedSettings.whatsapp_number;
    window.WHATSAPP_DISPLAY = normalizedSettings.whatsapp_display;
    window.WHATSAPP_TEL = normalizedSettings.whatsapp_tel;

    window.HANDLE_HUE_SHIPPING_CONFIG = {
      freeShippingThreshold: normalizedSettings.free_shipping_threshold,
      flatShippingFee: normalizedSettings.shipping_fee
    };

    // Update category counts dynamically
    if (Array.isArray(window.HANDLE_HUE_CATEGORIES)) {
      window.HANDLE_HUE_CATEGORIES.forEach(function (cat) {
        cat.count = normalizedProducts.filter(function (p) {
          return p.category === cat.id;
        }).length;
      });
    }
  }

  // Synchronously initialize with normalized static fallback so nothing is ever undefined
  const initialProducts = STATIC_FALLBACK_PRODUCTS.map(normalizeProduct);
  const initialSettings = normalizeSettings(DEFAULT_SETTINGS);
  applyGlobalState(initialProducts, initialSettings);

  /* ------------------------------------------------------------------------
     5. In-Memory + Session Cache & Supabase Fetcher
     ------------------------------------------------------------------------ */
  let memoryCache = {
    timestamp: 0,
    products: null,
    settings: null,
    source: 'fallback'
  };
  let inflightPromise = null;

  function readSessionCache() {
    try {
      const raw = sessionStorage.getItem(SESSION_CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (
        parsed &&
        Date.now() - parsed.timestamp < CACHE_TTL_MS &&
        Array.isArray(parsed.products) &&
        parsed.products.length > 0 &&
        parsed.settings
      ) {
        return parsed;
      }
    } catch (e) {
      // Ignore sessionStorage errors
    }
    return null;
  }

  function writeSessionCache(data) {
    try {
      sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(data));
    } catch (e) {
      // Ignore quota errors
    }
  }

  function clearCache() {
    memoryCache = {
      timestamp: 0,
      products: null,
      settings: null,
      source: 'fallback'
    };
    try {
      sessionStorage.removeItem(SESSION_CACHE_KEY);
    } catch (e) {
      // Ignore errors
    }
  }

  async function loadAll(forceRefresh) {
    const now = Date.now();

    if (!forceRefresh) {
      if (
        memoryCache.products &&
        memoryCache.settings &&
        now - memoryCache.timestamp < CACHE_TTL_MS
      ) {
        applyGlobalState(memoryCache.products, memoryCache.settings);
        return {
          products: memoryCache.products,
          settings: memoryCache.settings,
          source: memoryCache.source
        };
      }

      const cached = readSessionCache();
      if (cached) {
        memoryCache = {
          timestamp: cached.timestamp,
          products: cached.products,
          settings: cached.settings,
          source: cached.source || 'cache'
        };
        applyGlobalState(cached.products, cached.settings);
        return {
          products: cached.products,
          settings: cached.settings,
          source: memoryCache.source
        };
      }
    }

    if (inflightPromise) {
      return inflightPromise;
    }

    inflightPromise = (async function () {
      let finalProducts = initialProducts;
      let finalSettings = initialSettings;
      let source = 'fallback';

      if (supabaseClient) {
        try {
          const results = await Promise.allSettled([
            supabaseClient
              .from('products')
              .select('*')
              .order('sort_order', { ascending: true })
              .order('created_at', { ascending: false }),
            supabaseClient.from('settings').select('*').limit(1).maybeSingle()
          ]);

          const prodRes = results[0];
          const setRes = results[1];

          if (
            prodRes.status === 'fulfilled' &&
            prodRes.value &&
            !prodRes.value.error &&
            Array.isArray(prodRes.value.data) &&
            prodRes.value.data.length > 0
          ) {
            finalProducts = prodRes.value.data.map(normalizeProduct);
            source = 'supabase';
          }

          if (
            setRes.status === 'fulfilled' &&
            setRes.value &&
            !setRes.value.error &&
            setRes.value.data
          ) {
            finalSettings = normalizeSettings(setRes.value.data);
          }
        } catch (err) {
          // Silently fall back to static products.js and default settings
        }
      }

      memoryCache = {
        timestamp: Date.now(),
        products: finalProducts,
        settings: finalSettings,
        source: source
      };

      if (source === 'supabase') {
        writeSessionCache(memoryCache);
      }

      applyGlobalState(finalProducts, finalSettings);

      window.dispatchEvent(
        new CustomEvent('handlehue:data-loaded', {
          detail: {
            products: finalProducts,
            settings: finalSettings,
            source: source
          }
        })
      );

      return {
        products: finalProducts,
        settings: finalSettings,
        source: source
      };
    })();

    try {
      return await inflightPromise;
    } finally {
      inflightPromise = null;
    }
  }

  function findProduct(idOrSlug) {
    if (!idOrSlug) return null;
    const target = String(idOrSlug).trim().toLowerCase();
    const list = window.HANDLE_HUE_PRODUCTS || initialProducts;
    return (
      list.find(function (p) {
        return (
          String(p.id).toLowerCase() === target ||
          String(p.slug).toLowerCase() === target ||
          String(p.uuid).toLowerCase() === target
        );
      }) || null
    );
  }

  window.HandleHueData = {
    loadAll: loadAll,
    clearCache: clearCache,
    getProducts: function () {
      return window.HANDLE_HUE_PRODUCTS || initialProducts;
    },
    getSettings: function () {
      return window.HANDLE_HUE_SETTINGS || initialSettings;
    },
    findProduct: findProduct,
    normalizeProduct: normalizeProduct,
    normalizeSettings: normalizeSettings,
    formatWhatsAppDisplay: formatWhatsAppDisplay,
    escapeHTML: escapeHTML
  };
})();
