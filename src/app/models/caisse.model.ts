// models/caisse.model.ts
import { School } from './school.model';
import { User } from './user.model';

// Transaction types
export type CaisseTransactionType = 'verse_caisse' | 'transfert_banque' | 'ajustement';

// Payment status types
export interface CaisseRecettes {
  inscriptionFee: number;
  tuition: number;
  uniform: number;
  transportation: number;
  total: number;
}

export interface CaisseDepenses {
  salaries: number;
  charges: number;
  total: number;
}

// Daily record interface
export interface CaisseJournaliere {
  date: Date | string;
  recettes: CaisseRecettes;
  depenses: CaisseDepenses;
  soldeJournalier: number;
  soldeJournalierSansTransport: number;
}

// Transaction interface
export interface CaisseTransaction {
  _id: string;
  type: CaisseTransactionType;
  amount: number;
  date: Date | string;
  description?: string;
  reference?: string;
  recordedBy: User | string;
  balanceAfter: number;
}

// Main Caisse interface
export interface Caisse {
  _id: string;
  school: School | string;
  academicYear: string;
  transportStartDate: Date | string;
  totalTransport: number;
  soldeGeneral: number;
  totalAccumuleJournaliers: number;
  journaliers: CaisseJournaliere[];
  transactions: CaisseTransaction[];
  initialized: boolean;
  initializationDate?: Date | string;
  lastUpdated: Date | string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

// Dashboard response interfaces
export interface CaisseDashboardData {
  caisseJournaliere: CaisseJournaliere;
  caisseTransport: {
    startDate: Date | string;
    totalTransport: number;
  };
  caisseGenerale: {
    totalAccumuleJournaliers: number;
    totalTransport: number;
    soldeGeneral: number;
  };
  recentTransactions: CaisseTransaction[];
  lastUpdated: Date | string;
}

// Request interfaces
export interface InitializeCaisseRequest {
  academicYear: string;
}

export interface VerseCaisseRequest {
  amount: number;
  description?: string;
  reference?: string;
}

export interface TransfertBanqueRequest {
  amount: number;
  description?: string;
  reference?: string;
}

// Response interfaces
export interface InitializeCaisseResponse {
  success: boolean;
  message: string;
  data: Caisse;
}

export interface CaisseDashboardResponse {
  success: boolean;
  data: CaisseDashboardData;
}

export interface TransactionResponse {
  success: boolean;
  message: string;
  data: {
    transaction: CaisseTransaction;
    newBalance: number;
  };
}

export interface TransactionHistoryResponse {
  success: boolean;
  data: {
    transactions: CaisseTransaction[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  };
}

export interface DailyHistoryResponse {
  success: boolean;
  data: {
    dailyRecords: CaisseJournaliere[];
    totals: {
      recettes: number;
      depenses: number;
      solde: number;
    };
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  };
}

export interface UpdateCaisseResponse {
  success: boolean;
  message: string;
  data: Caisse;
}

// Filter interfaces
export interface TransactionHistoryFilters {
  startDate?: string;
  endDate?: string;
  type?: CaisseTransactionType;
  page?: number;
  limit?: number;
}

export interface DailyHistoryFilters {
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface DashboardFilters {
  date?: string; // Format: YYYY-MM-DD
}