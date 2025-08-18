// services/payment.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { BaseService } from './base.service';
import { map, tap } from 'rxjs/operators';
import {
  PaymentConfiguration,
  StudentPayment,
  StudentWithPayment,
  PaymentDashboard,
  PaymentFilters,
  RecordPaymentRequest
} from '../models/payment.model';

// Additional interfaces for new APIs
export interface PaymentReport {
  reportType: string;
  academicYear: string;
  classGroup: string;
  dateRange: {
    startDate?: string;
    endDate?: string;
  };
  report: any;
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
    classGroup: string;
  };
  paymentRecord: StudentPayment;
}

@Injectable({
  providedIn: 'root'
})
export class PaymentService extends BaseService {
  private endpoint = '/payments';
  private dashboardData$ = new BehaviorSubject<PaymentDashboard | null>(null);

  constructor(http: HttpClient) {
    super(http);
  }

  // ===== CONFIGURATION MANAGEMENT =====
  createOrUpdatePaymentConfig(config: Partial<PaymentConfiguration>): Observable<PaymentConfiguration> {
    return this.http.post<{ message: string; config: PaymentConfiguration }>(
      `${this.apiUrl}${this.endpoint}/config`,
      config
    ).pipe(map(response => response.config));
  }

  getPaymentConfig(academicYear?: string): Observable<PaymentConfiguration> {
    const params = academicYear ? this.buildParams({ academicYear }) : undefined;
    return this.http.get<{ config: PaymentConfiguration }>(
      `${this.apiUrl}${this.endpoint}/config`,
      { params }
    ).pipe(map(response => response.config));
  }

  // ===== STUDENT PAYMENT MANAGEMENT =====
  getAllStudentsWithPayments(filters?: PaymentFilters): Observable<{
    students: StudentWithPayment[];
    pagination: any;
    academicYear: string;
  }> {
    const params = this.buildParams(filters || {});
    return this.http.get<{
      students: StudentWithPayment[];
      pagination: any;
      academicYear: string;
    }>(
      `${this.apiUrl}${this.endpoint}/students`,
      { params }
    );
  }

  getStudentPaymentDetails(studentId: string, academicYear?: string): Observable<StudentPaymentDetails> {
    const params = academicYear ? this.buildParams({ academicYear }) : undefined;
    return this.http.get<StudentPaymentDetails>(
      `${this.apiUrl}${this.endpoint}/student/${studentId}`,
      { params }
    );
  }

  generatePaymentForStudent(studentId: string, academicYear?: string): Observable<StudentPayment> {
    return this.http.post<{ message: string; paymentRecord: StudentPayment }>(
      `${this.apiUrl}${this.endpoint}/student/${studentId}/generate`,
      { academicYear }
    ).pipe(map(response => response.paymentRecord));
  }

  recordMonthlyPayment(
    studentId: string,
    payment: RecordPaymentRequest,
    academicYear?: string
  ): Observable<StudentPayment> {
    const params = academicYear ? this.buildParams({ academicYear }) : undefined;
    return this.http.post<{ message: string; paymentRecord: StudentPayment }>(
      `${this.apiUrl}${this.endpoint}/student/${studentId}/payment/monthly`,
      payment,
      { params }
    ).pipe(map(response => response.paymentRecord));
  }

  recordAnnualPayment(
    studentId: string,
    payment: RecordPaymentRequest,
    academicYear?: string
  ): Observable<StudentPayment> {
    const params = academicYear ? this.buildParams({ academicYear }) : undefined;
    return this.http.post<{ message: string; paymentRecord: StudentPayment }>(
      `${this.apiUrl}${this.endpoint}/student/${studentId}/payment/annual`,
      payment,
      { params }
    ).pipe(map(response => response.paymentRecord));
  }

  deletePaymentRecord(studentId: string, academicYear?: string): Observable<{
    message: string;
    deletedRecord: {
      studentId: string;
      academicYear: string;
      totalAmount: number;
    };
  }> {
    const params = academicYear ? this.buildParams({ academicYear }) : undefined;
    return this.http.delete<{
      message: string;
      deletedRecord: {
        studentId: string;
        academicYear: string;
        totalAmount: number;
      };
    }>(
      `${this.apiUrl}${this.endpoint}/student/${studentId}`,
      { params }
    );
  }

