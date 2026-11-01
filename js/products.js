/**
 * ============================================================================
 * HANDLE & HUE — Product Catalog & Brand Hue Data (js/products.js)
 * ============================================================================
 * HOW TO REPLACE PLACEHOLDER IMAGES WITH REAL PHOTOS:
 * Each product below has an `images` object with 4 paths:
 *   - primary:   Main studio front view (800x900 recommended, .jpg or .webp)
 *   - secondary: Hover angle / lifestyle view shown when hovering a card
 *   - detail:    Close-up hardware / leather grain detail view
 *   - lifestyle: On-model or editorial plinth view
 * Simply place your photos inside `assets/images/products/` and update the
 * file extension/name below.
 * ============================================================================
 */

window.HANDLE_HUE_COLORS = [
  {
    key: 'Blush Pink',
    name: 'Blush Pink',
    hex: '#F4D9D0',
    poetic: 'Soft petal warmth — our signature atelier neutral.',
    borderHex: '#DEC0B6'
  },
  {
    key: 'Warm Ivory',
    name: 'Warm Ivory',
    hex: '#FAF6F0',
    poetic: 'Sunlit alabaster calfskin with creamy undertones.',
    borderHex: '#D8CFC2'
  },
  {
    key: 'Champagne Gold',
    name: 'Champagne Gold',
    hex: '#C9A66B',
    poetic: 'Luminous brushed metallic finish for day-to-evening radiance.',
    borderHex: '#B08D52'
  },
  {
    key: 'Deep Charcoal',
    name: 'Deep Charcoal',
    hex: '#2B2B2B',
    poetic: 'Velvety architectural noir with warm espresso depth.',
    borderHex: '#2B2B2B'
  },
  {
    key: 'Sage Mist',
    name: 'Sage Mist',
    hex: '#C5CEBE',
    poetic: 'Botanical celadon grey inspired by Mediterranean olive groves.',
    borderHex: '#A7B29F'
  },
  {
    key: 'Terracotta',
    name: 'Terracotta',
    hex: '#C98A74',
    poetic: 'Sun-baked Sienna clay with rich artisanal patina.',
    borderHex: '#B2735D'
  },
  {
    key: 'Dusty Mauve',
    name: 'Dusty Mauve',
    hex: '#D4B5B8',
    poetic: 'Romantic twilight rose with muted vintage poise.',
    borderHex: '#B9989B'
  }
];

window.HANDLE_HUE_CATEGORIES = [
  {
    id: 'Totes',
    name: 'Totes',
    subtitle: 'Architectural carryalls',
    count: 3,
    image: 'assets/images/categories/cat-totes.svg'
  },
  {
    id: 'Handbags',
    name: 'Handbags',
    subtitle: 'Sculptural top-handles',
    count: 3,
    image: 'assets/images/categories/cat-handbags.svg'
  },
  {
    id: 'Crossbody',
    name: 'Crossbody',
    subtitle: 'Effortless hands-free poise',
    count: 3,
    image: 'assets/images/categories/cat-crossbody.svg'
  },
  {
    id: 'Clutches',
    name: 'Clutches',
    subtitle: 'Evening & occasion icons',
    count: 3,
    image: 'assets/images/categories/cat-clutches.svg'
  },
  {
    id: 'Backpacks',
    name: 'Backpacks',
    subtitle: 'Convertible city companions',
    count: 2,
    image: 'assets/images/categories/cat-backpacks.svg'
  }
];

