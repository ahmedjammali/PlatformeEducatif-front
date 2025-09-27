// models/charge.model.ts
import { User } from './user.model';
import { School } from './school.model';

export interface Charge {
  _id: string;
  title: string;
  description?: string;
  category: ChargeCategory;
  subCategory?: string;
  amount: number;
  currency: Currency;
  purchaseDate: Date;
  supplier?: Supplier;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  priority: Priority;
  isRecurring: boolean;
  recurringSettings?: RecurringSettings;
  attachments?: Attachment[];
  budgetCategory?: string;
  approvalRequired: boolean;
  approvedBy?: User | string;
  approvedAt?: Date;
  taxInfo?: TaxInfo;
  school: School | string;
  createdBy: User | string;
  updatedBy?: User | string;
  notes?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Supplier {
  name?: string;
  contact?: string;
  address?: string;
  taxId?: string;
}

export interface RecurringSettings {
  frequency: RecurringFrequency;
  nextDueDate: Date;
  endDate?: Date;
  isActive: boolean;
}

export interface Attachment {
  fileName: string;
  fileUrl: string;
  fileType: string;
  uploadedAt: Date;
}

export interface TaxInfo {
  taxRate: number;
  taxAmount: number;
  totalWithTax: number;
}

// Enums and Types
export type ChargeCategory = 
  | 'utilities' 
  | 'equipment' 
  | 'maintenance' 
  | 'transportation' 
  | 'supplies' 
  | 'services' 
  | 'technology' 
  | 'infrastructure' 
  | 'events' 
  | 'emergency' 
  | 'other';

export type Currency = 'TND' | 'USD' | 'EUR';

export type PaymentMethod = 
  | 'cash' 
  | 'check' 
  | 'bank_transfer' 
  | 'credit_card' 
  | 'installments';

export type PaymentStatus = 
  | 'pending' 
  | 'paid' 
  | 'partially_paid' 
  | 'overdue' 
  | 'cancelled';

export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export type RecurringFrequency = 'monthly' | 'quarterly' | 'annually';

// Request/Response interfaces
export interface CreateChargeRequest {
  title: string;
  description?: string;
  category: ChargeCategory;
  subCategory?: string;
  amount: number;
  currency?: Currency;
  purchaseDate?: Date;
  supplier?: Supplier;
  paymentMethod: PaymentMethod;
  paymentStatus?: PaymentStatus;
  priority?: Priority;
  isRecurring?: boolean;
  recurringSettings?: Omit<RecurringSettings, 'isActive'>;
  budgetCategory?: string;
  approvalRequired?: boolean;
  taxInfo?: Omit<TaxInfo, 'taxAmount' | 'totalWithTax'>;
  notes?: string;
  tags?: string[];
}

export interface UpdateChargeRequest extends Partial<CreateChargeRequest> {
  approvedBy?: string;
  approvedAt?: Date;
}

export interface ChargeFilters {
  page?: number;
  limit?: number;
  category?: ChargeCategory;
  paymentStatus?: PaymentStatus;
  priority?: Priority;
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
  supplier?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface AdvancedSearchFilters {
  query?: string;
  categories?: ChargeCategory[];
  paymentStatuses?: PaymentStatus[];
  priorities?: Priority[];
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
  suppliers?: string[];
  isRecurring?: boolean;
  page?: number;
  limit?: number;
}

export interface BulkUpdateRequest {
  chargeIds: string[];
  updateData: Partial<UpdateChargeRequest>;
}

// Response interfaces
export interface CreateChargeResponse {
  message: string;
  charge: Charge;
}

export interface GetChargeResponse {
  charge: Charge;
}

export interface GetChargesResponse {
  charges: Charge[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCharges: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  statistics: {
    totalAmount: number;
    averageAmount: number;
    totalCharges: number;
    pendingAmount: number;
    paidAmount: number;
  };
}

export interface UpdateChargeResponse {
  message: string;
  charge: Charge;
}

export interface DeleteChargeResponse {
  message: string;
}

export interface BulkUpdateResponse {
  message: string;
  modifiedCount: number;
}

export interface BulkApproveResponse {
  message: string;
  approvedCount: number;
}

// Analytics interfaces
export interface ChargeAnalytics {
  monthlyStats: MonthlyStats[];
  categoryStats: CategoryStats[];
  paymentStatusStats: PaymentStatusStats[];
  recentCharges: Charge[];
  upcomingRecurring: Charge[];
}

export interface MonthlyStats {
  _id: { month: number };
  totalAmount: number;
  totalCharges: number;
  avgAmount: number;
}

export interface CategoryStats {
  _id: ChargeCategory;
  totalAmount: number;
  totalCharges: number;
  avgAmount: number;
}

export interface PaymentStatusStats {
  _id: PaymentStatus;
  totalAmount: number;
  totalCharges: number;
}

// Dashboard interfaces
export interface DashboardStats {
  overview: {
    totalCharges: number;
    totalAmount: number;
    averageAmount: number;
    pendingCount: number;
    paidCount: number;
    overdueCount: number;
    highPriorityCount: number;
    recurringCount: number;
  };
  categoryBreakdown: CategoryStats[];
  period: string;
  generatedAt: Date;
}

export interface DateRangeSummary {
  summary: {
    totalCharges: number;
    totalAmount: number;
    averageAmount: number;
    maxAmount: number;
    minAmount: number;
    pendingCharges: number;
    paidCharges: number;
    overdueCharges: number;
    pendingAmount: number;
    paidAmount: number;
  };
  categoryBreakdown: CategoryStats[];
  dateRange: {
    startDate: string;
    endDate: string;
  };
}

// Supplier interfaces
export interface TopSupplier {
  _id: string;
  totalSpent: number;
  orderCount: number;
  averageOrder: number;
  lastOrder: Date;
  supplierInfo: Supplier;
}

export interface TopSuppliersResponse {
  topSuppliers: TopSupplier[];
  timeframe: string;
  totalSuppliers: number;
}

// Upcoming payments interfaces
export interface UpcomingPayments {
  upcomingRecurring: Charge[];
  overdueCharges: Charge[];
  totalUpcoming: number;
  totalOverdue: number;
}

// Template interfaces
export interface ChargeTemplate {
  name: string;
  category: ChargeCategory;
  subCategory?: string;
  isRecurring?: boolean;
  recurringSettings?: Partial<RecurringSettings>;
  priority?: Priority;
  paymentMethod?: PaymentMethod;
  description?: string;
}

export interface ChargeTemplatesResponse {
  message: string;
  templates: ChargeTemplate[];
}

export interface CreateFromTemplateRequest {
  templateName: string;
  customFields: Partial<CreateChargeRequest>;
}

// Advanced search response
export interface AdvancedSearchResponse {
  charges: Charge[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCharges: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  filters: AdvancedSearchFilters;
}

// Utility interfaces
export interface SubcategoriesResponse {
  subcategories: string[];
}

// Constants for dropdown options
export const CHARGE_CATEGORIES: { value: ChargeCategory; label: string; icon: string }[] = [
  { value: 'utilities', label: 'Utilities', icon: '⚡' },
  { value: 'equipment', label: 'Equipment', icon: '🖥️' },
  { value: 'maintenance', label: 'Maintenance', icon: '🔧' },
  { value: 'transportation', label: 'Transportation', icon: '🚐' },
  { value: 'supplies', label: 'Supplies', icon: '📚' },
  { value: 'services', label: 'Services', icon: '🏢' },
  { value: 'technology', label: 'Technology', icon: '💻' },
  { value: 'infrastructure', label: 'Infrastructure', icon: '🏗️' },
  { value: 'events', label: 'Events', icon: '🎉' },
  { value: 'emergency', label: 'Emergency', icon: '🚨' },
  { value: 'other', label: 'Other', icon: '📄' }
];

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'check', label: 'Check' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'installments', label: 'Installments' }
];

export const PAYMENT_STATUSES: { value: PaymentStatus; label: string; color: string }[] = [
  { value: 'pending', label: 'Pending', color: 'orange' },
  { value: 'paid', label: 'Paid', color: 'green' },
  { value: 'partially_paid', label: 'Partially Paid', color: 'blue' },
  { value: 'overdue', label: 'Overdue', color: 'red' },
  { value: 'cancelled', label: 'Cancelled', color: 'gray' }
];

export const PRIORITIES: { value: Priority; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: 'green' },
  { value: 'medium', label: 'Medium', color: 'yellow' },
  { value: 'high', label: 'High', color: 'orange' },
  { value: 'urgent', label: 'Urgent', color: 'red' }
];

export const RECURRING_FREQUENCIES: { value: RecurringFrequency; label: string }[] = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annually', label: 'Annually' }
];

export const CURRENCIES: { value: Currency; label: string; symbol: string }[] = [
  { value: 'TND', label: 'Tunisian Dinar', symbol: 'د.ت' },
  { value: 'USD', label: 'US Dollar', symbol: '$' },
  { value: 'EUR', label: 'Euro', symbol: '€' }
];