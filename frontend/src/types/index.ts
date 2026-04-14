export interface Raffle {
  id: string;
  name: string;
  description: string;
  mainImageUrl: string | null;
  themeColors: { primary: string; secondary: string; background: string };
  logoUrl: string | null;
  status: "DRAFT" | "ACTIVE" | "COMPLETED";
  totalNumbers: number;
  numberPrice: number;
  minPurchase: number;
  prizes: Prize[];
  soldCount: number;
}

export interface Prize {
  id: string;
  position: number;
  name: string;
  description: string;
  imageUrl: string | null;
  winnerNumber: number | null;
  drawnAt: string | null;
  predestinedNumber: number | null;
  predestinedBuyerName: string | null;
}

export interface RaffleNumber {
  numberValue: number;
  status: "AVAILABLE" | "RESERVED" | "SOLD";
  buyerId: string | null;
}

export interface NumbersPage {
  numbers: RaffleNumber[];
  total: number;
  page: number;
  limit: number;
}

export interface PurchaseResult {
  purchaseId: string;
  qrCode: string;
  qrCodeText: string;
  quantity: number;
  totalAmount: number;
}

export interface DashboardData {
  totalSold: number;
  totalRevenue: number;
  totalPurchases: number;
  recentPurchases: {
    id: string;
    buyerName: string;
    quantity: number;
    totalAmount: number;
    createdAt: string;
  }[];
}

export interface MasterDashboard extends DashboardData {
  split: {
    ours: { revenue: number; purchases: number };
    owner: { revenue: number; purchases: number };
  };
}
