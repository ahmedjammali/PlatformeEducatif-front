// services/teacher-financial.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { BaseService } from './base.service';
import {
  TeacherFinancialInfo,
  TeacherPaymentDossier,
  CreateTeacherFinancialRequest,
  CreateTeacherFinancialResponse,
  GetTeachersFinancialResponse,
  GetTeacherFinancialResponse,
  UpdateTeacherFinancialRequest,
  UpdateTeacherFinancialResponse,
  DeleteTeacherFinancialResponse,
  GetPaymentDossiersResponse,
  GetTeacherPaymentDossiersResponse,
  GetPaymentDossierResponse,
  UpdatePaymentDossierRequest,
  UpdatePaymentDossierResponse,
  BulkUpdatePaymentDossiersRequest,
  BulkUpdatePaymentDossiersResponse,
  GetPaymentStatisticsResponse,
  TeacherFinancialFilters,
  PaymentDossierFilters,
  PaymentStatisticsFilters,
  TeacherFinancialDisplay,
  PaymentDossierDisplay,
  MonthOption,
  MONTH_OPTIONS,
  ACADEMIC_YEAR_MONTHS,
  CONTRACT_PRESETS,
  ContractPreset,
  ContractFormData,
  ContractValidationErrors
} from '../models/teacher-financial.model';

@Injectable({
  providedIn: 'root'
})
export class TeacherFinancialService extends BaseService {
  private endpoint = '/teacher-financial';

  constructor(http: HttpClient) {
    super(http);
  }

  // Teacher Financial Info Methods
  createTeacherFinancialInfo(data: CreateTeacherFinancialRequest): Observable<CreateTeacherFinancialResponse> {
    return this.http.post<CreateTeacherFinancialResponse>(
      `${this.apiUrl}${this.endpoint}`,
      data
    );
  }

  getAllTeachersFinancial(filters?: TeacherFinancialFilters): Observable<GetTeachersFinancialResponse> {
    const params = this.buildParams(filters || {});
    return this.http.get<GetTeachersFinancialResponse>(
      `${this.apiUrl}${this.endpoint}`,
      { params }
    );
  }

  // Method that returns formatted data for easier frontend consumption
  getAllTeachersFinancialFormatted(filters?: TeacherFinancialFilters): Observable<{
    teachers: TeacherFinancialDisplay[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      limit: number;
    };
  }> {
    return this.getAllTeachersFinancial(filters).pipe(
      map(response => ({
        teachers: response.teachersFinancial.map(item => ({
          _id: item._id,
          teacherInfo: item.teacherInfo,
          contractType: item.contractType,
          monthlySalary: item.monthlySalary,
          hourlyRate: item.hourlyRate,
          contractualHoursPerMonth: item.contractualHoursPerMonth,
          startDate: item.startDate,
          endDate: item.endDate,
          contractMonths: item.contractMonths || [],
          contractDuration: item.contractDuration || (item.contractMonths ? item.contractMonths.length : 0),
          monthNames: item.contractMonths ? this.getMonthNames(item.contractMonths) : [],
          isActive: item.isActive,
          createdAt: item.createdAt
        })),
        pagination: response.pagination
      }))
    );
  }

  getTeacherFinancialInfo(teacherId: string): Observable<TeacherFinancialInfo> {
    return this.http.get<GetTeacherFinancialResponse>(
      `${this.apiUrl}${this.endpoint}/${teacherId}`
    ).pipe(
      map(response => response.teacherFinancialInfo)
    );
  }

  getTeacherFinancialInfoWithResponse(teacherId: string): Observable<GetTeacherFinancialResponse> {
    return this.http.get<GetTeacherFinancialResponse>(
      `${this.apiUrl}${this.endpoint}/${teacherId}`
    );
  }

  updateTeacherFinancialInfo(teacherId: string, data: UpdateTeacherFinancialRequest): Observable<UpdateTeacherFinancialResponse> {
    return this.http.put<UpdateTeacherFinancialResponse>(
      `${this.apiUrl}${this.endpoint}/${teacherId}`,
      data
    );
  }

