// models/teacher-financial.model.ts
import { User } from './user.model';
import { School } from './school.model';

export interface TeacherFinancialInfo {
  _id: string;
  teacher: User | string;
  contractType: 'monthly' | 'hourly';
  monthlySalary?: number;
  hourlyRate?: number;
  contractualHoursPerMonth?: number;
  startDate: Date | string;
  endDate: Date | string;
  contractMonths: number[]; // Array of months (1-12) that this contract covers
  isActive: boolean;
  school: School | string;
  createdBy: User | string;
  createdAt: Date | string;
  updatedAt: Date | string;
  // Additional computed properties from backend
  contractDuration?: number;
  monthNames?: string[];
}

export interface TeacherPaymentDossier {
  _id: string;
  teacher: User | string;
  teacherFinancialInfo: TeacherFinancialInfo | string;
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

// Month selection helpers
export interface MonthOption {
  value: number;
  label: string;
  short: string;
}

export const MONTH_OPTIONS: MonthOption[] = [
  { value: 1, label: 'January', short: 'Jan' },
  { value: 2, label: 'February', short: 'Feb' },
  { value: 3, label: 'March', short: 'Mar' },
  { value: 4, label: 'April', short: 'Apr' },
  { value: 5, label: 'May', short: 'May' },
  { value: 6, label: 'June', short: 'Jun' },
  { value: 7, label: 'July', short: 'Jul' },
  { value: 8, label: 'August', short: 'Aug' },
  { value: 9, label: 'September', short: 'Sep' },
  { value: 10, label: 'October', short: 'Oct' },
  { value: 11, label: 'November', short: 'Nov' },
  { value: 12, label: 'December', short: 'Dec' }
];

export const ACADEMIC_YEAR_MONTHS: MonthOption[] = [
  { value: 9, label: 'September', short: 'Sep' },
  { value: 10, label: 'October', short: 'Oct' },
  { value: 11, label: 'November', short: 'Nov' },
  { value: 12, label: 'December', short: 'Dec' },
  { value: 1, label: 'January', short: 'Jan' },
  { value: 2, label: 'February', short: 'Feb' },
  { value: 3, label: 'March', short: 'Mar' },
  { value: 4, label: 'April', short: 'Apr' },
  { value: 5, label: 'May', short: 'May' },
  { value: 6, label: 'June', short: 'Jun' },
  { value: 7, label: 'July', short: 'Jul' },
  { value: 8, label: 'August', short: 'Aug' }
];

// Contract period presets
export interface ContractPreset {
  name: string;
  description: string;
  months: number[];
}

export const CONTRACT_PRESETS: ContractPreset[] = [
  {
    name: 'Full Academic Year',
    description: 'September to August (12 months)',
    months: [9, 10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8]
  },
  {
    name: 'School Year Only',
    description: 'September to June (10 months)',
    months: [9, 10, 11, 12, 1, 2, 3, 4, 5, 6]
  },
  {
    name: 'First Semester',
    description: 'September to January (5 months)',
    months: [9, 10, 11, 12, 1]
  },
  {
    name: 'Second Semester',
    description: 'February to June (5 months)',
    months: [2, 3, 4, 5, 6]
  },
  {
    name: 'Summer Session',
    description: 'July to August (2 months)',
    months: [7, 8]
  }
];

// Request interfaces
export interface CreateTeacherFinancialRequest {
  teacherId: string;
  contractType: 'monthly' | 'hourly';
  monthlySalary?: number;
  hourlyRate?: number;
  contractualHoursPerMonth?: number;
  startDate: string;
  endDate: string;
  contractMonths: number[];
}

export interface UpdateTeacherFinancialRequest {
  contractType?: 'monthly' | 'hourly';
  monthlySalary?: number;
  hourlyRate?: number;
  contractualHoursPerMonth?: number;
  endDate?: string;
  contractMonths?: number[];
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
export interface CreateTeacherFinancialResponse {
  message: string;
  teacherFinancialInfo: TeacherFinancialInfo;
  dossiersCreated: number;
  contractDuration: string;
}

export interface GetTeachersFinancialResponse {
  teachersFinancial: any[]; // Aggregated data from backend
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    limit: number;
  };
}

export interface GetTeacherFinancialResponse {
  teacherFinancialInfo: TeacherFinancialInfo;
}

export interface UpdateTeacherFinancialResponse {
  message: string;
  teacherFinancialInfo: TeacherFinancialInfo;
}

export interface DeleteTeacherFinancialResponse {
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

export interface GetTeacherPaymentDossiersResponse {
  paymentDossiers: TeacherPaymentDossier[];
}

export interface GetPaymentDossierResponse {
  paymentDossier: TeacherPaymentDossier;
}

export interface UpdatePaymentDossierResponse {
  message: string;
  paymentDossier: TeacherPaymentDossier;
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
export interface TeacherFinancialFilters {
  page?: number;
  limit?: number;
  contractType?: 'monthly' | 'hourly';
  isActive?: boolean;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaymentDossierFilters {
  page?: number;
  limit?: number;
  teacherId?: string;
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
  month?: number;
  year?: number;
}

// Utility interfaces for frontend display
export interface TeacherFinancialDisplay {
  _id: string;
  teacherInfo: {
    _id: string;
    name: string;
    email: string;
  };
  contractType: 'monthly' | 'hourly';
  monthlySalary?: number;
  hourlyRate?: number;
  contractualHoursPerMonth?: number;
  startDate: Date | string;
  endDate: Date | string;
  contractMonths: number[];
  contractDuration: number;
  monthNames: string[];
  isActive: boolean;
  createdAt: Date | string;
}

export interface PaymentDossierDisplay {
  _id: string;
  teacherInfo: {
    _id: string;
    name: string;
    email: string;
  };
  financialInfo: {
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

// Form validation interfaces
export interface ContractFormData {
  teacherId: string;
  contractType: 'monthly' | 'hourly';
  monthlySalary?: number;
  hourlyRate?: number;
  contractualHoursPerMonth?: number;
  startDate: string;
  endDate: string;
  contractMonths: number[];
}

export interface ContractValidationErrors {
  teacherId?: string;
  contractType?: string;
  monthlySalary?: string;
  hourlyRate?: string;
  contractualHoursPerMonth?: string;
  startDate?: string;
  endDate?: string;
  contractMonths?: string;
  dateRange?: string;
}