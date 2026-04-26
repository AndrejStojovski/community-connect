export const CATEGORIES = [
  "Electronics",
  "Documents & ID",
  "Keys",
  "Wallets & Bags",
  "Clothing",
  "Jewelry & Watches",
  "Pets",
  "Books & Stationery",
  "Other",
] as const;

export type Category = typeof CATEGORIES[number];