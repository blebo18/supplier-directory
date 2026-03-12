export interface Supplier {
  id: number;
  company: string;
  website: string | null;
  phone: string | null;
  fax: string | null;
  street: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  employees: number | null;
  squareFeet: string | null;
  description: string | null;
  archived?: boolean;
  featured?: boolean;
  categories: string[];
  images?: SupplierImage[];
  videos?: SupplierVideo[];
  documents?: SupplierDocument[];
  links?: SupplierLink[];
}

export interface SupplierImage {
  id: number;
  url: string;
  altText: string | null;
  sortOrder: number;
}

export interface SupplierVideo {
  id: number;
  url: string;
  title: string | null;
}

export interface SupplierDocument {
  id: number;
  filename: string;
  title: string | null;
  fileSize: number;
}

export interface SupplierLink {
  id: number;
  title: string;
  url: string;
  sortOrder: number;
}

export type AdPlacement = "GRID" | "SIDEBAR" | "LEADERBOARD";

export interface Ad {
  id: number;
  name: string;
  imageUrl: string;
  destinationUrl: string;
  placement: AdPlacement;
  weight: number;
  active: boolean;
  startDate: string;
  endDate: string;
}

export interface AdWithStats extends Ad {
  impressions: number;
  clicks: number;
  ctr: number;
}

export interface SearchResult {
  items: Supplier[];
  total: number;
  page: number;
  totalPages: number;
  categories: string[];
}
