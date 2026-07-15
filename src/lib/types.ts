// Plain-JSON shapes passed from server components to client components.

export type ItemRow = {
  id: string;
  itemNumber: number;
  name: string;
  brand: string | null;
  quantity: number;
  categoryName: string | null;
  locationName: string | null;
  decision: string;
  sellingStatus: string;
  condition: string | null;
  estimatedValue: number | null;
  salePrice: number | null;
  favorite: boolean;
  photoUrl: string | null;
  createdAt: string;
  deletedAt: string | null;
};

export type SelectOption = { id: string; label: string; depth?: number };
