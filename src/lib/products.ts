// Single source of truth for the catalog.
// Amounts are in the smallest currency unit (pesewas). GHS 25 -> 2500.

export type ProductCategory = "VOUCHER" | "FORM";

export interface Product {
  id: string;
  name: string;
  shortName: string;
  category: ProductCategory;
  /** For VOUCHER products, the Voucher.productType key used for inventory. */
  voucherType?: "WASSCE" | "WASSCE_PRIVATE" | "BECE";
  amount: number; // minor units (pesewas)
  currency: "GHS";
  description: string;
  highlights: string[];
  badge?: string;
}

export const PRODUCTS: Product[] = [
  {
    id: "wassce",
    name: "WASSCE Checker Voucher",
    shortName: "WASSCE",
    category: "VOUCHER",
    voucherType: "WASSCE",
    amount: 2500,
    currency: "GHS",
    description:
      "Official WASSCE results checker voucher (school candidates). Delivered instantly after payment.",
    highlights: ["Instant delivery", "Emailed automatically", "Single-use PIN"],
    badge: "Most popular",
  },
  {
    id: "wassce-private",
    name: "Private WASSCE Checker Voucher",
    shortName: "Private WASSCE",
    category: "VOUCHER",
    voucherType: "WASSCE_PRIVATE",
    amount: 2500,
    currency: "GHS",
    description:
      "WASSCE results checker voucher for private / GBCE candidates. Delivered instantly after payment.",
    highlights: ["Instant delivery", "Emailed automatically", "Single-use PIN"],
  },
  {
    id: "bece",
    name: "BECE Checker Voucher",
    shortName: "BECE",
    category: "VOUCHER",
    voucherType: "BECE",
    amount: 2500,
    currency: "GHS",
    description:
      "Official BECE results checker voucher. Delivered instantly after payment.",
    highlights: ["Instant delivery", "Emailed automatically", "Single-use PIN"],
  },
  {
    id: "university-form",
    name: "University Admission Form",
    shortName: "University Form",
    category: "FORM",
    amount: 30000,
    currency: "GHS",
    description:
      "Purchase a university admission form. After payment you'll be connected on WhatsApp so we can send your form and guide you.",
    highlights: [
      "Personal WhatsApp support",
      "Form sent manually after payment",
      "Guided application help",
    ],
    badge: "Assisted",
  },
];

export function getProduct(id: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === id);
}

export function formatGHS(minorUnits: number): string {
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
  }).format(minorUnits / 100);
}
