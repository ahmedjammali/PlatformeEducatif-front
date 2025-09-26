export interface Charge {
  _id?: string;
  categorie: string;
  description: string;
  date: Date;
  montant: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ChargeResponse {
  charge: Charge;
  message: string;
}

export interface ChargesListResponse {
  charges: Charge[];
  pagination: {
    currentPage: number;
    totalPages: number;
    total: number;
    limit: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ChargeSummary {
  totalCharges: number;
  totalAmount: number;
  monthlyTotal: number;
}