  // ===== BULK OPERATIONS =====
  bulkGeneratePayments(academicYear?: string): Observable<{
    message: string;
    results: {
      success: number;
      skipped: number;
      errors: any[];
    };
  }> {
    return this.http.post<{
      message: string;
      results: {
        success: number;
        skipped: number;
        errors: any[];
      };
    }>(
      `${this.apiUrl}${this.endpoint}/bulk/generate`,
      { academicYear }
    );
  }

  updateExistingPaymentRecords(
    academicYear?: string,
    updateUnpaidOnly: boolean = true
  ): Observable<BulkUpdateResult> {
    return this.http.put<BulkUpdateResult>(
      `${this.apiUrl}${this.endpoint}/bulk/update-existing`,
      { academicYear, updateUnpaidOnly }
    );
  }

  // ===== DASHBOARD & ANALYTICS =====
  getPaymentDashboard(academicYear?: string): Observable<PaymentDashboard> {
    const params = academicYear ? this.buildParams({ academicYear }) : undefined;
    return this.http.get<{ dashboard: PaymentDashboard }>(
      `${this.apiUrl}${this.endpoint}/dashboard`,
      { params }
    ).pipe(
      map(response => response.dashboard),
      tap(dashboard => this.dashboardData$.next(dashboard))
    );
  }

  getDashboardData(): Observable<PaymentDashboard | null> {
    return this.dashboardData$.asObservable();
  }

  getPaymentStatsByMonth(academicYear?: string): Observable<MonthlyStats> {
    const params = academicYear ? this.buildParams({ academicYear }) : undefined;
    return this.http.get<MonthlyStats>(
      `${this.apiUrl}${this.endpoint}/stats/monthly`,
      { params }
    );
  }

  // ===== REPORTING =====
  getPaymentReports(
    reportType: 'summary' | 'detailed' | 'overdue' | 'collection' = 'summary',
    filters?: {
      academicYear?: string;
      classGroup?: 'école' | 'college' | 'lycée';
      startDate?: string;
      endDate?: string;
    }
  ): Observable<PaymentReport> {
    const params = this.buildParams({
      reportType,
      ...filters
    });
    return this.http.get<PaymentReport>(
      `${this.apiUrl}${this.endpoint}/reports`,
      { params }
    );
  }

  exportPaymentData(filters?: {
    academicYear?: string;
    classGroup?: 'école' | 'college' | 'lycée';
    paymentStatus?: 'pending' | 'partial' | 'completed' | 'overdue';
  }): Observable<ExportData> {
    const params = this.buildParams(filters || {});
    return this.http.get<ExportData>(
      `${this.apiUrl}${this.endpoint}/export`,
      { params }
    );
  }

  // ===== UTILITY METHODS =====
  getAcademicYears(): string[] {
    const currentYear = new Date().getFullYear();
    const years: string[] = [];
    for (let i = 0; i < 5; i++) {
      const year = currentYear - i;
      years.push(`${year}-${year + 1}`);
    }
    return years;
  }

  getCurrentAcademicYear(): string {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    
    // If we're in months 1-8 (Jan-Aug), we're in the second half of the academic year
    if (currentMonth < 7) {
      return `${currentYear - 1}-${currentYear}`;
    }
    // If we're in months 9-12 (Sep-Dec), we're in the first half of the academic year
    return `${currentYear}-${currentYear + 1}`;
  }

  getPaymentStatusColor(status: string): string {
    const colorMap: { [key: string]: string } = {
      'completed': '#4CAF50',
      'partial': '#FF9800',
      'pending': '#2196F3',
      'overdue': '#F44336',
      'no_record': '#666666'
    };
    return colorMap[status] || '#666666';
  }

  getPaymentStatusIcon(status: string): string {
    const iconMap: { [key: string]: string } = {
      'completed': 'check_circle',
      'partial': 'schedule',
      'pending': 'hourglass_empty',
      'overdue': 'error',
      'no_record': 'help_outline'
    };
    return iconMap[status] || 'help_outline';
  }

