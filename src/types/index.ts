export interface User {
  id: string;
  email: string;
  name: string;
  isAdmin: boolean;
}

export interface Product {
  id: string;
  title: string;
  description: string;
  currentBid: number;
  startingPrice: number;
  imageUrl: string;
  endTime: Date;
  sellerId: string;
  status: 'active' | 'ended' | 'draft';
}

export interface Bid {
  id: string;
  productId: string;
  userId: string;
  amount: number;
  timestamp: Date;
}