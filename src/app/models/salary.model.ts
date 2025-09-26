// models/salary.model.ts
import { User } from './user.model';
import { School } from './school.model';

export interface SalaryConfiguration {
    _id?: string;
    user: User | string;
    school: School | string;
    academicYear: string;
    paymentType: 'monthly' | 'hourly';
    baseSalary?: number;
    hourlyRate?: number;
    allowExtraHours: boolean;
    extraHourlyRate?: number;
    paymentCalendar: PaymentCalendarRange;
    isActive: boolean;
    createdBy?: User | string;
    updatedBy?: User | string;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface PaymentCalendarRange {
    startMonth: number;
    endMonth: number;
}

export interface SalaryPayment {
    month: number;
    monthName: string;
    dueDate: Date;
    paymentType: 'monthly' | 'hourly';
    baseSalaryAmount: number;
    regularHours: number;
    actualHoursWorked: number;
    hourlyRate: number;
    regularAmount: number;
    extraHours: number;
    extraHourlyRate: number;
    extraAmount: number;
    totalAmount: number;
    paymentStatus: 'pending' | 'partial' | 'paid' | 'overdue' | 'cancelled';
    paidDate?: Date;
    paidAmount: number;
    paymentMethod: 'cash' | 'bank_transfer' | 'check' | 'digital_wallet';
    paymentReference?: string;
    notes?: string;
    processedBy?: User | string;
}

export interface TeacherAdminSalary {
    _id?: string;
    user: User | string;
    school: School | string;
    salaryConfiguration: SalaryConfiguration | string;
    academicYear: string;
    paymentSchedule: SalaryPayment[];
    totalScheduledAmount: number;
    totalPaidAmount: number;
    totalPendingAmount: number;
    overallStatus: 'active' | 'completed' | 'suspended' | 'cancelled';
    createdBy?: User | string;
    updatedBy?: User | string;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface SalarySummary {
    totalScheduled: number;
    totalPaid: number;
    totalPending: number;
    pendingPayments: number;
    overdue: number;
    totalRecords: number;
}

export interface CreateSalaryConfigurationRequest {
    userId: string;
    academicYear: string;
    paymentType: 'monthly' | 'hourly';
    baseSalary?: number;
    hourlyRate?: number;
    allowExtraHours: boolean;
    extraHourlyRate?: number;
    paymentCalendar: PaymentCalendarRange;
}

export interface UpdateExtraHoursRequest {
    month: number;
    extraHours: number;
}

export interface RecordPaymentRequest {
    month: number;
    paidAmount: number;
    paymentMethod: 'cash' | 'bank_transfer' | 'check' | 'digital_wallet';
    paymentReference?: string;
    notes?: string;
}
