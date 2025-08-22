// models/payment.model.ts
import { User } from './user.model';
import { School } from './school.model';

// ===== UPDATED GRADE STRUCTURE =====
export type GradeCategory = 'maternelle' | 'primaire' | 'secondaire';

export type Grade = 
  // Maternal
  | 'Maternal'
  // Primaire
  | '1ère année primaire' | '2ème année primaire' | '3ème année primaire' 
  | '4ème année primaire' | '5ème année primaire' | '6ème année primaire'
  // Secondaire (Collège + Lycée)
  | '7ème année' | '8ème année' | '9ème année'
  | '1ère année lycée' | '2ème année lycée' | '3ème année lycée' | '4ème année lycée';

// ===== UPDATED PAYMENT CONFIGURATION =====
export interface PaymentConfiguration {
  _id?: string;
  school: School | string;
  academicYear: string;
  
  // ✅ NEW: Individual grade pricing instead of class groups
  gradeAmounts: {
    // Maternal
    'Maternal': number;
    // Primaire
    '1ère année primaire': number;
    '2ème année primaire': number;
    '3ème année primaire': number;
    '4ème année primaire': number;
    '5ème année primaire': number;
    '6ème année primaire': number;
    // Secondaire
    '7ème année': number;
    '8ème année': number;
    '9ème année': number;
    '1ère année lycée': number;
    '2ème année lycée': number;
    '3ème année lycée': number;
    '4ème année lycée': number;
  };

  // ✅ NEW: Uniform configuration
  uniform: {
    enabled: boolean;
    price: number;
    description?: string;
    isOptional?: boolean;
  };

  // ✅ NEW: Transportation configuration
  transportation: {
    enabled: boolean;
    tariffs: {
      close: {
        enabled: boolean;
        monthlyPrice: number;
        description?: string;
      };
      far: {
        enabled: boolean;
        monthlyPrice: number;
        description?: string;
      };
    };
    isOptional?: boolean;
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
}

// ===== UPDATED MONTHLY PAYMENT INTERFACE =====
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

// ✅ NEW: Uniform payment interface
export interface UniformPayment {
  purchased: boolean;
  price: number;
  isPaid: boolean;
  paymentDate?: Date | string;
  paymentMethod?: 'cash' | 'check' | 'bank_transfer' | 'online';
  receiptNumber?: string;
  notes?: string;
  recordedBy?: User | string;
}

// ✅ NEW: Transportation payment interface
export interface TransportationPayment {
  using: boolean;
  type?: 'close' | 'far';
  monthlyPrice: number;
  totalAmount: number;
  monthlyPayments: MonthlyPayment[];
}

// ===== UPDATED ANNUAL PAYMENT INTERFACE =====
export interface AnnualTuitionPayment {
  isPaid: boolean;
  paymentDate?: Date | string;
  paymentMethod?: 'cash' | 'check' | 'bank_transfer' | 'online';
  receiptNumber?: string;
  discount?: number;
  notes?: string;
  recordedBy?: User | string;
}

// ===== UPDATED STUDENT PAYMENT INTERFACE =====
export interface StudentPayment {
  _id?: string;
  student: User | string;
  school: School | string;
  academicYear: string;
  
  // ✅ UPDATED: Individual grade instead of class group
  grade: Grade;
  gradeCategory: GradeCategory;
  studentClass: string;
  
  paymentType: 'monthly' | 'annual';
  
  // ✅ NEW: Tuition fees structure
  tuitionFees: {
    amount: number;
    monthlyAmount: number;
  };

  // ✅ NEW: Uniform payment details
  uniform: UniformPayment;

  // ✅ NEW: Transportation payment details
  transportation: TransportationPayment;

  // ✅ UPDATED: Renamed from monthlyPayments to tuitionMonthlyPayments
  tuitionMonthlyPayments: MonthlyPayment[];

  // ✅ NEW: Detailed amounts breakdown
  totalAmounts: {
    tuition: number;
    uniform: number;
    transportation: number;
    grandTotal: number;
  };

  paidAmounts: {
    tuition: number;
    uniform: number;
    transportation: number;
    grandTotal: number;
  };

  remainingAmounts: {
    tuition: number;
    uniform: number;
    transportation: number;
    grandTotal: number;
  };

  // ✅ UPDATED: Renamed from annualPayment to annualTuitionPayment
  annualTuitionPayment?: AnnualTuitionPayment;

  overallStatus: 'pending' | 'partial' | 'completed' | 'overdue';

  // ✅ NEW: Component-specific statuses
  componentStatus: {
    tuition: 'pending' | 'partial' | 'completed' | 'overdue';
    uniform: 'not_applicable' | 'pending' | 'completed';
    transportation: 'not_applicable' | 'pending' | 'partial' | 'completed' | 'overdue';
  };

