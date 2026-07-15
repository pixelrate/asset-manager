// App-level enums (kept as strings in the DB for SQLite/Postgres portability).

export type Option = { value: string; label: string };

export const CONDITIONS: Option[] = [
  { value: "NEW", label: "New" },
  { value: "LIKE_NEW", label: "Like New" },
  { value: "GOOD", label: "Good" },
  { value: "FAIR", label: "Fair" },
  { value: "POOR", label: "Poor" },
  { value: "PARTS_ONLY", label: "Parts Only" },
];

export const DECISIONS: Option[] = [
  { value: "UNDECIDED", label: "Undecided" },
  { value: "KEEP", label: "Keep" },
  { value: "SELL", label: "Sell" },
  { value: "DONATE", label: "Donate" },
  { value: "TRASH", label: "Trash" },
];

export const SELLING_STATUSES: Option[] = [
  { value: "NOT_LISTED", label: "Not Listed" },
  { value: "READY_FOR_PHOTOS", label: "Ready for Photos" },
  { value: "PHOTOGRAPHED", label: "Photographed" },
  { value: "LISTED", label: "Listed" },
  { value: "OFFER_RECEIVED", label: "Offer Received" },
  { value: "PENDING_PICKUP", label: "Pending Pickup" },
  { value: "SOLD", label: "Sold" },
];

export const MARKETPLACES: Option[] = [
  { value: "FACEBOOK", label: "Facebook Marketplace" },
  { value: "EBAY", label: "eBay" },
  { value: "CRAIGSLIST", label: "Craigslist" },
  { value: "OFFERUP", label: "OfferUp" },
  { value: "LOCAL", label: "Local Sale" },
  { value: "FRIEND", label: "Friend / Family" },
  { value: "AUCTION", label: "Auction" },
];

export const LOCATION_TYPES: Option[] = [
  { value: "AREA", label: "Area" },
  { value: "SHELF", label: "Shelf" },
  { value: "CABINET", label: "Cabinet" },
  { value: "BIN", label: "Bin" },
  { value: "WORKBENCH", label: "Workbench" },
  { value: "PEGBOARD", label: "Pegboard" },
  { value: "STORAGE_UNIT", label: "Storage Unit" },
  { value: "VEHICLE", label: "Vehicle" },
  { value: "OTHER", label: "Other" },
];

export const CUSTOM_FIELD_TYPES: Option[] = [
  { value: "TEXT", label: "Text" },
  { value: "NUMBER", label: "Number" },
  { value: "DATE", label: "Date" },
  { value: "BOOLEAN", label: "Yes / No" },
  { value: "SELECT", label: "Dropdown" },
];

export const USER_ROLES: Option[] = [
  { value: "OWNER", label: "Owner" },
  { value: "ADMIN", label: "Admin" },
  { value: "MEMBER", label: "Member" },
];

export const PLANS = {
  FREE: { label: "Free", itemLimit: 200 },
  PRO: { label: "Pro", itemLimit: 0 }, // 0 = unlimited
} as const;

export function labelFor(options: Option[], value: string | null | undefined): string {
  if (!value) return "—";
  return options.find((o) => o.value === value)?.label ?? value;
}

// Badge tint classes per status value (Tailwind).
export const DECISION_COLORS: Record<string, string> = {
  UNDECIDED: "bg-gray-100 text-gray-700",
  KEEP: "bg-emerald-100 text-emerald-800",
  SELL: "bg-blue-100 text-blue-800",
  DONATE: "bg-purple-100 text-purple-800",
  TRASH: "bg-red-100 text-red-800",
};

export const SELLING_STATUS_COLORS: Record<string, string> = {
  NOT_LISTED: "bg-gray-100 text-gray-600",
  READY_FOR_PHOTOS: "bg-amber-100 text-amber-800",
  PHOTOGRAPHED: "bg-cyan-100 text-cyan-800",
  LISTED: "bg-blue-100 text-blue-800",
  OFFER_RECEIVED: "bg-violet-100 text-violet-800",
  PENDING_PICKUP: "bg-orange-100 text-orange-800",
  SOLD: "bg-emerald-100 text-emerald-800",
};

export const CONDITION_COLORS: Record<string, string> = {
  NEW: "bg-emerald-100 text-emerald-800",
  LIKE_NEW: "bg-teal-100 text-teal-800",
  GOOD: "bg-blue-100 text-blue-800",
  FAIR: "bg-amber-100 text-amber-800",
  POOR: "bg-orange-100 text-orange-800",
  PARTS_ONLY: "bg-red-100 text-red-800",
};

export const TEMPLATE_PLACEHOLDERS = [
  "{{name}}",
  "{{brand}}",
  "{{model}}",
  "{{condition}}",
  "{{price}}",
  "{{minPrice}}",
  "{{description}}",
  "{{category}}",
  "{{itemNumber}}",
];
