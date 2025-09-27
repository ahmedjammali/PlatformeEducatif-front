// services/charge.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { BaseService } from './base.service';
import {
  Charge,
  CreateChargeRequest,
  CreateChargeResponse,
  GetChargeResponse,
  GetChargesResponse,
  UpdateChargeRequest,
  UpdateChargeResponse,
  DeleteChargeResponse,
  ChargeFilters,
  BulkUpdateRequest,
  BulkUpdateResponse,
  BulkApproveResponse,
  ChargeAnalytics,
  DashboardStats,
  DateRangeSummary,
  TopSuppliersResponse,
  UpcomingPayments,
  ChargeTemplatesResponse,
  CreateFromTemplateRequest,
  AdvancedSearchFilters,
  AdvancedSearchResponse,
  SubcategoriesResponse,
  ChargeCategory
} from '../models/charge.model';

@Injectable({
  providedIn: 'root'
})
export class ChargeService extends BaseService {
  private endpoint = '/charges';

  constructor(http: HttpClient) {
    super(http);
  }

  // =================== BASIC CRUD OPERATIONS ===================

  createCharge(charge: CreateChargeRequest): Observable<CreateChargeResponse> {
    return this.http.post<CreateChargeResponse>(
      `${this.apiUrl}${this.endpoint}`,
      charge
    );
  }

  getAllCharges(filters?: ChargeFilters): Observable<GetChargesResponse> {
    const params = this.buildParams(filters || {});
    return this.http.get<GetChargesResponse>(
      `${this.apiUrl}${this.endpoint}`,
      { params }
    );
  }

  // Keep backward compatibility
  getCharges(filters?: ChargeFilters): Observable<GetChargesResponse> {
    return this.getAllCharges(filters);
  }

  getChargeById(id: string): Observable<Charge> {
    return this.http.get<GetChargeResponse>(
      `${this.apiUrl}${this.endpoint}/${id}`
    ).pipe(
      map(response => response.charge)
    );
  }

  // Method that returns full response
  getChargeByIdWithResponse(id: string): Observable<GetChargeResponse> {
    return this.http.get<GetChargeResponse>(
      `${this.apiUrl}${this.endpoint}/${id}`
    );
  }

  updateCharge(id: string, updates: UpdateChargeRequest): Observable<UpdateChargeResponse> {
    return this.http.put<UpdateChargeResponse>(
      `${this.apiUrl}${this.endpoint}/${id}`,
      updates
    );
  }

  deleteCharge(id: string): Observable<DeleteChargeResponse> {
    return this.http.delete<DeleteChargeResponse>(
      `${this.apiUrl}${this.endpoint}/${id}`
    );
  }

  // =================== BULK OPERATIONS ===================

  bulkUpdateCharges(request: BulkUpdateRequest): Observable<BulkUpdateResponse> {
    return this.http.put<BulkUpdateResponse>(
      `${this.apiUrl}${this.endpoint}/bulk/update`,
      request
    );
  }

  bulkApproveCharges(chargeIds: string[]): Observable<BulkApproveResponse> {
    return this.http.put<BulkApproveResponse>(
      `${this.apiUrl}${this.endpoint}/bulk/approve`,
      { chargeIds }
    );
  }

  // =================== ANALYTICS & REPORTING ===================

  getChargeAnalytics(filters?: { timeframe?: string; year?: number }): Observable<ChargeAnalytics> {
    const params = this.buildParams(filters || {});
    return this.http.get<ChargeAnalytics>(
      `${this.apiUrl}${this.endpoint}/analytics`,
      { params }
    );
  }

  getDashboardStats(period?: string): Observable<DashboardStats> {
    const params = period ? this.buildParams({ period }) : undefined;
    return this.http.get<DashboardStats>(
      `${this.apiUrl}${this.endpoint}/dashboard/stats`,
      { params }
    );
  }