  deleteTeacherFinancialInfo(teacherId: string): Observable<DeleteTeacherFinancialResponse> {
    return this.http.delete<DeleteTeacherFinancialResponse>(
      `${this.apiUrl}${this.endpoint}/${teacherId}`
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
          teacherInfo: item.teacherInfo,
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

  getTeacherPaymentDossiers(teacherId: string, filters?: { academicYear?: string; status?: string }): Observable<TeacherPaymentDossier[]> {
    const params = this.buildParams(filters || {});
    return this.http.get<GetTeacherPaymentDossiersResponse>(
      `${this.apiUrl}${this.endpoint}/dossiers/teacher/${teacherId}`,
      { params }
    ).pipe(
      map(response => response.paymentDossiers)
    );
  }

  getTeacherPaymentDossiersWithResponse(teacherId: string, filters?: { academicYear?: string; status?: string }): Observable<GetTeacherPaymentDossiersResponse> {
    const params = this.buildParams(filters || {});
    return this.http.get<GetTeacherPaymentDossiersResponse>(
      `${this.apiUrl}${this.endpoint}/dossiers/teacher/${teacherId}`,
      { params }
    );
  }

  getPaymentDossier(dossierId: string): Observable<TeacherPaymentDossier> {
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

  // Month and Contract Utility Methods
  getMonthOptions(): MonthOption[] {
    return MONTH_OPTIONS;
  }

  getAcademicYearMonthOptions(): MonthOption[] {
    return ACADEMIC_YEAR_MONTHS;
  }

  getContractPresets(): ContractPreset[] {
    return CONTRACT_PRESETS;
  }

  getMonthName(month: number): string {
    const monthOption = MONTH_OPTIONS.find(m => m.value === month);
    return monthOption ? monthOption.label : 'Unknown';
  }

  getMonthShortName(month: number): string {
    const monthOption = MONTH_OPTIONS.find(m => m.value === month);
    return monthOption ? monthOption.short : 'Unknown';
  }

  getMonthNames(months: number[]): string[] {
    return months.map(month => this.getMonthName(month));
  }

  getAcademicMonthName(month: number): string {
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

  // Contract month validation and utilities
  validateContractMonths(months: number[]): boolean {
    if (!months || months.length === 0) return false;
    return months.every(month => month >= 1 && month <= 12);
  }

  sortContractMonths(months: number[]): number[] {
    return [...new Set(months)].sort((a, b) => a - b);
  }

  getContractMonthsInAcademicOrder(months: number[]): number[] {
    const academicOrder = [9, 10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8];
    return academicOrder.filter(month => months.includes(month));
  }

  formatContractPeriod(months: number[]): string {
    if (!months || months.length === 0) return 'No months selected';
    
    const sortedMonths = this.getContractMonthsInAcademicOrder(months);
    const monthNames = sortedMonths.map(month => this.getMonthShortName(month));
    
    if (months.length === 12) {
      return 'Full Academic Year';
    } else if (months.length === 1) {
      return monthNames[0];
    } else if (months.length <= 3) {
      return monthNames.join(', ');
    } else {
      return `${monthNames[0]} - ${monthNames[monthNames.length - 1]} (${months.length} months)`;
    }
  }

  isConsecutiveMonths(months: number[]): boolean {
    if (months.length <= 1) return true;
    
    const academicOrder = this.getContractMonthsInAcademicOrder(months);
    for (let i = 1; i < academicOrder.length; i++) {
      const current = academicOrder[i];
      const previous = academicOrder[i - 1];
      
      // Check if consecutive in academic year
      if (current === 1 && previous === 12) continue; // Dec to Jan
      if (current !== previous + 1) return false;
    }
    return true;
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

  // Date utilities
  calculateContractDuration(startDate: string | Date, endDate: string | Date): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.ceil(diffDays / 30); // Approximate months
  }

  isDateRangeValid(startDate: string | Date, endDate: string | Date): boolean {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return start < end;
  }

  // Form validation
  validateContractForm(formData: ContractFormData): ContractValidationErrors {
    const errors: ContractValidationErrors = {};

    // Required fields
    if (!formData.teacherId) {
      errors.teacherId = 'Teacher selection is required';
    }

    if (!formData.contractType) {
      errors.contractType = 'Contract type is required';
    }

    if (!formData.startDate) {
      errors.startDate = 'Start date is required';
    }

    if (!formData.endDate) {
      errors.endDate = 'End date is required';
    }

    if (!formData.contractMonths || formData.contractMonths.length === 0) {
      errors.contractMonths = 'At least one month must be selected';
    }

    // Date validation
    if (formData.startDate && formData.endDate) {
      if (!this.isDateRangeValid(formData.startDate, formData.endDate)) {
        errors.dateRange = 'End date must be after start date';
      }
    }

    // Contract months validation
    if (formData.contractMonths && !this.validateContractMonths(formData.contractMonths)) {
      errors.contractMonths = 'Invalid month selection';
    }

    // Contract type specific validation
    if (formData.contractType === 'monthly') {
      if (!formData.monthlySalary || formData.monthlySalary <= 0) {
        errors.monthlySalary = 'Monthly salary must be greater than 0';
      }
    }

    if (formData.contractType === 'hourly') {
      if (!formData.hourlyRate || formData.hourlyRate <= 0) {
        errors.hourlyRate = 'Hourly rate must be greater than 0';
      }
      if (!formData.contractualHoursPerMonth || formData.contractualHoursPerMonth <= 0) {
        errors.contractualHoursPerMonth = 'Contractual hours per month must be greater than 0';
      }
    }

    return errors;
  }

  hasValidationErrors(errors: ContractValidationErrors): boolean {
    return Object.keys(errors).length > 0;
  }

  // Status and display utilities
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
        return 'Paid';
      case 'unpaid':
        return 'Unpaid';
      case 'partial':
        return 'Partial';
      default:
        return 'Unknown';
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

  // Enhanced validation methods
  isValidMonthlyContract(data: CreateTeacherFinancialRequest | UpdateTeacherFinancialRequest): boolean {
    return data.contractType === 'monthly' && !!data.monthlySalary && data.monthlySalary > 0;
  }

  isValidHourlyContract(data: CreateTeacherFinancialRequest | UpdateTeacherFinancialRequest): boolean {
    return data.contractType === 'hourly' && 
           !!data.hourlyRate && data.hourlyRate > 0 &&
           !!data.contractualHoursPerMonth && data.contractualHoursPerMonth > 0;
  }

  isValidContractRequest(data: CreateTeacherFinancialRequest): boolean {
    const hasValidMonths = !!(data.contractMonths && 
                          Array.isArray(data.contractMonths) && 
                          data.contractMonths.length > 0 &&
                          this.validateContractMonths(data.contractMonths));

    const hasValidDates = !!(data.startDate && 
                         data.endDate && 
                         this.isDateRangeValid(data.startDate, data.endDate));

    const hasValidContractDetails = data.contractType === 'monthly' 
      ? this.isValidMonthlyContract(data)
      : this.isValidHourlyContract(data);

    return hasValidMonths && hasValidDates && hasValidContractDetails;
  }
}