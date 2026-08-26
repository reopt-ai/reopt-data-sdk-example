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
  image: string;
  imageAlt: string;
  badge?: string;
  details: { label: string; value: string }[];
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
    image: "/images/products/aster-65.webp",
    imageAlt: "Cobalt Aster 65 mechanical keyboard on an ivory surface",
    badge: "Bestseller",
    details: [
      { label: "Layout", value: "65% · 68 keys" },
      { label: "Connection", value: "USB-C · Bluetooth · 2.4 GHz" },
      { label: "Case", value: "CNC aluminum" },
    ],
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
    image: "/images/products/aster-tkl.webp",
    imageAlt: "Graphite Aster TKL keyboard with a cobalt rotary knob",
    details: [
      { label: "Layout", value: "TKL · 87 keys" },
      { label: "Connection", value: "USB-C · Bluetooth · 2.4 GHz" },
      { label: "Controls", value: "Programmable rotary knob" },
    ],
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
    image: "/images/products/murmur-buds.webp",
    imageAlt: "Ivory Murmur wireless earbuds in a cobalt charging case",
    badge: "New",
    details: [
      { label: "Listening", value: "Up to 8 hours" },
      { label: "With case", value: "Up to 28 hours" },
      { label: "Charging", value: "USB-C · Qi" },
    ],
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
    image: "/images/products/murmur-desk-speaker.webp",
    imageAlt: "Pair of compact graphite Murmur desktop speakers",
    details: [
      { label: "Drivers", value: "3 in woofer · silk tweeter" },
      { label: "Input", value: "USB-C · 3.5 mm" },
      { label: "Power", value: "60 W peak" },
    ],
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
    image: "/images/products/field-deskmat.webp",
    imageAlt: "Cobalt Field desk mat with stitched coral edge",
    details: [
      { label: "Size", value: "900 × 400 mm" },
      { label: "Thickness", value: "4 mm" },
      { label: "Surface", value: "Water-resistant textile" },
    ],
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
    image: "/images/products/field-monitor-riser.webp",
    imageAlt: "Walnut Field monitor riser on an ivory desk",
    badge: "Small batch",
    details: [
      { label: "Width", value: "620 mm" },
      { label: "Clearance", value: "95 mm" },
      { label: "Finish", value: "Natural hardwax oil" },
    ],
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
    image: "/images/products/halo-screen-bar.webp",
    imageAlt: "Halo Screen Bar casting warm light over a monitor",
    details: [
      { label: "Temperature", value: "2700–6500 K" },
      { label: "Controls", value: "Touch dimmer" },
      { label: "Power", value: "USB-C · 8 W" },
    ],
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
    image: "/images/products/halo-desk-lamp.webp",
    imageAlt: "Ivory articulated Halo Desk Lamp with cobalt details",
    details: [
      { label: "Reach", value: "680 mm" },
      { label: "Temperature", value: "3000–6000 K" },
      { label: "Controls", value: "Rotary dimmer" },
    ],
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
