export type BountyStatus = "pending" | "active" | "completed" | "removed" | "closed";
export type BountyTopCategory = "Cards" | "Collectibles";

export interface BountyContact {
  name?: string;
  email?: string;
  phone?: string;
}

export interface CreateBountyInput {
  partner_user_ref: string;
  title: string;
  card_name: string;
  card_maker: string;
  year: number;
  bounty_amount: number;
  finders_fee?: number;
  description: string;
  graded?: boolean;
  grade?: string;
  images?: string[];
  top_category?: BountyTopCategory;
  category?: string;
  sub_category?: string;
  contact?: BountyContact;
}

export interface PartnerBounty {
  partner_user_ref: string;
  title: string;
  card_name: string;
  card_maker: string;
  year: number;
  graded: boolean;
  grade: string | null;
  bounty_amount: number;
  finders_fee: number | null;
  description: string;
  images: string[];
  top_category: BountyTopCategory;
  category: string | null;
  sub_category: string | null;
  status: BountyStatus;
  partner_name: string;
  created_at: string;
}

export interface ListBountiesParams {
  status?: BountyStatus;
  partner_user_ref?: string;
  limit?: number;
  offset?: number;
}

export interface ListBountiesResponse {
  bounties: PartnerBounty[];
  total: number;
  limit: number;
  offset: number;
}

export interface BountyResponse {
  bounty: PartnerBounty;
}

export interface YabeClientOptions {
  apiKey: string;
  baseUrl?: string;
  fetch?: typeof globalThis.fetch;
}