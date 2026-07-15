export interface EcoActivity {
  id: string;
  type: "recycling" | "cleanup" | "payment" | "spend" | "refill";
  region: string;
  date: string;
  description: string;
  coinEarned: number;
  quantityDetails: string;
  status: "verified" | "pending";
  userEmail?: string;
}

export interface StockHolding {
  symbol: string;
  name: string;
  quantity: number;
  avgBuyPrice: number;
  currency: "USD" | "THB";
}

export interface UserProfile {
  email: string;
  name: string;
  role: "volunteer" | "fisherman" | "business" | "tourist" | "admin";
  regionId: string;
  avatarUrl: string;
  usdBalance?: number;
  thbBalance?: number;
  jpyBalance?: number;
  gbpBalance?: number;
  eurBalance?: number;
  portfolio?: { [symbol: string]: StockHolding };
  sessionVersion?: number;
}

export interface DbUser extends UserProfile {
  password?: string;
  balance: number;
}

export interface RewardItem {
  id: string;
  title: string;
  cost: number;
  category: "travel" | "product" | "merchandise" | "voucher" | "fiat_cash" | "souvenir";
  description: string;
  image: string;
  stock: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "model";
  text: string;
  timestamp: string;
}

export interface CoinTransfer {
  id: string;
  senderEmail: string;
  recipientEmail: string;
  amount: number;
  currency: "AND" | "USD" | "THB" | "JPY" | "GBP" | "EUR";
  description: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

export interface RegionDetail {
  id: string;
  name: string;
  country: string;
  localProvinces: string;
  description: string;
  stats: {
    cleanups: number;
    plasticKg: number;
    members: number;
  };
  activeProjects: string[];
}
