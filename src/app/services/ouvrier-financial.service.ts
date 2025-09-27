// services/ouvrier-financial.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { BaseService } from './base.service';
import {
  OuvrierFinancialInfo,
  OuvrierPaymentDossier,
  CreateOuvrierFinancialRequest,
  CreateOuvrierFinancialResponse,
  GetOuvriersFinancialResponse,
  GetOuvrierFinancialResponse,
  UpdateOuvrierFinancialRequest,
  UpdateOuvrierFinancialResponse,
  DeleteOuvrierFinancialResponse,
  GetPaymentDossiersResponse,
  GetOuvrierPaymentDossiersResponse,
  GetPaymentDossierResponse,
  UpdatePaymentDossierRequest,
  UpdatePaymentDossierResponse,
  BulkUpdatePaymentDossiersRequest,
  BulkUpdatePaymentDossiersResponse,
  GetPaymentStatisticsResponse,
  OuvrierFinancialFilters,
  PaymentDossierFilters,
  PaymentStatisticsFilters,
  OuvrierFinancialDisplay,
  PaymentDossierDisplay,
  OuvrierPosition,
  OUVRIER_POSITIONS
} from '../models/ouvrier-financial.model';

@Injectable({
  providedIn: 'root'
})
export class OuvrierFinancialService extends BaseService {
  private endpoint = '/ouvrier-financial';

  constructor(http: HttpClient) {
    super(http);
  }

  // Ouvrier Financial Info Methods
  createOuvrierFinancialInfo(data: CreateOuvrierFinancialRequest): Observable<CreateOuvrierFinancialResponse> {
    return this.http.post<CreateOuvrierFinancialResponse>(
      `${this.apiUrl}${this.endpoint}`,
      data
    );
  }

  getAllOuvriersFinancial(filters?: OuvrierFinancialFilters): Observable<GetOuvriersFinancialResponse> {
    const params = this.buildParams(filters || {});
    return this.http.get<GetOuvriersFinancialResponse>(
      `${this.apiUrl}${this.endpoint}`,
      { params }
    );
  }

  // Method that returns formatted data for easier frontend consumption
  getAllOuvriersFinancialFormatted(filters?: OuvrierFinancialFilters): Observable<{
    ouvriers: OuvrierFinancialDisplay[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      limit: number;
    };
  }> {
    return this.getAllOuvriersFinancial(filters).pipe(
      map(response => ({
        ouvriers: response.ouvriersFinancial.map(item => ({
          _id: item._id,
          ouvrierInfo: item.ouvrierInfo,
          position: item.position,
          contractType: item.contractType,
          monthlySalary: item.monthlySalary,
          hourlyRate: item.hourlyRate,
          contractualHoursPerMonth: item.contractualHoursPerMonth,
          startDate: item.startDate,
          isActive: item.isActive,
          createdAt: item.createdAt
        })),
        pagination: response.pagination
      }))
    );
  }

  getOuvrierFinancialInfo(ouvrierId: string): Observable<OuvrierFinancialInfo> {
    return this.http.get<GetOuvrierFinancialResponse>(
      `${this.apiUrl}${this.endpoint}/${ouvrierId}`
    ).pipe(
      map(response => response.ouvrierFinancialInfo)
    );
  }

  getOuvrierFinancialInfoWithResponse(ouvrierId: string): Observable<GetOuvrierFinancialResponse> {
    return this.http.get<GetOuvrierFinancialResponse>(
      `${this.apiUrl}${this.endpoint}/${ouvrierId}`
    );
  }

  updateOuvrierFinancialInfo(ouvrierId: string, data: UpdateOuvrierFinancialRequest): Observable<UpdateOuvrierFinancialResponse> {
    return this.http.put<UpdateOuvrierFinancialResponse>(
      `${this.apiUrl}${this.endpoint}/${ouvrierId}`,
      data
    );
  }

  deleteOuvrierFinancialInfo(ouvrierId: string): Observable<DeleteOuvrierFinancialResponse> {
    return this.http.delete<DeleteOuvrierFinancialResponse>(
      `${this.apiUrl}${this.endpoint}/${ouvrierId}`
    );
  }

  // Payment Dossiers Methods
  getAllPaymentDossiers(filters?: PaymentDossierFilters): Observable<GetPaymentDossiersResponse> {
    const params = this.buildParams(filters || {});
    return this.http.get<GetPaymentDossiersResponse>(
      `${this.apiUrl}${this.endpoint}/dossiers/all`,
      { params }
    );
  }

