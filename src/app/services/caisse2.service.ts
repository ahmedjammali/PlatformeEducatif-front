// services/caisse.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BaseService } from './base.service';
import {
  Caisse,
  CaisseDashboardData,
  CaisseTransaction,
  CaisseJournaliere,
  InitializeCaisseRequest,
  InitializeCaisseResponse,
  CaisseDashboardResponse,
  VerseCaisseRequest,
  TransfertBanqueRequest,
  TransactionResponse,
  TransactionHistoryResponse,
  TransactionHistoryFilters,
  DailyHistoryResponse,
  DailyHistoryFilters,
  DashboardFilters,
  UpdateCaisseResponse
} from '../models/caisse.model';
import { map } from 'rxjs/operators';

// Interface for delete request
export interface DeleteCaisseRequest {
  confirm: 'DELETE_CAISSE';
}

// Interface for delete response
export interface DeleteCaisseResponse {
  success: boolean;
  message: string;
  data: {
    academicYear: string;
    soldeGeneral: number;
    totalTransactions: number;
    totalDailyRecords: number;
    deletedAt: Date;
  };
}

@Injectable({
  providedIn: 'root'
})
export class Caisse2Service extends BaseService {
  private endpoint = '/caisse';

  constructor(http: HttpClient) {
    super(http);
  }

  /**
   * Initialize caisse for a school (ONE TIME ONLY)
   * @param request - Academic year information
   * @returns Observable of initialization response
   */
  initializeCaisse(request: InitializeCaisseRequest): Observable<InitializeCaisseResponse> {
    return this.http.post<InitializeCaisseResponse>(
      `${this.apiUrl}${this.endpoint}/initialize`,
      request
    );
  }

  /**
   * Delete caisse to allow reinitialization
   * REQUIRES EXPLICIT CONFIRMATION { confirm: "DELETE_CAISSE" }
   * @param request - Confirmation object
   * @returns Observable of delete response
   */
  deleteCaisse(request: DeleteCaisseRequest): Observable<DeleteCaisseResponse> {
    return this.http.delete<DeleteCaisseResponse>(
      `${this.apiUrl}${this.endpoint}/delete`,
      { body: request }
    );
  }

  /**
   * Delete caisse with auto-confirmation (convenience method)
   * Use with caution - this permanently deletes all caisse data!
   * @returns Observable of delete response
   */
  deleteCaisseConfirmed(): Observable<DeleteCaisseResponse> {
    return this.deleteCaisse({ confirm: 'DELETE_CAISSE' });
  }

  /**
   * Get caisse dashboard data
   * @param filters - Optional date filter
   * @returns Observable of dashboard data
   */
  getCaisseDashboard(filters?: DashboardFilters): Observable<CaisseDashboardResponse> {
    const params = this.buildParams(filters || {});
    return this.http.get<CaisseDashboardResponse>(
      `${this.apiUrl}${this.endpoint}/dashboard`,
      { params }
    );
  }

  /**
   * Get only the dashboard data (without success wrapper)
   * @param filters - Optional date filter
   * @returns Observable of CaisseDashboardData
   */
  getDashboardData(filters?: DashboardFilters): Observable<CaisseDashboardData> {
    return this.getCaisseDashboard(filters).pipe(
      map(response => response.data)
    );
  }

  /**
   * Record a cash deposit (verse en caisse)
   * @param request - Amount and optional description/reference
   * @returns Observable of transaction response
   */
  verseCaisse(request: VerseCaisseRequest): Observable<TransactionResponse> {
    return this.http.post<TransactionResponse>(
      `${this.apiUrl}${this.endpoint}/verse`,
      request
    );
  }

  /**
   * Record a bank transfer (transfert banque)
   * @param request - Amount and optional description/reference
   * @returns Observable of transaction response
   */
  transfertBanque(request: TransfertBanqueRequest): Observable<TransactionResponse> {
    return this.http.post<TransactionResponse>(
      `${this.apiUrl}${this.endpoint}/transfert`,
      request
    );
  }

