// Income Analytics Service for Angular Frontend

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface ComponentAnalysis {
  name: string;
  attendu: number;
  collecte: number;
  en_attente: number;
  taux: number;
}

export interface LevelAnalysis {
  niveau: string;
  categorie: string;
  nbr_etudiants: number;
  attendu: number;
  collecte: number;
  en_attente: number;
  taux: number;
}

export interface PaymentBreakdown {
  inscriptionFee: {
    applicable: boolean;
    total: number;
    paid: number;
    isPaid: boolean;
  };
  fraisScolaires: {
    total: number;
    paid: number;
    type: string;
    monthlyAmount: number;
  };
  uniform: {
    applicable: boolean;
    total: number;
    paid: number;
    isPaid: boolean;
  };
  transport: {
    applicable: boolean;
    total: number;
    paid: number;
    type: string;
    monthlyAmount: number;
  };
}

export interface StudentAnalysis {
  studentId: string;
  nom: string;
  email: string;
  niveau: string;
  categorie: string;
  totalPaid: number;
  paymentBreakdown: PaymentBreakdown;
  statut: string;
  remise: number;
  pourcentage_remise: number;
  academicYear: string;
}

export interface CategoryBreakdown {
  etudiants: number;
  attendu: number;
  collecte: number;
  en_attente: number;
  taux: number;
}

export interface IncomeAnalyticsSummary {
  total_etudiants: number;
  total_attendu: number;
  total_collecte: number;
  total_en_attente: number;
  taux_global: number;
  total_remises: number;
}

export interface IncomeAnalyticsData {
  summary: IncomeAnalyticsSummary;
  componentAnalysis: { [key: string]: ComponentAnalysis };
  levelAnalysis: LevelAnalysis[];
  studentAnalysis: StudentAnalysis[];
  categoryBreakdown: { [key: string]: CategoryBreakdown };
  filters: IncomeFilters;
}

export interface IncomeFilters {
  school?: string;
  grade?: string;
  component?: string;
  category?: string;
  startDate?: string;
  endDate?: string;
  academicYear?: string;
}

export interface FilterOptions {
  grades: string[];
  categories: string[];
  components: { value: string; label: string }[];
  academicYears: string[];
}

export interface IncomeAnalyticsResponse {
  success: boolean;
  message: string;
  data: IncomeAnalyticsData;
}

export interface FilterOptionsResponse {
  success: boolean;
  data: FilterOptions;
}

@Injectable({
  providedIn: 'root'
})
export class IncomeAnalyticsService {
  private apiUrl = `${environment.apiUrl}/income-analytics`;
  private loadingSubject = new BehaviorSubject<boolean>(false);
  public loading$ = this.loadingSubject.asObservable();

  constructor(private http: HttpClient) { }

  /**
   * Get comprehensive income analytics data
   */
  getIncomeAnalytics(filters: IncomeFilters = {}): Observable<IncomeAnalyticsResponse> {
    this.loadingSubject.next(true);

    let params = new HttpParams();

    // Add filters to query parameters
    if (filters.school) params = params.set('school', filters.school);
    if (filters.grade) params = params.set('grade', filters.grade);
    if (filters.component) params = params.set('component', filters.component);
    if (filters.category) params = params.set('category', filters.category);
    if (filters.startDate) params = params.set('startDate', filters.startDate);
    if (filters.endDate) params = params.set('endDate', filters.endDate);
    if (filters.academicYear) params = params.set('academicYear', filters.academicYear);

    return new Observable(observer => {
      this.http.get<IncomeAnalyticsResponse>(this.apiUrl, { params }).subscribe({
        next: (response) => {
          this.loadingSubject.next(false);
          observer.next(response);
          observer.complete();
        },
        error: (error) => {
          this.loadingSubject.next(false);
          observer.error(error);
        }
      });
    });
  }

  /**
   * Get available filter options
   */
  getFilterOptions(school?: string): Observable<FilterOptionsResponse> {
    let params = new HttpParams();
    if (school) params = params.set('school', school);

    return this.http.get<FilterOptionsResponse>(`${this.apiUrl}/filters`, { params });
  }

  /**
   * Export income analytics to Excel
   */
  exportToExcel(filters: IncomeFilters = {}): Observable<Blob> {
    let params = new HttpParams();
    
    // Add filters to query parameters
    if (filters.school) params = params.set('school', filters.school);
    if (filters.grade) params = params.set('grade', filters.grade);
    if (filters.component) params = params.set('component', filters.component);
    if (filters.category) params = params.set('category', filters.category);
    if (filters.startDate) params = params.set('startDate', filters.startDate);
    if (filters.endDate) params = params.set('endDate', filters.endDate);
    if (filters.academicYear) params = params.set('academicYear', filters.academicYear);

    return this.http.get(`${this.apiUrl}/export/excel`, { 
      params,
      responseType: 'blob'
    }).pipe(catchError(this.handleError));
  }

  /**
   * Export income analytics to PDF
   */
  exportToPDF(filters: IncomeFilters = {}): Observable<Blob> {
    let params = new HttpParams();
    
    // Add filters to query parameters
    if (filters.school) params = params.set('school', filters.school);
    if (filters.grade) params = params.set('grade', filters.grade);
    if (filters.component) params = params.set('component', filters.component);
    if (filters.category) params = params.set('category', filters.category);
    if (filters.startDate) params = params.set('startDate', filters.startDate);
    if (filters.endDate) params = params.set('endDate', filters.endDate);
    if (filters.academicYear) params = params.set('academicYear', filters.academicYear);

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
   * Get loading state
   */
  get isLoading(): boolean {
    return this.loadingSubject.value;
  }

  /**
   * Format currency for display
   */
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('fr-TN', {
      style: 'currency',
      currency: 'TND',
      minimumFractionDigits: 2
    }).format(amount);
  }

  /**
   * Format percentage for display
   */
  formatPercentage(percentage: number): string {
    return `${percentage.toFixed(1)}%`;
  }

  /**
   * Get status color based on payment status
   */
  getStatusColor(status: string): string {
    switch (status.toLowerCase()) {
      case 'payé':
        return '#22c55e'; // Green
      case 'non payé':
        return '#ef4444'; // Red
      case 'partiellement payé':
      case 'en cours':
        return '#f59e0b'; // Amber
      default:
        return '#6b7280'; // Gray
    }
  }

  /**
   * Get category display name
   */
  getCategoryDisplayName(category: string): string {
    switch (category) {
      case 'maternelle':
        return 'Maternelle';
      case 'primaire':
        return 'Primaire';
      case 'secondaire':
        return 'Secondaire';
      default:
        return category;
    }
  }

  /**
   * Calculate collection rate color
   */
  getRateColor(rate: number): string {
    if (rate >= 90) return '#22c55e'; // Green
    if (rate >= 70) return '#f59e0b'; // Amber
    if (rate >= 50) return '#fb923c'; // Orange
    return '#ef4444'; // Red
  }

  /**
   * Handle HTTP errors
   */
  private handleError(error: any): Observable<never> {
    console.error('An error occurred:', error);
    return throwError(error);
  }
}