  // Method that returns formatted data for easier frontend consumption
  getAllPaymentDossiersFormatted(filters?: PaymentDossierFilters): Observable<{
    dossiers: PaymentDossierDisplay[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      limit: number;
    };
  }> {
    return this.getAllPaymentDossiers(filters).pipe(
      map(response => ({
        dossiers: response.paymentDossiers.map(item => ({
          _id: item._id,
          ouvrierInfo: item.ouvrierInfo,
          financialInfo: item.financialInfo,
          month: item.month,
          year: item.year,
          academicYear: item.academicYear,
          hoursWorked: item.hoursWorked,
          calculatedAmount: item.calculatedAmount,
          finalAmount: item.finalAmount,
          status: item.status,
          paymentDate: item.paymentDate,
          notes: item.notes,
          monthName: this.getMonthName(item.month)
        })),
        pagination: response.pagination
      }))
    );
  }

  getOuvrierPaymentDossiers(ouvrierId: string, filters?: { academicYear?: string; status?: string }): Observable<OuvrierPaymentDossier[]> {
    const params = this.buildParams(filters || {});
    return this.http.get<GetOuvrierPaymentDossiersResponse>(
      `${this.apiUrl}${this.endpoint}/dossiers/ouvrier/${ouvrierId}`,
      { params }
    ).pipe(
      map(response => response.paymentDossiers)
    );
  }

  getOuvrierPaymentDossiersWithResponse(ouvrierId: string, filters?: { academicYear?: string; status?: string }): Observable<GetOuvrierPaymentDossiersResponse> {
    const params = this.buildParams(filters || {});
    return this.http.get<GetOuvrierPaymentDossiersResponse>(
      `${this.apiUrl}${this.endpoint}/dossiers/ouvrier/${ouvrierId}`,
      { params }
    );
  }

  getPaymentDossier(dossierId: string): Observable<OuvrierPaymentDossier> {
    return this.http.get<GetPaymentDossierResponse>(
      `${this.apiUrl}${this.endpoint}/dossiers/${dossierId}`
    ).pipe(
      map(response => response.paymentDossier)
    );
  }

  getPaymentDossierWithResponse(dossierId: string): Observable<GetPaymentDossierResponse> {
    return this.http.get<GetPaymentDossierResponse>(
      `${this.apiUrl}${this.endpoint}/dossiers/${dossierId}`
    );
  }

  updatePaymentDossier(dossierId: string, data: UpdatePaymentDossierRequest): Observable<UpdatePaymentDossierResponse> {
    return this.http.put<UpdatePaymentDossierResponse>(
      `${this.apiUrl}${this.endpoint}/dossiers/${dossierId}`,
      data
    );
  }

  bulkUpdatePaymentDossiers(data: BulkUpdatePaymentDossiersRequest): Observable<BulkUpdatePaymentDossiersResponse> {
    return this.http.put<BulkUpdatePaymentDossiersResponse>(
      `${this.apiUrl}${this.endpoint}/dossiers/bulk/update`,
      data
    );
  }

  getPaymentStatistics(filters?: PaymentStatisticsFilters): Observable<GetPaymentStatisticsResponse> {
    const params = this.buildParams(filters || {});
    return this.http.get<GetPaymentStatisticsResponse>(
      `${this.apiUrl}${this.endpoint}/dossiers/statistics`,
      { params }
    );
  }

  // Utility Methods
  getMonthName(month: number): string {
    const months = [
      'September', 'October', 'November', 'December',
      'January', 'February', 'March', 'April', 
      'May', 'June', 'July', 'August'
    ];
    
    // Convert calendar month to academic month (September = 1)
    let academicMonth = month;
    if (month >= 9) {
      academicMonth = month - 8; // Sept=1, Oct=2, Nov=3, Dec=4
    } else {
      academicMonth = month + 4; // Jan=5, Feb=6... Aug=12
    }
    
    return months[academicMonth - 1] || 'Unknown';
  }

  getCurrentAcademicYear(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // JavaScript months are 0-indexed
    
    if (month >= 9) {
      return `${year}-${year + 1}`;
    } else {
      return `${year - 1}-${year}`;
    }
  }

  getAcademicYearFromDate(date: Date | string): string {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    
    if (month >= 9) {
      return `${year}-${year + 1}`;
    } else {
      return `${year - 1}-${year}`;
    }
  }