  createdBy: User | string;
  createdAt?: Date;
  updatedAt?: Date;
}

// ===== UPDATED STUDENT WITH PAYMENT INTERFACE =====
export interface StudentWithPayment {
  _id: string;
  name: string;
  email: string;
  studentClass: {
    _id: string;
    name: string;
    grade: string;
  } | null;
  grade: Grade | null;
  gradeCategory: GradeCategory | null;
  paymentRecord: StudentPayment | null;
  hasPaymentRecord: boolean;
}

// ===== UPDATED PAYMENT DASHBOARD =====
export interface PaymentDashboard {
  overview: {
    totalStudents: number;
    studentsWithPayments: number;
    studentsWithoutPayments: number;
    totalRevenue: {
      tuition: number;
      uniform: number;
      transportation: number;
      grandTotal: number;
    };
    expectedRevenue: {
      tuition: number;
      uniform: number;
      transportation: number;
      grandTotal: number;
    };
    outstandingAmount: {
      tuition: number;
      uniform: number;
      transportation: number;
      grandTotal: number;
    };
    collectionRate: {
      tuition: string;
      uniform: string;
      transportation: string;
      overall: string;
    };
  };
  statusCounts: {
    pending: number;
    partial: number;
    completed: number;
    overdue: number;
    no_record: number;
  };
  gradeCategoryStats: {
    maternelle: {
      count: number;
      revenue: number;
    };
    primaire: {
      count: number;
      revenue: number;
    };
    secondaire: {
      count: number;
      revenue: number;
    };
  };
  // ✅ NEW: Component usage statistics
  componentStats: {
    uniform: {
      totalStudents: number;
      paidStudents: number;
      totalRevenue: number;
      expectedRevenue: number;
    };
    transportation: {
      totalStudents: number;
      closeZone: number;
      farZone: number;
      totalRevenue: number;
      expectedRevenue: number;
    };
  };
}

// ===== UPDATED PAYMENT FILTERS =====
export interface PaymentFilters {
  search?: string;
  paymentStatus?: 'pending' | 'partial' | 'completed' | 'overdue' | 'no_record';
  gradeCategory?: GradeCategory;
  grade?: Grade;
  classId?: string;
  academicYear?: string;
  page?: number;
  limit?: number;
}

// ===== UPDATED RECORD PAYMENT REQUEST =====
export interface RecordPaymentRequest {
  monthIndex?: number;
  amount?: number;
  paymentMethod: 'cash' | 'check' | 'bank_transfer' | 'online';
  paymentDate?: Date | string;
  notes?: string;
  receiptNumber?: string;
  discount?: number;
}

// ✅ NEW: Generate payment request interface
export interface GeneratePaymentRequest {
  academicYear?: string;
  hasUniform?: boolean;
  transportationType?: 'close' | 'far' | null;
}

// ✅ NEW: Bulk generate payment request
export interface BulkGeneratePaymentRequest {
  academicYear?: string;
  defaultUniform?: boolean;
  defaultTransportation?: 'close' | 'far' | null;
}

// ===== UPDATED PAYMENT REPORT INTERFACE =====
export interface PaymentReport {
  reportType: 'summary' | 'detailed' | 'overdue' | 'collection' | 'component';
  academicYear: string;
  gradeCategory: string;
  grade: string;
  component: 'all' | 'tuition' | 'uniform' | 'transportation';
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
    gradeCategoryBreakdown?: {
      maternelle: { count: number; collected: number; expected: number; };
      primaire: { count: number; collected: number; expected: number; };
      secondaire: { count: number; collected: number; expected: number; };
    };
    // ✅ NEW: Component breakdown for detailed analysis
    componentBreakdown?: {
      tuition: {
        totalStudents: number;
        totalExpected: number;
        totalCollected: number;
        statusCounts: {
          completed: number;
          partial: number;
          pending: number;
          overdue: number;
        };
      };
      uniform: {
        totalStudents: number;
        notUsingService: number;
        totalExpected: number;
        totalCollected: number;
        statusCounts: {
          completed: number;
          pending: number;
          not_applicable: number;
        };
      };
      transportation: {
        totalStudents: number;
        notUsingService: number;
        closeZone: number;
        farZone: number;
        totalExpected: number;
        totalCollected: number;
        statusCounts: {
          completed: number;
          partial: number;
          pending: number;
          overdue: number;
          not_applicable: number;
        };
      };
    };
    payments?: Array<any>;
    totalOverdue?: number;
    totalOverdueAmount?: number;
    dateRange?: { startDate: string; endDate: string; };
    totalCollected?: number;
    collectionsByMonth?: { [key: string]: number };
    collectionsByMethod?: { [key: string]: number };
    averageMonthlyCollection?: string;
  };
}

// ===== UPDATED MONTHLY STATS =====
export interface MonthlyStats {
  academicYear: string;
  component: string;
  monthlyStats: Array<{
    month: number;
    monthName: string;
    tuition: {
      expected: number;
      collected: number;
      pending: number;
      overdue: number;
      collectionRate: string;
    };
    transportation: {
      expected: number;
      collected: number;
      pending: number;
      overdue: number;
      collectionRate: string;
    };
    total: {
      expected: number;
      collected: number;
      pending: number;
      overdue: number;
      collectionRate: string;
    };
  }>;
}

