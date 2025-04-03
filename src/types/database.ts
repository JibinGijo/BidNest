export type Profile = {
  id: string;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  address: string | null;
  phone: string | null;
  dob: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export type Listing = {
  id: string;
  title: string;
  description: string | null;
  starting_price: number;
  current_bid: number | null;
  image_url: string | null;
  seller_id: string;
  winner_id: string | null;
  status: 'active' | 'ended';
  created_at: string;
  updated_at: string;
  seller?: {
    username: string | null;
  };
}

export type Bid = {
  id: string;
  listing_id: string;
  bidder_id: string;
  amount: number;
  created_at: string;
}