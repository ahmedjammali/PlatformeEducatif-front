// models/payment.model.ts
import { User } from './user.model';
import { School } from './school.model';

export interface PaymentConfiguration {
  _id?: string;
  school: School | string;
  academicYear: string;
  paymentAmounts: {
    college: number;
    moyenne: number;
    lycee: number;
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
  classGroup: 'college' | 'moyenne' | 'lycee';
  studentClass: string;
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
  studentClass: any;
  classGroup: string | null;
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
    [key: string]: {
      count: number;
      revenue: number;
    };
  };
}

export interface PaymentFilters {
  search?: string;
  paymentStatus?: 'pending' | 'partial' | 'completed' | 'overdue' | 'no_record';
  classGroup?: 'college' | 'moyenne' | 'lycee';
  academicYear?: string;
  page?: number;
  limit?: number;
}

export interface RecordPaymentRequest {
  monthIndex?: number;
  amount: number;
  paymentMethod: 'cash' | 'check' | 'bank_transfer' | 'online';
  paymentDate?: Date | string;
  notes?: string;
  receiptNumber?: string;
  discount?: number;
}