  getDateRangeSummary(startDate: string, endDate: string): Observable<DateRangeSummary> {
    const params = this.buildParams({ startDate, endDate });
    return this.http.get<DateRangeSummary>(
      `${this.apiUrl}${this.endpoint}/summary/daterange`,
      { params }
    );
  }

  // =================== SUPPLIER MANAGEMENT ===================

  getTopSuppliers(filters?: { limit?: number; timeframe?: string }): Observable<TopSuppliersResponse> {
    const params = this.buildParams(filters || {});
    return this.http.get<TopSuppliersResponse>(
      `${this.apiUrl}${this.endpoint}/suppliers/top`,
      { params }
    );
  }

  // =================== PAYMENT MANAGEMENT ===================

  getUpcomingPayments(days?: number): Observable<UpcomingPayments> {
    const params = days ? this.buildParams({ days }) : undefined;
    return this.http.get<UpcomingPayments>(
      `${this.apiUrl}${this.endpoint}/upcoming/payments`,
      { params }
    );
  }

  markChargeAsOverdue(id: string): Observable<UpdateChargeResponse> {
    return this.http.put<UpdateChargeResponse>(
      `${this.apiUrl}${this.endpoint}/${id}/mark-overdue`,
      {}
    );
  }

  // =================== TEMPLATE SYSTEM ===================

  getChargeTemplates(): Observable<ChargeTemplatesResponse> {
    return this.http.get<ChargeTemplatesResponse>(
      `${this.apiUrl}${this.endpoint}/templates`
    );
  }

  createChargeFromTemplate(request: CreateFromTemplateRequest): Observable<CreateChargeResponse> {
    return this.http.post<CreateChargeResponse>(
      `${this.apiUrl}${this.endpoint}/from-template`,
      request
    );
  }

  // =================== ADVANCED SEARCH ===================

  advancedSearch(filters: AdvancedSearchFilters): Observable<AdvancedSearchResponse> {
    const params = this.buildParams(filters);
    return this.http.get<AdvancedSearchResponse>(
      `${this.apiUrl}${this.endpoint}/search/advanced`,
      { params }
    );
  }

  // =================== UTILITY METHODS ===================

  getSubcategories(category: ChargeCategory): Observable<string[]> {
    return this.http.get<SubcategoriesResponse>(
      `${this.apiUrl}${this.endpoint}/subcategories/${category}`
    ).pipe(
      map(response => response.subcategories)
    );
  }

  // =================== EXPORT/IMPORT (Future Implementation) ===================

  exportCharges(format: 'pdf' | 'excel' | 'csv'): Observable<Blob> {
    return this.http.get(
      `${this.apiUrl}${this.endpoint}/export/${format}`,
      { responseType: 'blob' }
    );
  }

  importCharges(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    
    return this.http.post(
      `${this.apiUrl}${this.endpoint}/import`,
      formData
    );
  }

  // =================== HELPER METHODS ===================

