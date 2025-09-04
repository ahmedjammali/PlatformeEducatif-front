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
// models/payment.model.ts - PaymentConfiguration updates

export interface PaymentConfiguration {
  _id?: string;
  school: School | string;
  academicYear: string;
  
  gradeAmounts: {
    'Maternal': number;
    '1ère année primaire': number;
    '2ème année primaire': number;
    '3ème année primaire': number;
    '4ème année primaire': number;
    '5ème année primaire': number;
    '6ème année primaire': number;
    '7ème année': number;
    '8ème année': number;
    '9ème année': number;
    '1ère année lycée': number;
    '2ème année lycée': number;
    '3ème année lycée': number;
    '4ème année lycée': number;
  };

  uniform: {
    enabled: boolean;
    price: number;
    description?: string;
    isOptional?: boolean;
  };

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

  // ✅ NEW: Inscription fee configuration
  inscriptionFee: {
    enabled: boolean;
    prices: {
      maternelleAndPrimaire: number;
      collegeAndLycee: number;
    };
    description?: string;
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

export interface InscriptionFeePayment {
  applicable: boolean;
  price: number;
  isPaid: boolean;
  paymentDate?: Date | string;
  paymentMethod?: 'cash' | 'check' | 'bank_transfer' | 'online';
  receiptNumber?: string;
  notes?: string;
  recordedBy?: User | string;
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
export interface StudentPayment {
  _id?: string;
  student: User | string;
  school: School | string;
  academicYear: string;
  
  grade: Grade;
  gradeCategory: GradeCategory;
  studentClass: string;
  
  paymentType: 'monthly' | 'annual';
  
  tuitionFees: {
    amount: number;
    monthlyAmount: number;
  };

  uniform: UniformPayment;
  transportation: TransportationPayment;
  
  // ✅ NEW: Inscription fee payment details
  inscriptionFee: InscriptionFeePayment;

  tuitionMonthlyPayments: MonthlyPayment[];

  // ✅ UPDATED: Total amounts with inscription fee
  totalAmounts: {
    tuition: number;
    uniform: number;
    transportation: number;
    inscriptionFee: number; // ✅ NEW
    grandTotal: number;
  };

  paidAmounts: {
    tuition: number;
    uniform: number;
    transportation: number;
    inscriptionFee: number; // ✅ NEW
    grandTotal: number;
  };

  remainingAmounts: {
    tuition: number;
    uniform: number;
    transportation: number;
    inscriptionFee: number; // ✅ NEW
    grandTotal: number;
  };

  annualTuitionPayment?: AnnualTuitionPayment;
  overallStatus: 'pending' | 'partial' | 'completed' | 'overdue';

  // ✅ UPDATED: Component statuses with inscription fee
  componentStatus: {
    tuition: 'pending' | 'partial' | 'completed' | 'overdue';
    uniform: 'not_applicable' | 'pending' | 'completed';
    transportation: 'not_applicable' | 'pending' | 'partial' | 'completed' | 'overdue';
    inscriptionFee: 'not_applicable' | 'pending' | 'completed'; // ✅ NEW
  };

  discount: StudentDiscount;
  createdBy: User | string;
  createdAt?: Date;
  updatedAt?: Date;
}
export interface PaymentDashboard {
  overview: {
    totalStudents: number;
    studentsWithPayments: number;
    studentsWithoutPayments: number;
    totalRevenue: {
      tuition: number;
      uniform: number;
      transportation: number;
      inscriptionFee: number; // ✅ NEW
      grandTotal: number;
    };
    expectedRevenue: {
      tuition: number;
      uniform: number;
      transportation: number;
      inscriptionFee: number; // ✅ NEW
      grandTotal: number;
    };
    outstandingAmount: {
      tuition: number;
      uniform: number;
      transportation: number;
      inscriptionFee: number; // ✅ NEW
      grandTotal: number;
    };
    collectionRate: {
      tuition: string;
      uniform: string;
      transportation: string;
      inscriptionFee: string; // ✅ NEW
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
    // ✅ NEW: Inscription fee statistics
    inscriptionFee: {
      totalStudents: number;
      paidStudents: number;
      totalRevenue: number;
      expectedRevenue: number;
    };
  };
}
export interface PaymentFilters {
  search?: string;
  paymentStatus?: 'pending' | 'partial' | 'completed' | 'overdue' | 'no_record';
  gradeCategory?: GradeCategory;
  grade?: Grade;
  classId?: string;
  academicYear?: string;
  component?: 'all' | 'tuition' | 'uniform' | 'transportation' | 'inscriptionFee'; // ✅ UPDATED
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

// ✅ UPDATED: Generate payment request with inscription fee
export interface GeneratePaymentRequest {
  academicYear?: string;
  hasUniform?: boolean;
  transportationType?: 'close' | 'far' | null;
  includeInscriptionFee?: boolean; // ✅ NEW
}
// ✅ NEW: Bulk generate payment request
export interface BulkGeneratePaymentRequest {
  academicYear?: string;
  defaultUniform?: boolean;
  defaultTransportation?: 'close' | 'far' | null;
  defaultInscriptionFee?: boolean; // ✅ NEW
}

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
    'Inscription Fee Applicable'?: string;      // ✅ NEW
    'Inscription Fee Status'?: string;          // ✅ NEW
    'Payment Type'?: string;
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
    // ✅ NEW: Inscription fee configuration
    inscriptionFee: {
      enabled: boolean;
      prices: {
        maternelleAndPrimaire: number;
        collegeAndLycee: number;
      };
    };
  };
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
  type: 'tuition_monthly' | 'tuition_annual' | 'uniform' | 'transportation_monthly' | 'inscription_fee'; // ✅ UPDATED
  month?: string;
  component: 'tuition' | 'uniform' | 'transportation' | 'inscriptionFee'; // ✅ UPDATED
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

// In your models/payment.model.ts file, update this interface:

export interface PaymentDialogData {
  student: StudentWithPayment;
  type: 'monthly' | 'annual';
  monthIndex?: number;
  academicYear: string;
  component?: 'tuition' | 'uniform' | 'transportation' | 'inscriptionFee'; // ✅ Add inscriptionFee here
}


export interface FinancialSummary {
  totalExpected: {
    tuition: number;
    uniform: number;
    transportation: number;
    inscriptionFee: number; // ✅ NEW
    grandTotal: number;
  };
  totalCollected: {
    tuition: number;
    uniform: number;
    transportation: number;
    inscriptionFee: number; // ✅ NEW
    grandTotal: number;
  };
  totalOutstanding: {
    tuition: number;
    uniform: number;
    transportation: number;
    inscriptionFee: number; // ✅ NEW
    grandTotal: number;
  };
  collectionRate: {
    tuition: number;
    uniform: number;
    transportation: number;
    inscriptionFee: number; // ✅ NEW
    overall: number;
  };
  averagePaymentAmount: number;
  paymentsByMonth: { [month: string]: number };
  paymentsByMethod: { [method: string]: number };
  overdueAmount: number;
  discountsGiven: number;
}





export interface UpdatePaymentRecordRequest {
  academicYear: string;
  hasUniform: boolean;
  transportationType: 'close' | 'far' | null;
  hasInscriptionFee?: boolean; // ✅ NEW
}
  export interface StudentDiscount {
    enabled: boolean;
    type?: 'monthly' | 'annual';
    percentage?: number;
    appliedBy?: User | string;
    appliedDate?: Date | string;
    notes?: string;
  }

  // ✅ NEW: Apply discount request interface
  export interface ApplyDiscountRequest {
    discountType: 'monthly' | 'annual';
    percentage: number;
    notes?: string;
  }

  // ✅ NEW: Apply discount response interface
  export interface ApplyDiscountResponse {
    message: string;
    discount: {
      type: string;
      percentage: number;
      amount: number;
      originalAmount: number;
      newAmount: number;
    };
    paymentRecord: StudentPayment;
  }