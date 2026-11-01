/**
 * ============================================================================
 * HANDLE & HUE — Shared Supabase Data Layer & Fallback Manager (js/data.js)
 * ============================================================================
 * - Initializes the Supabase client using window.SUPABASE_URL and window.SUPABASE_ANON_KEY
 * - Fetches `products` and `settings` from Supabase with short in-memory caching
 * - Automatically falls back to static `js/products.js` data if Supabase tables
 *   are not created yet, are empty, or if the network request fails
 * - Provides customer reviews methods:
 *     * getApprovedReviews(productId)
 *     * getRatingSummaries()
 *     * submitReview(data)
 *     * getHomepageReviews()
 * - Provides `window.escapeHTML()` to sanitize dynamic text rendered into the DOM
 * ============================================================================
 */

(function () {
  'use strict';

  const CACHE_TTL_MS = 60 * 1000; // 60 seconds in-memory cache
  const SESSION_CACHE_KEY = 'handle_hue_supabase_cache_v2';
  const UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

  const STATIC_BY_SLUG = {};
  STATIC_FALLBACK_PRODUCTS.forEach(function (item, idx) {
    const key = item.slug || item.id;
    if (key) STATIC_BY_SLUG[key] = Object.assign({ _index: idx }, item);
  });

  // Rating summaries cache: maps product UUID and slug -> { average_rating, review_count }
  let ratingSummaryLookup = {};

  function normalizeProduct(raw, index) {
    const idx = typeof index === 'number' ? index : 0;
    const slug = String(raw.slug || raw.id || 'piece-' + (idx + 1)).trim();
    const fallbackMeta = STATIC_BY_SLUG[slug] || {};

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

    const uuid = raw.id || slug;
    const summary = ratingSummaryLookup[uuid] || ratingSummaryLookup[slug] || null;
    const approvedCount = summary ? Number(summary.review_count) || 0 : 0;
    const approvedAvg =
      summary && approvedCount > 0 ? Number(Number(summary.average_rating).toFixed(1)) : null;

    return {
      id: slug,
      uuid: uuid,
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
      rating: approvedAvg,
      reviewsCount: approvedCount
    };
  }

  function normalizeSettings(raw) {
    const src = raw && typeof raw === 'object' ? raw : {};
    const cleanPhone =
      String(src.whatsapp_number || DEFAULT_SETTINGS.whatsapp_number).replace(/\D/g, '') ||
      '923469377256';

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
      announcement_text: announcementText,
      reviews_enabled: src.reviews_enabled === true
    };
  }

  function applySummariesToProducts(productsList) {
    if (!Array.isArray(productsList)) return;
    productsList.forEach(function (p) {
      const sum =
        ratingSummaryLookup[p.uuid] ||
        ratingSummaryLookup[p.slug] ||
        ratingSummaryLookup[p.id] ||
        null;
      const count = sum ? Number(sum.review_count) || 0 : 0;
      p.reviewsCount = count;
      p.rating = count > 0 ? Number(Number(sum.average_rating).toFixed(1)) : null;
    });
  }

  function applyGlobalState(normalizedProducts, normalizedSettings) {
    applySummariesToProducts(normalizedProducts);
    window.HANDLE_HUE_PRODUCTS = normalizedProducts;
    window.HANDLE_HUE_SETTINGS = normalizedSettings;

    window.WHATSAPP_NUMBER = normalizedSettings.whatsapp_number;
    window.WHATSAPP_DISPLAY = normalizedSettings.whatsapp_display;
    window.WHATSAPP_TEL = normalizedSettings.whatsapp_tel;

    window.HANDLE_HUE_SHIPPING_CONFIG = {
      freeShippingThreshold: normalizedSettings.free_shipping_threshold,
      flatShippingFee: normalizedSettings.shipping_fee
    };

    if (Array.isArray(window.HANDLE_HUE_CATEGORIES)) {
      window.HANDLE_HUE_CATEGORIES.forEach(function (cat) {
        cat.count = normalizedProducts.filter(function (p) {
          return p.category === cat.id;
        }).length;
      });
    }
  }

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

  // Reviews caches
  let reviewsCache = {
    summariesTimestamp: 0,
    summariesList: null,
    homepageTimestamp: 0,
    homepageList: null,
    byProduct: {},
    tableAvailable: null // null = unknown, true = exists, false = missing
  };

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
    reviewsCache = {
      summariesTimestamp: 0,
      summariesList: null,
      homepageTimestamp: 0,
      homepageList: null,
      byProduct: {},
      tableAvailable: null
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
        if (cached.ratingSummaryLookup) {
          ratingSummaryLookup = cached.ratingSummaryLookup;
        }
        if (typeof cached.reviewsTableAvailable === 'boolean') {
          reviewsCache.tableAvailable = cached.reviewsTableAvailable;
        }
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
      let finalProducts = initialProducts.map(function (p) {
        return Object.assign({}, p);
      });
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

          let reviewsReady = false;
          if (
            setRes.status === 'fulfilled' &&
            setRes.value &&
            !setRes.value.error &&
            setRes.value.data
          ) {
            finalSettings = normalizeSettings(setRes.value.data);
            reviewsReady = setRes.value.data.reviews_enabled === true;
          }

          reviewsCache.tableAvailable = reviewsReady;

          // If products loaded from Supabase AND reviews.sql has been executed, fetch rating summaries
          if (source === 'supabase' && reviewsReady) {
            await getRatingSummaries(true, finalProducts);
          }
        } catch (err) {
          reviewsCache.tableAvailable = false;
        }
      }

      memoryCache = {
        timestamp: Date.now(),
        products: finalProducts,
        settings: finalSettings,
        source: source,
        ratingSummaryLookup: ratingSummaryLookup,
        reviewsTableAvailable: Boolean(reviewsCache.tableAvailable)
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

  /* ------------------------------------------------------------------------
     6. Customer Reviews Data Methods
     ------------------------------------------------------------------------ */
  function attachSummaryLookupProps(arr, lookup) {
    const result = Array.isArray(arr) ? arr.slice() : [];
    Object.keys(lookup).forEach(function (k) {
      result[k] = lookup[k];
    });
    result.byProduct = lookup;
    return result;
  }

  async function ensureReviewsReadinessChecked() {
    if (reviewsCache.tableAvailable !== null) {
      return Boolean(reviewsCache.tableAvailable);
    }
    if (inflightPromise) {
      try {
        await inflightPromise;
      } catch (e) {
        // Ignore
      }
      return Boolean(reviewsCache.tableAvailable);
    }
    try {
      await loadAll();
    } catch (e) {
      // Ignore
    }
    return Boolean(reviewsCache.tableAvailable);
  }

  async function getRatingSummaries(forceRefresh, targetProductsList) {
    const now = Date.now();
    if (
      !forceRefresh &&
      reviewsCache.summariesList &&
      now - reviewsCache.summariesTimestamp < CACHE_TTL_MS
    ) {
      return attachSummaryLookupProps(reviewsCache.summariesList, ratingSummaryLookup);
    }

    if (!targetProductsList && reviewsCache.tableAvailable === null) {
      await ensureReviewsReadinessChecked();
    }

    if (!supabaseClient || reviewsCache.tableAvailable !== true) {
      return attachSummaryLookupProps([], ratingSummaryLookup);
    }

    let rows = [];
    try {
      const { data, error } = await supabaseClient
        .from('product_rating_summary')
        .select('*');

      if (!error && Array.isArray(data)) {
        rows = data;
        reviewsCache.tableAvailable = true;
      } else {
        // Fallback: compute summaries from approved rows in `reviews` table
        const revRes = await supabaseClient
          .from('reviews')
          .select('product_id, rating')
          .eq('status', 'approved');

        if (revRes.error) {
          reviewsCache.tableAvailable = false;
          return attachSummaryLookupProps([], ratingSummaryLookup);
        }

        reviewsCache.tableAvailable = true;
        const grouped = {};
        (revRes.data || []).forEach(function (r) {
          const pid = r.product_id;
          if (!pid) return;
          if (!grouped[pid]) grouped[pid] = { sum: 0, count: 0 };
          grouped[pid].sum += Number(r.rating) || 0;
          grouped[pid].count += 1;
        });

        rows = Object.keys(grouped).map(function (pid) {
          const g = grouped[pid];
          const prod = findProduct(pid);
          return {
            product_id: pid,
            slug: prod ? prod.slug : pid,
            average_rating: Number((g.sum / g.count).toFixed(1)),
            review_count: g.count
          };
        });
      }
    } catch (err) {
      reviewsCache.tableAvailable = false;
      return attachSummaryLookupProps([], ratingSummaryLookup);
    }

    const nextLookup = {};
    const prods = targetProductsList || window.HANDLE_HUE_PRODUCTS || initialProducts;

    rows.forEach(function (row) {
      const count = Number(row.review_count) || 0;
      const avg = count > 0 ? Number(Number(row.average_rating).toFixed(1)) : null;
      if (count <= 0 || avg === null) return;

      const matchedProd = prods.find(function (p) {
        return p.uuid === row.product_id || p.slug === row.slug || p.id === row.product_id;
      });
      const slug = row.slug || (matchedProd ? matchedProd.slug : null);

      const entry = {
        product_id: row.product_id,
        slug: slug,
        average_rating: avg,
        review_count: count
      };

      if (row.product_id) nextLookup[row.product_id] = entry;
      if (slug) nextLookup[slug] = entry;
    });

    ratingSummaryLookup = nextLookup;
    reviewsCache.summariesList = rows;
    reviewsCache.summariesTimestamp = Date.now();

    applySummariesToProducts(prods);

    return attachSummaryLookupProps(rows, ratingSummaryLookup);
  }

  async function getApprovedReviews(productId, forceRefresh) {
    if (!productId) return [];
    const prod = findProduct(productId);
    const cacheKey = prod ? prod.slug : String(productId);
    const now = Date.now();

    if (
      !forceRefresh &&
      reviewsCache.byProduct[cacheKey] &&
      now - reviewsCache.byProduct[cacheKey].timestamp < CACHE_TTL_MS
    ) {
      return reviewsCache.byProduct[cacheKey].items;
    }

    if (reviewsCache.tableAvailable === null) {
      await ensureReviewsReadinessChecked();
    }

    if (!supabaseClient || reviewsCache.tableAvailable !== true) {
      const empty = [];
      empty.tableAvailable = false;
      return empty;
    }

    const candidateUuid = prod && UUID_REGEX.test(String(prod.uuid)) ? prod.uuid : (UUID_REGEX.test(String(productId)) ? String(productId) : null);
    if (!candidateUuid) {
      // Static fallback product without a database UUID yet
      const empty = [];
      empty.tableAvailable = Boolean(reviewsCache.tableAvailable);
      return empty;
    }

    try {
      const { data, error } = await supabaseClient
        .from('reviews')
        .select('id, product_id, reviewer_name, reviewer_city, rating, title, comment, status, show_on_homepage, created_at')
        .eq('product_id', candidateUuid)
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      if (error) {
        reviewsCache.tableAvailable = false;
        const empty = [];
        empty.tableAvailable = false;
        return empty;
      }

      reviewsCache.tableAvailable = true;
      const items = Array.isArray(data) ? data : [];
      items.tableAvailable = true;

      reviewsCache.byProduct[cacheKey] = {
        timestamp: Date.now(),
        items: items
      };

      // Also update product's rating summary in memory from its approved reviews
      if (prod) {
        if (items.length > 0) {
          const sum = items.reduce(function (acc, r) {
            return acc + (Number(r.rating) || 0);
          }, 0);
          const avg = Number((sum / items.length).toFixed(1));
          prod.rating = avg;
          prod.reviewsCount = items.length;
          ratingSummaryLookup[prod.slug] = {
            product_id: candidateUuid,
            slug: prod.slug,
            average_rating: avg,
            review_count: items.length
          };
          ratingSummaryLookup[candidateUuid] = ratingSummaryLookup[prod.slug];
        } else {
          prod.rating = null;
          prod.reviewsCount = 0;
        }
      }

      return items;
    } catch (err) {
      const empty = [];
      empty.tableAvailable = false;
      return empty;
    }
  }

  async function getHomepageReviews(forceRefresh) {
    const now = Date.now();
    if (
      !forceRefresh &&
      reviewsCache.homepageList &&
      now - reviewsCache.homepageTimestamp < CACHE_TTL_MS
    ) {
      return reviewsCache.homepageList;
    }

    if (reviewsCache.tableAvailable === null) {
      await ensureReviewsReadinessChecked();
    }

    if (!supabaseClient || reviewsCache.tableAvailable !== true) {
      return [];
    }

    try {
      const { data, error } = await supabaseClient
        .from('reviews')
        .select('id, product_id, reviewer_name, reviewer_city, rating, title, comment, status, show_on_homepage, created_at')
        .eq('status', 'approved')
        .eq('show_on_homepage', true)
        .order('created_at', { ascending: false })
        .limit(6);

      if (error) {
        reviewsCache.tableAvailable = false;
        return [];
      }

      reviewsCache.tableAvailable = true;
      const enriched = (Array.isArray(data) ? data : []).map(function (r) {
        const prod = findProduct(r.product_id);
        return Object.assign({}, r, {
          product_name: prod ? prod.name : 'Handle & Hue Piece',
          product_slug: prod ? prod.id : ''
        });
      });

      reviewsCache.homepageList = enriched;
      reviewsCache.homepageTimestamp = Date.now();
      return enriched;
    } catch (err) {
      return [];
    }
  }

  async function submitReview(input) {
    const raw = input && typeof input === 'object' ? input : {};
    const reviewerName = String(raw.reviewer_name || '').trim();
    const reviewerCity = String(raw.reviewer_city || '').trim();
    const rating = parseInt(raw.rating, 10);
    const title = String(raw.title || '').trim();
    const comment = String(raw.comment || '').trim();

    if (reviewerName.length < 2 || reviewerName.length > 60) {
      return {
        ok: false,
        error: 'Please enter your name (between 2 and 60 characters).'
      };
    }
    if (reviewerCity.length > 60) {
      return {
        ok: false,
        error: 'City name must be 60 characters or fewer.'
      };
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return {
        ok: false,
        error: 'Please select a star rating between 1 and 5 stars.'
      };
    }
    if (title.length > 100) {
      return {
        ok: false,
        error: 'Review title must be 100 characters or fewer.'
      };
    }
    if (comment.length < 10 || comment.length > 1000) {
      return {
        ok: false,
        error: 'Please write a review comment between 10 and 1,000 characters.'
      };
    }

    const prod = findProduct(raw.product_id);
    let targetUuid =
      prod && UUID_REGEX.test(String(prod.uuid))
        ? prod.uuid
        : UUID_REGEX.test(String(raw.product_id))
        ? String(raw.product_id)
        : null;

    if (reviewsCache.tableAvailable === null) {
      await ensureReviewsReadinessChecked();
    }

    if (!supabaseClient) {
      return {
        ok: false,
        error: 'Review service is currently offline. Please try again later.'
      };
    }

    if (reviewsCache.tableAvailable !== true) {
      return {
        ok: true,
        localPreview: true
      };
    }

    // If product UUID was not loaded yet, try looking it up by slug in Supabase
    if (!targetUuid && prod && prod.slug) {
      try {
        const lookupRes = await supabaseClient
          .from('products')
          .select('id')
          .eq('slug', prod.slug)
          .maybeSingle();
        if (lookupRes && !lookupRes.error && lookupRes.data && lookupRes.data.id) {
          targetUuid = lookupRes.data.id;
          prod.uuid = targetUuid;
        }
      } catch (e) {
        // Ignore lookup error
      }
    }

    if (!targetUuid) {
      return {
        ok: true,
        localPreview: true
      };
    }

    try {
      const payload = {
        product_id: targetUuid,
        reviewer_name: reviewerName,
        reviewer_city: reviewerCity || null,
        rating: rating,
        title: title || null,
        comment: comment,
        status: 'pending',
        show_on_homepage: false
      };

      const { error } = await supabaseClient.from('reviews').insert([payload]);
      if (error) {
        const msg = String(error.message || '');
        const code = String(error.code || '');
        if (
          code === '42P01' ||
          code === 'PGRST205' ||
          msg.toLowerCase().includes('does not exist') ||
          msg.toLowerCase().includes('could not find the table')
        ) {
          reviewsCache.tableAvailable = false;
          return {
            ok: true,
            localPreview: true
          };
        }
        return {
          ok: false,
          error: msg || 'Could not submit your review right now.'
        };
      }

      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        error: 'Network error while submitting your review. Please try again.'
      };
    }
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
    escapeHTML: escapeHTML,
    getApprovedReviews: getApprovedReviews,
    getRatingSummaries: getRatingSummaries,
    submitReview: submitReview,
    getHomepageReviews: getHomepageReviews
  };
})();
