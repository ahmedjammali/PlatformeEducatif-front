// models/payment.model.ts
import { User } from './user.model';
import { School } from './school.model';

export interface PaymentConfiguration {
  _id?: string;
  school: School | string;
  academicYear: string;
  paymentAmounts: {
    école: number;      // Updated from 'college'
    college: number;    // Updated from 'moyenne'
    lycée: number;      // Updated from 'lycee'
  };
  paymentSchedule: {
    startMonth: number;
    endMonth: number;
    totalMonths: number;
  };
  gracePeriod: number;
  annualPaymentDiscount?: {
    enabled: boolean;
    percentage: number;
    amount: number;
  };
  isActive: boolean;
  createdBy: User | string;
  updatedBy?: User | string;
  createdAt?: Date;
  updatedAt?: Date;
  calculatedTotalMonths?: number; // Virtual field
}

export interface MonthlyPayment {
  month: number;
  monthName: string;
  dueDate: Date | string;
  amount: number;
  status: 'pending' | 'paid' | 'overdue' | 'partial';
  paidAmount: number;
  paymentDate?: Date | string;
  paymentMethod?: 'cash' | 'check' | 'bank_transfer' | 'online';
  receiptNumber?: string;
  notes?: string;
  recordedBy?: User | string;
}

export interface AnnualPayment {
  isPaid: boolean;
  paymentDate?: Date | string;
  paymentMethod?: 'cash' | 'check' | 'bank_transfer' | 'online';
  receiptNumber?: string;
  discount?: number;
  notes?: string;
  recordedBy?: User | string;
}

export interface StudentPayment {
  _id?: string;
  student: User | string;
  school: School | string;
  academicYear: string;
  classGroup: 'école' | 'college' | 'lycée';  // Updated class group values
  studentClass: string;  // Now stores grade instead of class name
  paymentType: 'monthly' | 'annual';
  monthlyPayments: MonthlyPayment[];
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  annualPayment?: AnnualPayment;
  overallStatus: 'pending' | 'partial' | 'completed' | 'overdue';
  createdBy: User | string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface StudentWithPayment {
  _id: string;
  name: string;
  email: string;
  studentClass: {
    _id: string;
    name: string;
    grade: string;  // Added grade field
  } | null;
  classGroup: 'école' | 'college' | 'lycée' | null;  // Updated class group values
  paymentRecord: StudentPayment | null;
  hasPaymentRecord: boolean;
}

export interface PaymentDashboard {
  overview: {
    totalStudents: number;
    studentsWithPayments: number;
    studentsWithoutPayments: number;
    totalRevenue: number;
    expectedRevenue: number;
    outstandingAmount: number;
    collectionRate: string;
  };
  statusCounts: {
    pending: number;
    partial: number;
    completed: number;
    overdue: number;
    no_record: number;
  };
  classGroupStats: {
    école: {      // Updated from 'college'
      count: number;
      revenue: number;
    };
    college: {    // Updated from 'moyenne'
      count: number;
      revenue: number;
    };
    lycée: {      // Updated from 'lycee'
      count: number;
      revenue: number;
    };
  };
}
export interface PaymentFilters {
  search?: string;
  paymentStatus?: 'pending' | 'partial' | 'completed' | 'overdue' | 'no_record';
  classGroup?: 'école' | 'college' | 'lycée';
  classId?: string;  // ADD THIS LINE
  academicYear?: string;
  page?: number;
  limit?: number;
}

export interface RecordPaymentRequest {
  monthIndex?: number;
  amount?: number; // Made optional for annual payments
  paymentMethod: 'cash' | 'check' | 'bank_transfer' | 'online';
  paymentDate?: Date | string;
  notes?: string;
  receiptNumber?: string;
  discount?: number;
}

// Additional utility interfaces
export interface PaymentSummary {
  studentId: string;
  studentName: string;
  totalDue: number;
  totalPaid: number;
  remainingBalance: number;
  lastPaymentDate?: Date;
  nextDueDate?: Date;
  status: string;
  classGroup: 'école' | 'college' | 'lycée';  // Updated class group values
}

export interface PaymentHistoryItem {
  date: Date | string;
  amount: number;
  method: string;
  receiptNumber?: string;
  type: 'monthly' | 'annual';
  month?: string;
}

// New interfaces for additional APIs
export interface PaymentReport {
  reportType: 'summary' | 'detailed' | 'overdue' | 'collection';
  academicYear: string;
  classGroup: string;
  dateRange: {
    startDate?: string;
    endDate?: string;
  };
  report: {
    overview?: {
      totalStudents: number;
      totalExpected: number;
      totalCollected: number;
      totalOutstanding: number;
      collectionRate: string;
    };
    statusBreakdown?: {
      completed: number;
      partial: number;
      pending: number;
      overdue: number;
    };
    classGroupBreakdown?: {
      école: { count: number; collected: number; expected: number; };
      college: { count: number; collected: number; expected: number; };
      lycée: { count: number; collected: number; expected: number; };
    };
    payments?: Array<{
      student: any;
      classGroup: string;
      studentClass: string;
      totalAmount: number;
      paidAmount: number;
      remainingAmount: number;
      overallStatus: string;
      paymentType: string;
      lastPaymentDate?: string;
      createdBy?: any;
    }>;
    totalOverdue?: number;
    totalOverdueAmount?: number;
    dateRange?: { startDate: string; endDate: string; };
    totalCollected?: number;
    collectionsByMonth?: { [key: string]: number };
    collectionsByMethod?: { [key: string]: number };
    averageMonthlyCollection?: string;
  };
}

export interface MonthlyStats {
  academicYear: string;
  monthlyStats: Array<{
    month: number;
    monthName: string;
    expected: number;
    collected: number;
    pending: number;
    overdue: number;
    collectionRate: string;
  }>;
}

export interface ExportData {
  message: string;
  totalRecords: number;
  data: Array<{
    'Student Name': string;
    'Student Email': string;
    'Class Group': string;
    'Student Class': string;
    'Total Amount': number;
    'Paid Amount': number;
    'Remaining Amount': number;
    'Overall Status': string;
    'Payment Type': string;
    'Academic Year': string;
    'Created Date': string;
    'Created By': string;
  }>;
}

export interface BulkUpdateResult {
  message: string;
  results: {
    updated: number;
    skipped: number;
    errors: Array<{
      studentId: string;
      error: string;
    }>;
  };
  configurationUsed: {
    academicYear: string;
    paymentAmounts: {
      école: number;
      college: number;
      lycée: number;
    };
  };
}

export interface StudentPaymentDetails {
  student: {
    _id: string;
    name: string;
    email: string;
    studentClass: {
      _id: string;
      name: string;
      grade: string;
    };
    classGroup: 'école' | 'college' | 'lycée';
  };
  paymentRecord: StudentPayment;
}

// Utility types for form validation
export interface PaymentValidationErrors {
  amount?: string;
  paymentMethod?: string;
  receiptNumber?: string;
  paymentDate?: string;
  general?: string;
}

export interface PaymentConfigValidationErrors {
  école?: string;
  college?: string;
  lycée?: string;
  gracePeriod?: string;
  general?: string;
}

// Chart data interfaces for dashboard
export interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
    borderWidth?: number;
  }>;
}