  /**
   * Build HTTP params from filters object, handling arrays and dates properly
   */
  protected override buildParams(filters: any): HttpParams {
    let params = new HttpParams();
    
    Object.keys(filters).forEach(key => {
      const value = filters[key];
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value)) {
          // Handle arrays by joining them with commas
          params = params.set(key, value.join(','));
        } else if (value instanceof Date) {
          // Handle dates by converting to ISO string
          params = params.set(key, value.toISOString());
        } else {
          // Handle primitive values
          params = params.set(key, value.toString());
        }
      }
    });
    
    return params;
  }

  /**
   * Calculate total amount from charges array
   */
  calculateTotalAmount(charges: Charge[]): number {
    return charges.reduce((total, charge) => total + charge.amount, 0);
  }

  /**
   * Get charges by status
   */
  getChargesByStatus(charges: Charge[], status: string): Charge[] {
    return charges.filter(charge => charge.paymentStatus === status);
  }

  /**
   * Get charges by category
   */
  getChargesByCategory(charges: Charge[], category: ChargeCategory): Charge[] {
    return charges.filter(charge => charge.category === category);
  }

  /**
   * Get overdue charges
   */
  getOverdueCharges(charges: Charge[]): Charge[] {
    return charges.filter(charge => charge.paymentStatus === 'overdue');
  }

  /**
   * Get upcoming recurring charges (next 30 days)
   */
  getUpcomingRecurringCharges(charges: Charge[]): Charge[] {
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    return charges.filter(charge => {
      if (!charge.isRecurring || !charge.recurringSettings?.nextDueDate) {
        return false;
      }
      
      const nextDue = new Date(charge.recurringSettings.nextDueDate);
      return nextDue >= today && nextDue <= thirtyDaysFromNow;
    });
  }

  /**
   * Format amount with currency
   */
  formatAmount(amount: number, currency: string = 'TND'): string {
    const currencySymbols: { [key: string]: string } = {
      'TND': 'د.ت',
      'USD': '$',
      'EUR': '€'
    };

    const symbol = currencySymbols[currency] || currency;
    return `${amount.toFixed(2)} ${symbol}`;
  }

  /**
   * Get category color/icon by category name
   */
  getCategoryInfo(category: ChargeCategory): { icon: string; color: string } {
    const categoryMap: { [key in ChargeCategory]: { icon: string; color: string } } = {
      utilities: { icon: '⚡', color: '#F59E0B' },
      equipment: { icon: '🖥️', color: '#3B82F6' },
      maintenance: { icon: '🔧', color: '#10B981' },
      transportation: { icon: '🚐', color: '#8B5CF6' },
      supplies: { icon: '📚', color: '#EF4444' },
      services: { icon: '🏢', color: '#6B7280' },
      technology: { icon: '💻', color: '#14B8A6' },
      infrastructure: { icon: '🏗️', color: '#F97316' },
      events: { icon: '🎉', color: '#EC4899' },
      emergency: { icon: '🚨', color: '#DC2626' },
      other: { icon: '📄', color: '#6B7280' }
    };

    return categoryMap[category] || { icon: '📄', color: '#6B7280' };
  }

  /**
   * Get status color by payment status
   */
  getStatusColor(status: string): string {
    const statusColors: { [key: string]: string } = {
      pending: '#F59E0B',
      paid: '#10B981',
      partially_paid: '#3B82F6',
      overdue: '#EF4444',
      cancelled: '#6B7280'
    };

    return statusColors[status] || '#6B7280';
  }

  /**
   * Get priority color by priority level
   */
  getPriorityColor(priority: string): string {
    const priorityColors: { [key: string]: string } = {
      low: '#10B981',
      medium: '#F59E0B',
      high: '#F97316',
      urgent: '#EF4444'
    };

    return priorityColors[priority] || '#6B7280';
  }

  /**
   * Check if charge requires approval
   */
  requiresApproval(charge: Charge): boolean {
    return charge.approvalRequired && !charge.approvedBy;
  }

  /**
   * Check if charge is overdue
   */
  isOverdue(charge: Charge): boolean {
    return charge.paymentStatus === 'overdue';
  }

  /**
   * Check if charge is recurring
   */
  isRecurring(charge: Charge): boolean {
    return charge.isRecurring && charge.recurringSettings?.isActive === true;
  }

  /**
   * Get next due date for recurring charge
   */
  getNextDueDate(charge: Charge): Date | null {
    if (!this.isRecurring(charge) || !charge.recurringSettings?.nextDueDate) {
      return null;
    }
    return new Date(charge.recurringSettings.nextDueDate);
  }

  /**
   * Calculate days until next payment
   */
  getDaysUntilNextPayment(charge: Charge): number | null {
    const nextDue = this.getNextDueDate(charge);
    if (!nextDue) return null;

    const today = new Date();
    const diffTime = nextDue.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}