  getClassGroupColor(classGroup: string): string {
    const colorMap: { [key: string]: string } = {
      'école': '#2196F3',    // Blue
      'college': '#4CAF50',   // Green
      'lycée': '#FF9800'      // Orange
    };
    return colorMap[classGroup] || '#666666';
  }

  getClassGroupIcon(classGroup: string): string {
    const iconMap: { [key: string]: string } = {
      'école': 'school',
      'college': 'domain',
      'lycée': 'account_balance'
    };
    return iconMap[classGroup] || 'help_outline';
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('fr-TN', {
      style: 'currency',
      currency: 'TND',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount);
  }

  calculatePaymentProgress(paidAmount: number, totalAmount: number): number {
    if (totalAmount === 0) return 0;
    return Math.min(100, Math.round((paidAmount / totalAmount) * 100));
  }

  formatDate(date: Date | string): string {
    if (!date) return '';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('fr-TN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(dateObj);
  }

  isPaymentOverdue(dueDate: Date | string, gracePeriod: number = 5): boolean {
    if (!dueDate) return false;
    const dueDateObj = typeof dueDate === 'string' ? new Date(dueDate) : dueDate;
    const gracePeriodDate = new Date(dueDateObj);
    gracePeriodDate.setDate(gracePeriodDate.getDate() + gracePeriod);
    return new Date() > gracePeriodDate;
  }

  getNextDueDate(monthlyPayments: any[]): Date | null {
    const pendingPayments = monthlyPayments.filter(p => 
      p.status === 'pending' || p.status === 'partial'
    );
    
    if (pendingPayments.length === 0) return null;
    
    // Sort by due date and return the earliest
    pendingPayments.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    return new Date(pendingPayments[0].dueDate);
  }

  getPaymentMethodLabel(method: string): string {
    const labelMap: { [key: string]: string } = {
      'cash': 'Espèces',
      'check': 'Chèque',
      'bank_transfer': 'Virement bancaire',
      'online': 'En ligne'
    };
    return labelMap[method] || method;
  }

  // Validation helpers
  validatePaymentAmount(amount: number, maxAmount: number): string | null {
    if (!amount || amount <= 0) {
      return 'Le montant doit être supérieur à 0';
    }
    if (amount > maxAmount) {
      return `Le montant ne peut pas dépasser ${this.formatCurrency(maxAmount)}`;
    }
    return null;
  }

  validateReceiptNumber(receiptNumber: string): string | null {
    if (!receiptNumber || receiptNumber.trim().length === 0) {
      return 'Le numéro de reçu est requis';
    }
    if (receiptNumber.length < 3) {
      return 'Le numéro de reçu doit contenir au moins 3 caractères';
    }
    return null;
  }

  // Class group utilities updated for new structure
  getClassGroups(): Array<{ value: string; label: string; color: string }> {
    return [
      { value: 'école', label: 'École', color: this.getClassGroupColor('école') },
      { value: 'college', label: 'Collège', color: this.getClassGroupColor('college') },
      { value: 'lycée', label: 'Lycée', color: this.getClassGroupColor('lycée') }
    ];
  }

  getPaymentStatuses(): Array<{ value: string; label: string; color: string }> {
    return [
      { value: 'completed', label: 'Complété', color: this.getPaymentStatusColor('completed') },
      { value: 'partial', label: 'Partiel', color: this.getPaymentStatusColor('partial') },
      { value: 'pending', label: 'En attente', color: this.getPaymentStatusColor('pending') },
      { value: 'overdue', label: 'En retard', color: this.getPaymentStatusColor('overdue') },
      { value: 'no_record', label: 'Aucun enregistrement', color: this.getPaymentStatusColor('no_record') }
    ];
  }

  getReportTypes(): Array<{ value: string; label: string; description: string }> {
    return [
      { value: 'summary', label: 'Résumé', description: 'Vue d\'ensemble des statistiques de paiement' },
      { value: 'detailed', label: 'Détaillé', description: 'Rapport détaillé avec filtrage par date' },
      { value: 'overdue', label: 'En retard', description: 'Étudiants avec paiements en retard' },
      { value: 'collection', label: 'Collecte', description: 'Analyse des collectes par date et méthode' }
    ];
  }
}