// ===== UPDATED EXPORT DATA =====
export interface ExportData {
  message: string;
  totalRecords: number;
  component: string;
  data: Array<{
    'Student Name': string;
    'Student Email': string;
    'Grade': string;
    'Grade Category': string;
    'Student Class': string;
    'Total Amount'?: number;
    'Paid Amount'?: number;
    'Remaining Amount'?: number;
    'Overall Status'?: string;
    'Tuition Status'?: string;
    'Uniform Purchased'?: string;
    'Uniform Status'?: string;
    'Transportation Used'?: string;
    'Transportation Status'?: string;
    'Payment Type'?: string;
    'Academic Year': string;
    'Created Date': string;
    'Created By': string;
  }>;
}

// ===== UPDATED BULK UPDATE RESULT =====
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
    gradeAmounts: {
      [key in Grade]: number;
    };
    uniform: {
      enabled: boolean;
      price: number;
    };
    transportation: {
      enabled: boolean;
      tariffs: {
        close: { enabled: boolean; monthlyPrice: number; };
        far: { enabled: boolean; monthlyPrice: number; };
      };
    };
  };
}

// ===== UPDATED STUDENT PAYMENT DETAILS =====
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
    grade: Grade;
    gradeCategory: GradeCategory;
  };
  paymentRecord: StudentPayment;
}

// ===== UTILITY INTERFACES =====
export interface PaymentSummary {
  studentId: string;
  studentName: string;
  totalDue: number;
  totalPaid: number;
  remainingBalance: number;
  lastPaymentDate?: Date;
  nextDueDate?: Date;
  status: string;
  grade: Grade;
  gradeCategory: GradeCategory;
}

export interface PaymentHistoryItem {
  date: Date | string;
  amount: number;
  method: string;
  receiptNumber?: string;
  type: 'tuition_monthly' | 'tuition_annual' | 'uniform' | 'transportation_monthly';
  month?: string;
  component: 'tuition' | 'uniform' | 'transportation';
}

// ===== VALIDATION INTERFACES =====
export interface PaymentValidationErrors {
  amount?: string;
  paymentMethod?: string;
  receiptNumber?: string;
  paymentDate?: string;
  general?: string;
}

export interface PaymentConfigValidationErrors {
  gradeAmounts?: { [key: string]: string };
  uniform?: string;
  transportation?: string;
  gracePeriod?: string;
  general?: string;
}

// ===== CHART AND FILTER INTERFACES =====
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

export interface FilterOption {
  value: string;
  label: string;
  color?: string;
  icon?: string;
  description?: string;
}

export interface PaymentFilterOptions {
  gradeCategories: FilterOption[];
  grades: FilterOption[];
  paymentStatuses: FilterOption[];
  reportTypes: FilterOption[];
  paymentMethods: FilterOption[];
  academicYears: FilterOption[];
  components: FilterOption[];
}

// ===== AVAILABLE GRADES RESPONSE =====
export interface AvailableGradesResponse {
  allGrades: Grade[];
  categorizedGrades: {
    maternelle: Grade[];
    primaire: Grade[];
    secondaire: Grade[];
  };
}

// ===== NOTIFICATION AND DIALOG INTERFACES =====
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

export interface PaymentDialogData {
  student: StudentWithPayment;
  type: 'monthly' | 'annual';
  monthIndex?: number;
  academicYear: string;
  component?: 'tuition' | 'uniform' | 'transportation';
}

export interface PaymentMethodConfig {
  id: string;
  name: string;
  label: string;
  icon: string;
  enabled: boolean;
  requiresReceiptNumber: boolean;
  allowsPartialPayments: boolean;
}

export interface AcademicYearConfig {
  year: string;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  paymentStartMonth: number;
  paymentEndMonth: number;
}

// ===== FINANCIAL SUMMARY =====
export interface FinancialSummary {
  totalExpected: {
    tuition: number;
    uniform: number;
    transportation: number;
    grandTotal: number;
  };
  totalCollected: {
    tuition: number;
    uniform: number;
    transportation: number;
    grandTotal: number;
  };
  totalOutstanding: {
    tuition: number;
    uniform: number;
    transportation: number;
    grandTotal: number;
  };
  collectionRate: {
    tuition: number;
    uniform: number;
    transportation: number;
    overall: number;
  };
  averagePaymentAmount: number;
  paymentsByMonth: { [month: string]: number };
  paymentsByMethod: { [method: string]: number };
  overdueAmount: number;
  discountsGiven: number;
}

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

export interface UpdatePaymentRecordRequest {
  academicYear: string;
  hasUniform: boolean;
  transportationType: 'close' | 'far' | null;
}