export interface PaymentTrend {
  month: string;
  expected: number;
  collected: number;
  collectionRate: number;
}

// Filter options for UI components
export interface FilterOption {
  value: string;
  label: string;
  color?: string;
  icon?: string;
  description?: string;
}

export interface PaymentFilterOptions {
  classGroups: FilterOption[];
  paymentStatuses: FilterOption[];
  reportTypes: FilterOption[];
  paymentMethods: FilterOption[];
  academicYears: FilterOption[];
}

// Notification interfaces for payment alerts
export interface PaymentNotification {
  id: string;
  type: 'overdue' | 'due_soon' | 'payment_received' | 'config_updated';
  title: string;
  message: string;
  studentId?: string;
  studentName?: string;
  amount?: number;
  dueDate?: Date;
  createdAt: Date;
  read: boolean;
  priority: 'low' | 'medium' | 'high';
}

// Bulk operation progress tracking
export interface BulkOperationProgress {
  total: number;
  processed: number;
  successful: number;
  failed: number;
  errors: Array<{
    studentId: string;
    studentName: string;
    error: string;
  }>;
  isComplete: boolean;
  startTime: Date;
  endTime?: Date;
}

// Payment dialog data interface
export interface PaymentDialogData {
  student: StudentWithPayment;
  type: 'monthly' | 'annual';
  monthIndex?: number;
  academicYear: string;
}

// Payment method configuration
export interface PaymentMethodConfig {
  id: string;
  name: string;
  label: string;
  icon: string;
  enabled: boolean;
  requiresReceiptNumber: boolean;
  allowsPartialPayments: boolean;
}

// Academic year configuration
export interface AcademicYearConfig {
  year: string;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  paymentStartMonth: number;
  paymentEndMonth: number;
}

// Class grade mappings for different school levels
export interface ClassGradeMapping {
  école: string[];    // ['6eme', '5eme', '4eme', '3eme', '2nde', '1ere']
  college: string[];  // ['9eme', '8eme', '7eme']
  lycée: string[];    // ['4ᵉ année S', '3ᵉ année S', '2ᵉ année S', '1ʳᵉ année S']
}

// Financial summary for reports
export interface FinancialSummary {
  totalExpected: number;
  totalCollected: number;
  totalOutstanding: number;
  collectionRate: number;
  averagePaymentAmount: number;
  paymentsByMonth: { [month: string]: number };
  paymentsByMethod: { [method: string]: number };
  overdueAmount: number;
  discountsGiven: number;
}

// Student payment status history
export interface PaymentStatusHistory {
  studentId: string;
  academicYear: string;
  statusChanges: Array<{
    date: Date;
    fromStatus: string;
    toStatus: string;
    amount?: number;
    notes?: string;
    changedBy: string;
  }>;
}

// Configuration for payment reminders
export interface PaymentReminderConfig {
  enabled: boolean;
  daysBeforeDue: number[];
  reminderTypes: ('email' | 'sms' | 'notification')[];
  customMessage?: string;
  escalationRules: Array<{
    daysOverdue: number;
    action: string;
    recipients: string[];
  }>;
}