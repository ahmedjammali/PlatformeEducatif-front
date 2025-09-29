// services/outcome-analytics.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

// Interfaces for Outcome Analytics
export interface OutcomeFilters {
  school?: string;
  startDate?: string;
  endDate?: string;
  academicYear?: string;
  category?: string;
  userRole?: string;
  chargeCategory?: string;
}

export interface ChargeCategoryAnalysis {
  categorie: string;
  total_amount: number;
  count: number;
  avg_amount: number;
  max_amount: number;
  min_amount: number;
  latest_date: string;
  earliest_date: string;
}

export interface SalaryRoleAnalysis {
  role: string;
  paymentType: string;
  total_paid: number;
  total_pending: number;
  total_expected: number;
  employee_count: number;
  avg_salary: number;
  payment_count: number;
  paid_count: number;
  payment_rate: number;
}

export interface MonthlyTrend {
  year: number;
  month: number;
  total_charges?: number;
  total_salaries?: number;
  paid_salaries?: number;
  pending_salaries?: number;
  count: number;
}

export interface MonthlyTrends {
  charges: MonthlyTrend[];
  salaries: MonthlyTrend[];
}

export interface OutcomeSummary {
  total_charges: number;
  total_salaries: number;
  pending_salaries: number;
  total_outcome: number;
  charges_count: number;
  salaries_count: number;
  average_charge: number;
  average_salary: number;
}

export interface ChargeData {
  _id: string;
  categorie: string;
  description: string;
  date: string;
  montant: number;
  school: {
    _id: string;
    name: string;
  };
  createdBy?: {
    _id: string;
    name: string;

  };
}

export interface SalaryData {
  _id: string;
  user: {
    _id: string;
    name: string;
    email: string;
    role: string;
  };
  school: {
    _id: string;
    name: string;
  };
  academicYear: string;
  paymentSchedule: PaymentScheduleItem[];
  salaryConfiguration: {
    _id: string;
    paymentType: string;
    baseSalary?: number;
    hourlyRate?: number;
  };
}

export interface PaymentScheduleItem {
  month: number;
  monthName: string;
  dueDate: string;
  paymentType: string;
  finalAmount: number;
  isPaid: boolean;
  paidDate?: string;
  paidAmount?: number;
}

export interface OutcomeAnalyticsData {
  summary: OutcomeSummary;
  chargeAnalysis: ChargeCategoryAnalysis[];
  salaryAnalysis: SalaryRoleAnalysis[];
  monthlyTrends: MonthlyTrends;
  charges: ChargeData[];
  salaries: SalaryData[];
}

export interface OutcomeFilterOptions {
  chargeCategories: string[];
  userRoles: string[];
  academicYears: string[];
  dateRange: {
    minDate: string | null;
    maxDate: string | null;
  };
}

export interface OutcomeAnalyticsResponse {
  success: boolean;
  data: OutcomeAnalyticsData;
  message?: string;
}

export interface OutcomeFilterOptionsResponse {
  success: boolean;
  data: OutcomeFilterOptions;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class OutcomeAnalyticsService {
  private apiUrl = `${environment.apiUrl}/outcome-analytics`;

  constructor(private http: HttpClient) { }

  /**
   * Get comprehensive outcome analytics data
   */
  getOutcomeAnalytics(filters: OutcomeFilters = {}): Observable<OutcomeAnalyticsResponse> {
    let params = new HttpParams();

    Object.keys(filters).forEach(key => {
      const value = filters[key as keyof OutcomeFilters];
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, value.toString());
      }
    });

    return this.http.get<OutcomeAnalyticsResponse>(this.apiUrl, { params });
  }

  /**
   * Get available filter options
   */
  getFilterOptions(school?: string): Observable<OutcomeFilterOptionsResponse> {
    let params = new HttpParams();
    if (school) {
      params = params.set('school', school);
    }

    return this.http.get<OutcomeFilterOptionsResponse>(`${this.apiUrl}/filters`, { params });
  }

  /**
   * Export outcome analytics to Excel
   */
  exportToExcel(filters: OutcomeFilters = {}): Observable<Blob> {
    let params = new HttpParams();

    Object.keys(filters).forEach(key => {
      const value = filters[key as keyof OutcomeFilters];
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, value.toString());
      }
    });

    return this.http.get(`${this.apiUrl}/export/excel`, {
      params,
      responseType: 'blob'
    }).pipe(catchError(this.handleError));
  }

  /**
   * Export outcome analytics to PDF
   */
  exportToPDF(filters: OutcomeFilters = {}): Observable<Blob> {
    let params = new HttpParams();

    Object.keys(filters).forEach(key => {
      const value = filters[key as keyof OutcomeFilters];
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, value.toString());
      }
    });

    return this.http.get(`${this.apiUrl}/export/pdf`, {
      params,
      responseType: 'blob'
    }).pipe(catchError(this.handleError));
  }

  /**
   * Download blob as file
   */
  downloadFile(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  /**
   * Helper method to format currency
   */
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('fr-TN', {
      style: 'currency',
      currency: 'TND',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }

  /**
   * Helper method to format percentage
   */
  formatPercentage(value: number): string {
    return `${value.toFixed(1)}%`;
  }

  /**
   * Helper method to get month name in French
   */
  getMonthName(monthNumber: number): string {
    const months = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];
    return months[monthNumber - 1] || '';
  }

  /**
   * Helper method to get role display name in French
   */
  getRoleDisplayName(role: string): string {
    const roleNames: { [key: string]: string } = {
      'teacher': 'Enseignant',
      'admin': 'Administrateur',
      'superadmin': 'Super Administrateur',
      'student': 'Étudiant'
    };
    return roleNames[role] || role;
  }

  /**
   * Helper method to get charge category display name
   */
  getChargeCategoryDisplayName(category: string): string {
    const categoryNames: { [key: string]: string } = {
      'materiel_scolaire': 'Matériel Scolaire',
      'maintenance': 'Maintenance',
      'utilities': 'Services Publics',
      'marketing': 'Marketing',
      'administration': 'Administration',
      'transport': 'Transport',
      'Transport-Carburant': 'Transport-Carburant',
      'Transport-Maintenance': 'Transport-Maintenance',
      'autres': 'Autres'
    };
    return categoryNames[category] || category;
  }

  /**
   * Helper method to get status color for payments
   */
  getPaymentStatusColor(isPaid: boolean): string {
    return isPaid ? '#4CAF50' : '#FF9800';
  }


  /**
   * Helper method to calculate total from array
   */
  calculateTotal(items: any[], field: string): number {
    return items.reduce((sum, item) => sum + (item[field] || 0), 0);
  }

  /**
   * Helper method to group data by month
   */
  groupByMonth(data: any[], dateField: string): { [key: string]: any[] } {
    return data.reduce((groups, item) => {
      const date = new Date(item[dateField]);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!groups[monthKey]) {
        groups[monthKey] = [];
      }
      groups[monthKey].push(item);

      return groups;
    }, {});
  }

  /**
   * Handle HTTP errors
   */
  private handleError(error: any): Observable<never> {
    console.error('An error occurred:', error);
    return throwError(error);
  }
}
