// models/ouvrier-financial.model.ts
import { User } from './user.model';
import { School } from './school.model';

export interface OuvrierFinancialInfo {
  _id: string;
  ouvrier: User | string;
  position: 'sécurité' | 'chef' | 'nettoyeur' | 'cuisinier' | 'surveillant' | 'maintenance' | 'autre';
  contractType: 'monthly' | 'hourly';
  monthlySalary?: number;
  hourlyRate?: number;
  contractualHoursPerMonth?: number;
  startDate: Date | string;
  isActive: boolean;
  school: School | string;
  createdBy: User | string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface OuvrierPaymentDossier {
  _id: string;
  ouvrier: User | string;
  ouvrierFinancialInfo: OuvrierFinancialInfo | string;
  month: number;
  year: number;
  academicYear: string; // Format: "2024-2025"
  hoursWorked?: number;
  calculatedAmount: number;
  finalAmount: number;
  status: 'unpaid' | 'paid' | 'partial';
  paymentDate?: Date | string;
  notes?: string;
  school: School | string;
  createdBy: User | string;
  updatedBy?: User | string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// Request interfaces
export interface CreateOuvrierFinancialRequest {
  ouvrierId: string;
  position: 'sécurité' | 'chef' | 'nettoyeur' | 'cuisinier' | 'surveillant' | 'maintenance' | 'autre';
  contractType: 'monthly' | 'hourly';
  monthlySalary?: number;
  hourlyRate?: number;
  contractualHoursPerMonth?: number;
  startDate: string;
}

export interface UpdateOuvrierFinancialRequest {
  position?: 'sécurité' | 'chef' | 'nettoyeur' | 'cuisinier' | 'surveillant' | 'maintenance' | 'autre';
  contractType?: 'monthly' | 'hourly';
  monthlySalary?: number;
  hourlyRate?: number;
  contractualHoursPerMonth?: number;
  isActive?: boolean;
}

export interface UpdatePaymentDossierRequest {
  hoursWorked?: number;
  finalAmount?: number;
  status?: 'unpaid' | 'paid' | 'partial';
  paymentDate?: string;
  notes?: string;
}

export interface BulkUpdatePaymentDossiersRequest {
  dossierIds: string[];
  updates: {
    status?: 'unpaid' | 'paid' | 'partial';
    paymentDate?: string;
    notes?: string;
  };
}

// Response interfaces
export interface CreateOuvrierFinancialResponse {
  message: string;
  ouvrierFinancialInfo: OuvrierFinancialInfo;
  dossiersCreated: number;
}

export interface GetOuvriersFinancialResponse {
  ouvriersFinancial: any[]; // Aggregated data from backend
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    limit: number;
  };
}

export interface GetOuvrierFinancialResponse {
  ouvrierFinancialInfo: OuvrierFinancialInfo;
}

export interface UpdateOuvrierFinancialResponse {
  message: string;
  ouvrierFinancialInfo: OuvrierFinancialInfo;
}

export interface DeleteOuvrierFinancialResponse {
  message: string;
  dossiersDeleted: number;
}

export interface GetPaymentDossiersResponse {
  paymentDossiers: any[]; // Aggregated data from backend
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    limit: number;
  };
}

export interface GetOuvrierPaymentDossiersResponse {
  paymentDossiers: OuvrierPaymentDossier[];
}

export interface GetPaymentDossierResponse {
  paymentDossier: OuvrierPaymentDossier;
}

export interface UpdatePaymentDossierResponse {
  message: string;
  paymentDossier: OuvrierPaymentDossier;
}

export interface BulkUpdatePaymentDossiersResponse {
  message: string;
  modifiedCount: number;
}

export interface PaymentStatistics {
  totalDossiers: number;
  totalAmount: number;
  paidAmount: number;
  unpaidAmount: number;
  partialAmount: number;
  paidCount: number;
  unpaidCount: number;
  partialCount: number;
}

export interface GetPaymentStatisticsResponse {
  statistics: PaymentStatistics;
}

// Filter interfaces
export interface OuvrierFinancialFilters {
  page?: number;
  limit?: number;
  position?: 'sécurité' | 'chef' | 'nettoyeur' | 'cuisinier' | 'surveillant' | 'maintenance' | 'autre';
  contractType?: 'monthly' | 'hourly';
  isActive?: boolean;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaymentDossierFilters {
  page?: number;
  limit?: number;
  ouvrierId?: string;
  position?: 'sécurité' | 'chef' | 'nettoyeur' | 'cuisinier' | 'surveillant' | 'maintenance' | 'autre';
  month?: number;
  year?: number;
  academicYear?: string;
  status?: 'unpaid' | 'paid' | 'partial';
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaymentStatisticsFilters {
  academicYear?: string;
  position?: 'sécurité' | 'chef' | 'nettoyeur' | 'cuisinier' | 'surveillant' | 'maintenance' | 'autre';
  month?: number;
  year?: number;
}

// Utility interfaces for frontend display
export interface OuvrierFinancialDisplay {
  _id: string;
  ouvrierInfo: {
    _id: string;
    name: string;
    email: string;
  };
  position: 'sécurité' | 'chef' | 'nettoyeur' | 'cuisinier' | 'surveillant' | 'maintenance' | 'autre';
  contractType: 'monthly' | 'hourly';
  monthlySalary?: number;
  hourlyRate?: number;
  contractualHoursPerMonth?: number;
  startDate: Date | string;
  isActive: boolean;
  createdAt: Date | string;
}

export interface PaymentDossierDisplay {
  _id: string;
  ouvrierInfo: {
    _id: string;
    name: string;
    email: string;
  };
  financialInfo: {
    position: 'sécurité' | 'chef' | 'nettoyeur' | 'cuisinier' | 'surveillant' | 'maintenance' | 'autre';
    contractType: 'monthly' | 'hourly';
    monthlySalary?: number;
    hourlyRate?: number;
  };
  month: number;
  year: number;
  academicYear: string;
  hoursWorked?: number;
  calculatedAmount: number;
  finalAmount: number;
  status: 'unpaid' | 'paid' | 'partial';
  paymentDate?: Date | string;
  notes?: string;
  monthName?: string; // Calculated in frontend
}

// Position utility type and constants
export type OuvrierPosition = 'sécurité' | 'chef' | 'nettoyeur' | 'cuisinier' | 'surveillant' | 'maintenance' | 'autre';

export const OUVRIER_POSITIONS: { value: OuvrierPosition; label: string }[] = [
  { value: 'sécurité', label: 'Sécurité' },
  { value: 'chef', label: 'Chef' },
  { value: 'nettoyeur', label: 'Nettoyeur' },
  { value: 'cuisinier', label: 'Cuisinier' },
  { value: 'surveillant', label: 'Surveillant' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'autre', label: 'Autre' }
];