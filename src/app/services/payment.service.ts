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

@Injectable({
  providedIn: 'root'
})
export class PaymentService extends BaseService {
  private endpoint = '/payments';
  private dashboardData$ = new BehaviorSubject<PaymentDashboard | null>(null);

  constructor(http: HttpClient) {
    super(http);
  }

  // Configuration Management
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

  // Student Payment Management
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

  // Bulk Operations
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

  // Dashboard
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

  // Utility methods
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
    if (currentMonth < 9) {
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
}