  getStatusColor(status: 'unpaid' | 'paid' | 'partial'): string {
    switch (status) {
      case 'paid':
        return 'success';
      case 'unpaid':
        return 'danger';
      case 'partial':
        return 'warning';
      default:
        return 'secondary';
    }
  }

  getStatusLabel(status: 'unpaid' | 'paid' | 'partial'): string {
    switch (status) {
      case 'paid':
        return 'Payé';
      case 'unpaid':
        return 'Non payé';
      case 'partial':
        return 'Partiel';
      default:
        return 'Inconnu';
    }
  }

  getPositionLabel(position: OuvrierPosition): string {
    const positionData = OUVRIER_POSITIONS.find(p => p.value === position);
    return positionData?.label || 'Inconnu';
  }

  getPositionColor(position: OuvrierPosition): string {
    switch (position) {
      case 'sécurité':
        return 'primary';
      case 'chef':
        return 'success';
      case 'nettoyeur':
        return 'info';
      case 'cuisinier':
        return 'warning';
      case 'surveillant':
        return 'secondary';
      case 'maintenance':
        return 'dark';
      case 'autre':
        return 'light';
      default:
        return 'secondary';
    }
  }

  calculateMonthlyAmount(contractType: 'monthly' | 'hourly', monthlySalary?: number, hourlyRate?: number, hoursWorked?: number): number {
    if (contractType === 'monthly' && monthlySalary) {
      return monthlySalary;
    } else if (contractType === 'hourly' && hourlyRate && hoursWorked) {
      return hourlyRate * hoursWorked;
    }
    return 0;
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('fr-TN', {
      style: 'currency',
      currency: 'TND'
    }).format(amount);
  }

  // Position-specific statistics
  getPositionStatistics(position: OuvrierPosition, filters?: PaymentStatisticsFilters): Observable<GetPaymentStatisticsResponse> {
    const params = this.buildParams({ ...filters, position });
    return this.http.get<GetPaymentStatisticsResponse>(
      `${this.apiUrl}${this.endpoint}/dossiers/statistics`,
      { params }
    );
  }

  // Get all available positions
  getAvailablePositions(): { value: OuvrierPosition; label: string }[] {
    return OUVRIER_POSITIONS;
  }

  // Validation methods
  isValidMonthlyContract(data: CreateOuvrierFinancialRequest | UpdateOuvrierFinancialRequest): boolean {
    return data.contractType === 'monthly' && !!data.monthlySalary && data.monthlySalary > 0;
  }

  isValidHourlyContract(data: CreateOuvrierFinancialRequest | UpdateOuvrierFinancialRequest): boolean {
    return data.contractType === 'hourly' && 
           !!data.hourlyRate && data.hourlyRate > 0 &&
           !!data.contractualHoursPerMonth && data.contractualHoursPerMonth > 0;
  }

  isValidPosition(position: string): position is OuvrierPosition {
    return OUVRIER_POSITIONS.some(p => p.value === position);
  }

  // Filter helpers for frontend
  getContractTypeOptions(): { value: 'monthly' | 'hourly'; label: string }[] {
    return [
      { value: 'monthly', label: 'Mensuel' },
      { value: 'hourly', label: 'Horaire' }
    ];
  }

  getStatusOptions(): { value: 'unpaid' | 'paid' | 'partial'; label: string }[] {
    return [
      { value: 'unpaid', label: 'Non payé' },
      { value: 'paid', label: 'Payé' },
      { value: 'partial', label: 'Partiel' }
    ];
  }

  // Academic year helpers
  getMonthsForAcademicYear(): { value: number; label: string }[] {
    return [
      { value: 9, label: 'Septembre' },
      { value: 10, label: 'Octobre' },
      { value: 11, label: 'Novembre' },
      { value: 12, label: 'Décembre' },
      { value: 1, label: 'Janvier' },
      { value: 2, label: 'Février' },
      { value: 3, label: 'Mars' },
      { value: 4, label: 'Avril' },
      { value: 5, label: 'Mai' },
      { value: 6, label: 'Juin' },
      { value: 7, label: 'Juillet' },
      { value: 8, label: 'Août' }
    ];
  }

  generateAcademicYears(startYear?: number): { value: string; label: string }[] {
    const currentYear = startYear || new Date().getFullYear();
    const years: { value: string; label: string }[] = [];
    
    for (let i = -2; i <= 2; i++) {
      const year = currentYear + i;
      const academicYear = `${year}-${year + 1}`;
      years.push({ value: academicYear, label: academicYear });
    }
    return years;
  }
}