  /**
   * Get transaction history with filters
   * @param filters - Date range, type, pagination
   * @returns Observable of transaction history
   */
  getTransactionHistory(filters?: TransactionHistoryFilters): Observable<TransactionHistoryResponse> {
    const params = this.buildParams(filters || {});
    return this.http.get<TransactionHistoryResponse>(
      `${this.apiUrl}${this.endpoint}/transactions`,
      { params }
    );
  }

  /**
   * Get only transactions array (without pagination info)
   * @param filters - Date range, type, pagination
   * @returns Observable of transactions array
   */
  getTransactions(filters?: TransactionHistoryFilters): Observable<CaisseTransaction[]> {
    return this.getTransactionHistory(filters).pipe(
      map(response => response.data.transactions)
    );
  }

  /**
   * Get daily history with filters
   * @param filters - Date range, pagination
   * @returns Observable of daily history
   */
  getDailyHistory(filters?: DailyHistoryFilters): Observable<DailyHistoryResponse> {
    const params = this.buildParams(filters || {});
    return this.http.get<DailyHistoryResponse>(
      `${this.apiUrl}${this.endpoint}/daily-history`,
      { params }
    );
  }

  /**
   * Get only daily records array (without totals and pagination)
   * @param filters - Date range, pagination
   * @returns Observable of daily records array
   */
  getDailyRecords(filters?: DailyHistoryFilters): Observable<CaisseJournaliere[]> {
    return this.getDailyHistory(filters).pipe(
      map(response => response.data.dailyRecords)
    );
  }

  /**
   * Update/recalculate caisse (manual refresh)
   * @returns Observable of updated caisse
   */
  updateCaisse(): Observable<UpdateCaisseResponse> {
    return this.http.put<UpdateCaisseResponse>(
      `${this.apiUrl}${this.endpoint}/update`,
      {}
    );
  }

  /**
   * Get full caisse data after update
   * @returns Observable of Caisse
   */
  getCaisseAfterUpdate(): Observable<Caisse> {
    return this.updateCaisse().pipe(
      map(response => response.data)
    );
  }

  // Utility methods for formatting

  /**
   * Format amount with currency
   * @param amount - Amount to format
   * @param currency - Currency symbol (default: 'DT')
   * @returns Formatted string
   */
  formatAmount(amount: number, currency: string = 'DT'): string {
    return `${amount.toFixed(2)} ${currency}`;
  }

  /**
   * Format date to YYYY-MM-DD
   * @param date - Date to format
   * @returns Formatted date string
   */
  formatDateForApi(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Get transaction type label in French
   * @param type - Transaction type
   * @returns French label
   */
  getTransactionTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      verse_caisse: 'Versement en caisse',
      transfert_banque: 'Transfert bancaire',
      ajustement: 'Ajustement'
    };
    return labels[type] || type;
  }

  /**
   * Calculate percentage
   * @param part - Part amount
   * @param total - Total amount
   * @returns Percentage (0-100)
   */
  calculatePercentage(part: number, total: number): number {
    if (total === 0) return 0;
    return Math.round((part / total) * 100);
  }

  /**
   * Check if amount is positive (for recettes)
   * @param amount - Amount to check
   * @returns Boolean
   */
  isPositiveBalance(amount: number): boolean {
    return amount > 0;
  }

  /**
   * Check if amount is negative (for deficit)
   * @param amount - Amount to check
   * @returns Boolean
   */
  isNegativeBalance(amount: number): boolean {
    return amount < 0;
  }

  /**
   * Get color class based on balance
   * @param amount - Balance amount
   * @returns CSS class name
   */
  getBalanceColorClass(amount: number): string {
    if (amount > 0) return 'text-success';
    if (amount < 0) return 'text-danger';
    return 'text-warning';
  }
}