window.HANDLE_HUE_PRODUCTS = [
  {
    id: 'aurelia-tote',
    sku: 'HH-TOT-001',
    name: 'The Aurelia Structured Tote',
    subtitle: 'Winged Italian Calfskin Carryall',
    price: 340,
    category: 'Totes',
    primaryColor: 'Blush Pink',
    colors: [
      { name: 'Blush Pink', hex: '#F4D9D0' },
      { name: 'Warm Ivory', hex: '#FAF6F0' },
      { name: 'Deep Charcoal', hex: '#2B2B2B' },
      { name: 'Champagne Gold', hex: '#C9A66B' }
    ],
    badge: 'Bestseller',
    isNew: false,
    isBestseller: true,
    rating: 4.9,
    reviewsCount: 128,
    dimensions: '36 × 28 × 15 cm (14.2" × 11" × 5.9")',
    strapDrop: '24 cm top handle drop',
    weight: '0.78 kg',
    capacity: 'Fits 14" laptop, diary, cosmetics pouch & water bottle',
    materials: '100% Full-grain Italian pebbled calfskin, organic cotton-suede lining, 18k brushed champagne gold-plated brass turn-lock.',
    description: 'Our signature silhouette. The Aurelia Structured Tote balances architectural winged gussets with hand-rolled tubular handles and a belted champagne gold turn-lock. Designed to transition effortlessly from morning studio meetings to twilight dinners.',
    images: {
      primary: 'assets/images/products/aurelia-tote-primary.svg',
      secondary: 'assets/images/products/aurelia-tote-hover.svg',
      detail: 'assets/images/products/aurelia-tote-detail.svg',
      lifestyle: 'assets/images/products/aurelia-tote-lifestyle.svg'
    }
  },
  {
    id: 'seraphine-handbag',
    sku: 'HH-HBG-002',
    name: 'The Séraphine Arch Handbag',
    subtitle: 'Sculptural Half-Moon Top Handle',
    price: 295,
    category: 'Handbags',
    primaryColor: 'Warm Ivory',
    colors: [
      { name: 'Warm Ivory', hex: '#FAF6F0' },
      { name: 'Blush Pink', hex: '#F4D9D0' },
      { name: 'Sage Mist', hex: '#C5CEBE' }
    ],
    badge: 'New',
    isNew: true,
    isBestseller: true,
    rating: 5.0,
    reviewsCount: 84,
    dimensions: '26 × 21 × 10 cm (10.2" × 8.3" × 3.9")',
    strapDrop: '12 cm handle | 52 cm detachable crossbody strap',
    weight: '0.54 kg',
    capacity: 'Fits all iPhone Pro Max sizes, cardholder, keys & compact',
    materials: 'Smooth vegetable-tanned box calfskin with hand-painted edges and custom circular champagne gold rings.',
    description: 'Inspired by neoclassical gallery arches, The Séraphine features a sweeping dome silhouette crowned with a rigid sculptural handle and signature champagne gold medallion clasp.',
    images: {
      primary: 'assets/images/products/seraphine-handbag-primary.svg',
      secondary: 'assets/images/products/seraphine-handbag-hover.svg',
      detail: 'assets/images/products/seraphine-handbag-detail.svg',
      lifestyle: 'assets/images/products/seraphine-handbag-lifestyle.svg'
    }
  },
  {
    id: 'celeste-crossbody',
    sku: 'HH-CRB-003',
    name: 'The Céleste Pleated Crossbody',
    subtitle: 'Softly Gathered Cloud Shoulder Bag',
    price: 225,
    category: 'Crossbody',
    primaryColor: 'Champagne Gold',
    colors: [
      { name: 'Champagne Gold', hex: '#C9A66B' },
      { name: 'Blush Pink', hex: '#F4D9D0' },
      { name: 'Deep Charcoal', hex: '#2B2B2B' }
    ],
    badge: 'New',
    isNew: true,
    isBestseller: false,
    rating: 4.8,
    reviewsCount: 52,
    dimensions: '24 × 16 × 8 cm (9.4" × 6.3" × 3.1")',
    strapDrop: '55 cm diamond-cut chain & leather comfort pad',
    weight: '0.42 kg',
    capacity: 'Fits smartphone, sunglasses, lip color & slim wallet',
    materials: 'Supple nappa lambskin with artisan vertical pleating and detachable jewelry-grade champagne gold chain.',
    description: 'Featherlight and poetic, The Céleste is crafted from butter-soft nappa leather gathered into soft pleats that catch the light at every angle.',
    images: {
      primary: 'assets/images/products/celeste-crossbody-primary.svg',
      secondary: 'assets/images/products/celeste-crossbody-hover.svg',
      detail: 'assets/images/products/celeste-crossbody-detail.svg',
      lifestyle: 'assets/images/products/celeste-crossbody-lifestyle.svg'
    }
  },
  {
    id: 'lumiere-clutch',
    sku: 'HH-CLT-004',
    name: 'The Lumière Evening Clutch',
    subtitle: 'Envelope Frame Clutch with Gold Bar',
    price: 195,
    category: 'Clutches',
    primaryColor: 'Blush Pink',
    colors: [
      { name: 'Blush Pink', hex: '#F4D9D0' },
      { name: 'Champagne Gold', hex: '#C9A66B' },
      { name: 'Warm Ivory', hex: '#FAF6F0' }
    ],
    badge: 'Limited Hue',
    isNew: true,
    isBestseller: false,
    rating: 4.9,
    reviewsCount: 41,
    dimensions: '25 × 14 × 5 cm (9.8" × 5.5" × 2.0")',
    strapDrop: '48 cm hideaway snake chain',
    weight: '0.35 kg',
    capacity: 'Fits phone, evening essentials & 4 interior card slots',
    materials: 'Satin-buffed calfskin exterior, blush micro-suede lining, solid brushed brass bar hardware.',
    description: 'Tailored geometry meets evening romance. The Lumière Clutch secures with an elongated champagne gold bar that doubles as a tactile jewelry accent in the palm of your hand.',
    images: {
      primary: 'assets/images/products/lumiere-clutch-primary.svg',
      secondary: 'assets/images/products/lumiere-clutch-hover.svg',
      detail: 'assets/images/products/lumiere-clutch-detail.svg',
      lifestyle: 'assets/images/products/lumiere-clutch-lifestyle.svg'
    }
  },
  {
    id: 'valerie-backpack',
    sku: 'HH-BPK-005',
    name: 'The Valérie City Backpack',
    subtitle: 'Structured Leather Daypack',
    price: 360,
    category: 'Backpacks',
    primaryColor: 'Deep Charcoal',
    colors: [
      { name: 'Deep Charcoal', hex: '#2B2B2B' },
      { name: 'Warm Ivory', hex: '#FAF6F0' },
      { name: 'Terracotta', hex: '#C98A74' }
    ],
    badge: 'Bestseller',
    isNew: false,
    isBestseller: true,
    rating: 4.9,
    reviewsCount: 97,
    dimensions: '33 × 27 × 14 cm (13" × 10.6" × 5.5")',
    strapDrop: '8 cm top handle | Adjustable 65–82 cm shoulder straps',
    weight: '0.82 kg',
    capacity: 'Fits 13" MacBook Air/Pro, notebook, charger & umbrella',
    materials: 'Scratch-resistant fine-grain calfskin with reinforced base studs and quick-release gold lock.',
    description: 'Refined utility for the modern flâneuse. The Valérie replaces casual nylon with clean architectural leatherwork, a rolled top handle, and convertible straps.',
    images: {
      primary: 'assets/images/products/valerie-backpack-primary.svg',
      secondary: 'assets/images/products/valerie-backpack-hover.svg',
      detail: 'assets/images/products/valerie-backpack-detail.svg',
      lifestyle: 'assets/images/products/valerie-backpack-lifestyle.svg'
    }
  },
  {
    id: 'solene-tote',
    sku: 'HH-TOT-006',
    name: 'The Solène East-West Tote',
    subtitle: 'Elongated Belted Gallery Tote',
    price: 315,
    category: 'Totes',
    primaryColor: 'Warm Ivory',
    colors: [
      { name: 'Warm Ivory', hex: '#FAF6F0' },
      { name: 'Terracotta', hex: '#C98A74' },
      { name: 'Blush Pink', hex: '#F4D9D0' }
    ],
    badge: 'New',
    isNew: true,
    isBestseller: false,
    rating: 4.8,
    reviewsCount: 63,
    dimensions: '39 × 22 × 13 cm (15.3" × 8.7" × 5.1")',
    strapDrop: '25 cm slender shoulder straps',
    weight: '0.68 kg',
    capacity: 'Fits 13" laptop horizontally, sunglasses case & wallet',
    materials: 'Full-grain Italian calfskin with dual custom-cast champagne gold belt buckles.',
    description: 'With its contemporary horizontal proportion and twin belted straps, The Solène brings effortless Milanese poise to everyday dressing.',
    images: {
      primary: 'assets/images/products/solene-tote-primary.svg',
      secondary: 'assets/images/products/solene-tote-hover.svg',
      detail: 'assets/images/products/solene-tote-detail.svg',
      lifestyle: 'assets/images/products/solene-tote-lifestyle.svg'
    }
  },
  {
    id: 'camille-handbag',
    sku: 'HH-HBG-007',
    name: 'The Camille Top-Handle Satchel',
    subtitle: 'Trapezoid Satchel with Clochette',
    price: 325,
    category: 'Handbags',
    primaryColor: 'Sage Mist',
    colors: [
      { name: 'Sage Mist', hex: '#C5CEBE' },
      { name: 'Blush Pink', hex: '#F4D9D0' },
      { name: 'Warm Ivory', hex: '#FAF6F0' },
      { name: 'Deep Charcoal', hex: '#2B2B2B' }
    ],
    badge: 'Bestseller',
    isNew: false,
    isBestseller: true,
    rating: 4.9,
    reviewsCount: 112,
    dimensions: '28 × 22 × 12 cm (11" × 8.7" × 4.7")',
    strapDrop: '10 cm top handle | 50 cm removable shoulder strap',
    weight: '0.64 kg',
    capacity: 'Three accordion compartments for organized daily carry',
    materials: 'Supple grained calfskin, suede interior dividers, engraved lock plaque and leather key clochette.',
    description: 'Timeless heirloom proportions in our calming Sage Mist hue. The Camille opens to three gusseted compartments that keep every essential in serene order.',
    images: {
      primary: 'assets/images/products/camille-handbag-primary.svg',
      secondary: 'assets/images/products/camille-handbag-hover.svg',
      detail: 'assets/images/products/camille-handbag-detail.svg',
      lifestyle: 'assets/images/products/camille-handbag-lifestyle.svg'
    }
  },
  {
    id: 'elodie-crossbody',
    sku: 'HH-CRB-008',
    name: 'The Élodie Saddle Crossbody',
    subtitle: 'Equitation Curve Bag with Stirrup Ring',
    price: 245,
    category: 'Crossbody',
    primaryColor: 'Terracotta',
    colors: [
      { name: 'Terracotta', hex: '#C98A74' },
      { name: 'Warm Ivory', hex: '#FAF6F0' },
      { name: 'Deep Charcoal', hex: '#2B2B2B' }
    ],
    badge: 'Bestseller',
    isNew: false,
    isBestseller: true,
    rating: 4.8,
    reviewsCount: 79,
    dimensions: '23 × 19 × 7.5 cm (9.1" × 7.5" × 3.0")',
    strapDrop: '46–56 cm 5-hole adjustable crossbody strap',
    weight: '0.49 kg',
    capacity: 'Fits phone, passport, keys & compact mirror',
    materials: 'Saddle-grade vegetable-tanned leather with contrast ecru stitching and oversized brushed gold ring.',
    description: 'A celebration of equestrian heritage softened for the modern wardrobe. The Élodie’s organic curve and warm Terracotta hue add instant richness to linen and cashmere alike.',
    images: {
      primary: 'assets/images/products/elodie-crossbody-primary.svg',
      secondary: 'assets/images/products/elodie-crossbody-hover.svg',
      detail: 'assets/images/products/elodie-crossbody-detail.svg',
      lifestyle: 'assets/images/products/elodie-crossbody-lifestyle.svg'
    }
  },
  {
    id: 'margaux-handbag',
    sku: 'HH-HBG-009',
    name: 'The Margaux Knot Mini Handbag',
    subtitle: 'Crescent Hobo with Artisan Knots',
    price: 265,
    category: 'Handbags',
    primaryColor: 'Dusty Mauve',
    colors: [
      { name: 'Dusty Mauve', hex: '#D4B5B8' },
      { name: 'Blush Pink', hex: '#F4D9D0' },
      { name: 'Champagne Gold', hex: '#C9A66B' }
    ],
    badge: 'New',
    isNew: true,
    isBestseller: false,
    rating: 4.9,
    reviewsCount: 38,
    dimensions: '24 × 20 × 9 cm (9.4" × 7.9" × 3.5")',
    strapDrop: '14 cm sculptural wrist/arm carry',
    weight: '0.41 kg',
    capacity: 'Fits large smartphone, card case, keys & fragrance',
    materials: 'Glove-soft Italian lambskin with hand-tied leather knots and solid gold-dipped cuff ferrules.',
    description: 'Intimate and tactile, The Margaux wraps a soft crescent silhouette in our romantic Dusty Mauve tone, finished with artisan knotted cuffs.',
    images: {
      primary: 'assets/images/products/margaux-handbag-primary.svg',
      secondary: 'assets/images/products/margaux-handbag-hover.svg',
      detail: 'assets/images/products/margaux-handbag-detail.svg',
      lifestyle: 'assets/images/products/margaux-handbag-lifestyle.svg'
    }
  },
  {
    id: 'vivienne-clutch',
    sku: 'HH-CLT-010',
    name: 'The Vivienne Box Clutch',
    subtitle: 'Leather-Wrapped Minaudière',
    price: 210,
    category: 'Clutches',
    primaryColor: 'Champagne Gold',
    colors: [
      { name: 'Champagne Gold', hex: '#C9A66B' },
      { name: 'Deep Charcoal', hex: '#2B2B2B' },
      { name: 'Warm Ivory', hex: '#FAF6F0' }
    ],
    badge: 'Bestseller',
    isNew: false,
    isBestseller: true,
    rating: 5.0,
    reviewsCount: 66,
    dimensions: '20 × 12 × 5.5 cm (7.9" × 4.7" × 2.2")',
    strapDrop: '52 cm tuck-in gold link chain',
    weight: '0.44 kg',
    capacity: 'Fits iPhone Pro, lipstick, keys & cards',
    materials: 'Metallic-leaf calfskin over a lightweight architectural frame with twin spherical kiss-lock.',
    description: 'An heirloom-worthy evening jewel. The Vivienne Box Clutch pairs a structured champagne gold frame with twin spherical kiss-lock clasps.',
    images: {
      primary: 'assets/images/products/vivienne-clutch-primary.svg',
      secondary: 'assets/images/products/vivienne-clutch-hover.svg',
      detail: 'assets/images/products/vivienne-clutch-detail.svg',
      lifestyle: 'assets/images/products/vivienne-clutch-lifestyle.svg'
    }
  },
  {
    id: 'noemie-backpack',
    sku: 'HH-BPK-011',
    name: 'The Noémie Convertible Backpack',
    subtitle: 'Drawstring Backpack & Shoulder Bag',
    price: 345,
    category: 'Backpacks',
    primaryColor: 'Blush Pink',
    colors: [
      { name: 'Blush Pink', hex: '#F4D9D0' },
      { name: 'Warm Ivory', hex: '#FAF6F0' },
      { name: 'Sage Mist', hex: '#C5CEBE' }
    ],
    badge: 'New',
    isNew: true,
    isBestseller: false,
    rating: 4.8,
    reviewsCount: 45,
    dimensions: '30 × 25 × 13 cm (11.8" × 9.8" × 5.1")',
    strapDrop: 'Converts in one pull from 30 cm shoulder to backpack',
    weight: '0.71 kg',
    capacity: 'Fits 11" iPad Pro, planner, cosmetics bag & sunglasses',
    materials: 'Supple pebbled calfskin with custom champagne gold eyelets and magnetic medallion flap.',
    description: 'Designed for spontaneous days, The Noémie transforms from a relaxed shoulder bag into a hands-free backpack with a single fluid pull of its straps.',
    images: {
      primary: 'assets/images/products/noemie-backpack-primary.svg',
      secondary: 'assets/images/products/noemie-backpack-hover.svg',
      detail: 'assets/images/products/noemie-backpack-detail.svg',
      lifestyle: 'assets/images/products/noemie-backpack-lifestyle.svg'
    }
  },
  {
    id: 'colette-crossbody',
    sku: 'HH-CRB-012',
    name: 'The Colette Bucket Crossbody',
    subtitle: 'Architectural Cinch Bucket Bag',
    price: 255,
    category: 'Crossbody',
    primaryColor: 'Warm Ivory',
    colors: [
      { name: 'Warm Ivory', hex: '#FAF6F0' },
      { name: 'Blush Pink', hex: '#F4D9D0' },
      { name: 'Dusty Mauve', hex: '#D4B5B8' }
    ],
    badge: '',
    isNew: false,
    isBestseller: false,
    rating: 4.7,
    reviewsCount: 54,
    dimensions: '22 × 25 × 14 cm (8.7" × 9.8" × 5.5")',
    strapDrop: '18 cm top handle | 50 cm crossbody strap',
    weight: '0.52 kg',
    capacity: 'Spacious cylindrical interior with detachable zippered pouch',
    materials: 'Smooth Italian calfskin bonded with contrast blush pink micro-suede interior.',
    description: 'Clean cylindrical lines meet a whisper of interior blush suede. The Colette cinches smoothly through a sculpted champagne gold collar.',
    images: {
      primary: 'assets/images/products/colette-crossbody-primary.svg',
      secondary: 'assets/images/products/colette-crossbody-hover.svg',
      detail: 'assets/images/products/colette-crossbody-detail.svg',
      lifestyle: 'assets/images/products/colette-crossbody-lifestyle.svg'
    }
  },
  {
    id: 'delphine-tote',
    sku: 'HH-TOT-013',
    name: 'The Delphine Atelier Work Tote',
    subtitle: 'Structured Executive Commuter Tote',
    price: 385,
    category: 'Totes',
    primaryColor: 'Deep Charcoal',
    colors: [
      { name: 'Deep Charcoal', hex: '#2B2B2B' },
      { name: 'Warm Ivory', hex: '#FAF6F0' },
      { name: 'Blush Pink', hex: '#F4D9D0' }
    ],
    badge: 'Bestseller',
    isNew: false,
    isBestseller: true,
    rating: 5.0,
    reviewsCount: 142,
    dimensions: '40 × 30 × 16 cm (15.7" × 11.8" × 6.3")',
    strapDrop: '26 cm reinforced shoulder handles',
    weight: '0.89 kg',
    capacity: 'Fits 16" laptop in padded sleeve, documents, folio & heels',
    materials: 'Full-grain architectural calfskin with contrast blush interior lining and protective gold feet.',
    description: 'Commanding yet unmistakably feminine. The Delphine features a vertical architectural front panel and a blush-lined interior with a dedicated padded laptop suite.',
    images: {
      primary: 'assets/images/products/delphine-tote-primary.svg',
      secondary: 'assets/images/products/delphine-tote-hover.svg',
      detail: 'assets/images/products/delphine-tote-detail.svg',
      lifestyle: 'assets/images/products/delphine-tote-lifestyle.svg'
    }
  },
  {
    id: 'giselle-clutch',
    sku: 'HH-CLT-014',
    name: 'The Giselle Pearl Frame Clutch',
    subtitle: 'Ruched Pouch with Pearl & Gold Clasp',
    price: 185,
    category: 'Clutches',
    primaryColor: 'Warm Ivory',
    colors: [
      { name: 'Warm Ivory', hex: '#FAF6F0' },
      { name: 'Blush Pink', hex: '#F4D9D0' },
      { name: 'Champagne Gold', hex: '#C9A66B' }
    ],
    badge: 'Limited Hue',
    isNew: true,
    isBestseller: false,
    rating: 4.9,
    reviewsCount: 29,
    dimensions: '23 × 15 × 7 cm (9.1" × 5.9" × 2.8")',
    strapDrop: '45 cm delicate gold chain',
    weight: '0.33 kg',
    capacity: 'Fits smartphone, keys, powder compact & cards',
    materials: 'Butter-soft gathered lambskin with cabochon mother-of-pearl and champagne gold frame.',
    description: 'Romantic drapery captured in leather. The Giselle is crowned with twin mother-of-pearl cabochons set in brushed champagne gold.',
    images: {
      primary: 'assets/images/products/giselle-clutch-primary.svg',
      secondary: 'assets/images/products/giselle-clutch-hover.svg',
      detail: 'assets/images/products/giselle-clutch-detail.svg',
      lifestyle: 'assets/images/products/giselle-clutch-lifestyle.svg'
    }
  }
];
