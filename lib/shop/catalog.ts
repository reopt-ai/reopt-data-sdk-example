/**
 * The shop's catalogue. A module constant rather than a database: this repo
 * exists to exercise the analytics SDK, and a real store would only add moving
 * parts between a click and the event it produces.
 */

export interface Product {
  id: string;
  slug: string;
  name: string;
  category: ProductCategory;
  /** Won, in whole units — the currency the demo formats. */
  price: number;
  blurb: string;
  description: string;
  /** Two-tone gradient stops; the demo has no product photography. */
  swatch: [string, string];
  stock: number;
}

export type ProductCategory = "keyboard" | "audio" | "desk" | "light";

export const CATEGORIES: { id: ProductCategory; label: string }[] = [
  { id: "keyboard", label: "Keyboards" },
  { id: "audio", label: "Audio" },
  { id: "desk", label: "Desk" },
  { id: "light", label: "Lighting" },
];

export const PRODUCTS: Product[] = [
  {
    id: "p_kb_65",
    slug: "aster-65",
    name: "Aster 65",
    category: "keyboard",
    price: 189000,
    blurb: "A 65% keyboard in an aluminum case",
    description:
      "Gasket mounted with five-pin sockets, 2.4 GHz wireless, three-device Bluetooth pairing, and double-shot PBT keycaps.",
    swatch: ["#3b82f6", "#1e3a8a"],
    stock: 12,
  },
  {
    id: "p_kb_tkl",
    slug: "aster-tkl",
    name: "Aster TKL",
    category: "keyboard",
    price: 229000,
    blurb: "Tenkeyless with a programmable rotary knob",
    description:
      "An 87-key extension of the Aster layout. Map the top-right knob to volume, zoom, or scrolling.",
    swatch: ["#6366f1", "#312e81"],
    stock: 5,
  },
  {
    id: "p_au_buds",
    slug: "murmur-buds",
    name: "Murmur Buds",
    category: "audio",
    price: 149000,
    blurb: "Adaptive noise-cancelling earbuds",
    description:
      "Samples ambient noise 200 times per second and adjusts attenuation automatically. Up to 28 hours with the case.",
    swatch: ["#14b8a6", "#134e4a"],
    stock: 40,
  },
  {
    id: "p_au_desk",
    slug: "murmur-desk-speaker",
    name: "Murmur Desk",
    category: "audio",
    price: 279000,
    blurb: "A pair of compact desktop monitors",
    description:
      "Three-inch woofers and silk-dome tweeters, with power and audio over one USB-C cable.",
    swatch: ["#0ea5e9", "#0c4a6e"],
    stock: 8,
  },
  {
    id: "p_dk_mat",
    slug: "field-deskmat",
    name: "Field Deskmat",
    category: "desk",
    price: 39000,
    blurb: "A stitched 900 × 400 mm desk mat",
    description:
      "Four-millimeter foam with a water-resistant coating and double-stitched edges.",
    swatch: ["#f59e0b", "#78350f"],
    stock: 120,
  },
  {
    id: "p_dk_riser",
    slug: "field-monitor-riser",
    name: "Field Riser",
    category: "desk",
    price: 89000,
    blurb: "An oil-finished wood monitor riser",
    description:
      "A 95 mm birch-plywood riser with enough clearance to store a keyboard underneath.",
    swatch: ["#a3623b", "#4a2c17"],
    stock: 22,
  },
  {
    id: "p_lt_bar",
    slug: "halo-screen-bar",
    name: "Halo Screen Bar",
    category: "light",
    price: 119000,
    blurb: "A monitor light with glare-free asymmetric optics",
    description:
      "Keeps light off the screen and offers continuously variable color temperature from 2700 K to 6500 K.",
    swatch: ["#fbbf24", "#92400e"],
    stock: 33,
  },
  {
    id: "p_lt_lamp",
    slug: "halo-desk-lamp",
    name: "Halo Desk Lamp",
    category: "light",
    price: 159000,
    blurb: "An articulated, spring-balanced desk lamp",
    description:
      "Two joints and a rotating head hold their position through a balanced spring mechanism.",
    swatch: ["#f472b6", "#831843"],
    stock: 17,
  },
];

export function findProduct(slug: string): Product | undefined {
  return PRODUCTS.find((product) => product.slug === slug);
}

export function findProductById(id: string): Product | undefined {
  return PRODUCTS.find((product) => product.id === id);
}

const WON = new Intl.NumberFormat("ko-KR", {
  style: "currency",
  currency: "KRW",
  maximumFractionDigits: 0,
});

export function formatWon(amount: number): string {
  return WON.format(amount);
}
