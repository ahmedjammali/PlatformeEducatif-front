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
  RecordPaymentRequest,
  GeneratePaymentRequest,
  BulkGeneratePaymentRequest,
  PaymentReport,
  MonthlyStats,
  ExportData,
  BulkUpdateResult,
  StudentPaymentDetails,
  AvailableGradesResponse,
  Grade,
  GradeCategory , 
  UpdatePaymentRecordRequest
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

  // ✅ NEW: Get available grades
  getAvailableGrades(): Observable<AvailableGradesResponse> {
    return this.http.get<AvailableGradesResponse>(
      `${this.apiUrl}${this.endpoint}/grades`
    );
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

  // ✅ UPDATED: Generate payment with new options
  generatePaymentForStudent(
    studentId: string, 
    options: GeneratePaymentRequest = {}
  ): Observable<StudentPayment> {
    return this.http.post<{ message: string; paymentRecord: StudentPayment }>(
      `${this.apiUrl}${this.endpoint}/student/${studentId}/generate`,
      options
    ).pipe(map(response => response.paymentRecord));
  }

  // ✅ UPDATED: Record monthly tuition payment
  recordMonthlyTuitionPayment(
    studentId: string,
    payment: RecordPaymentRequest,
    academicYear?: string
  ): Observable<StudentPayment> {
    const params = academicYear ? this.buildParams({ academicYear }) : undefined;
    return this.http.post<{ message: string; paymentRecord: StudentPayment }>(
      `${this.apiUrl}${this.endpoint}/student/${studentId}/payment/tuition/monthly`,
      payment,
      { params }
    ).pipe(map(response => response.paymentRecord));
  }

  // ✅ NEW: Record monthly transportation payment
  recordMonthlyTransportationPayment(
    studentId: string,
    payment: RecordPaymentRequest,
    academicYear?: string
  ): Observable<StudentPayment> {
    const params = academicYear ? this.buildParams({ academicYear }) : undefined;
    return this.http.post<{ message: string; paymentRecord: StudentPayment }>(
      `${this.apiUrl}${this.endpoint}/student/${studentId}/payment/transportation/monthly`,
      payment,
      { params }
    ).pipe(map(response => response.paymentRecord));
  }

  updatePaymentRecordComponents(studentId: string, options: UpdatePaymentRecordRequest): Observable<StudentPayment> {
  return this.http.put<StudentPayment>(`${this.apiUrl}${this.endpoint}/student/${studentId}/components`, options);
}


  // ✅ NEW: Record uniform payment
  recordUniformPayment(
    studentId: string,
    payment: Omit<RecordPaymentRequest, 'monthIndex' | 'amount'>,
    academicYear?: string
  ): Observable<StudentPayment> {
    const params = academicYear ? this.buildParams({ academicYear }) : undefined;
    return this.http.post<{ message: string; paymentRecord: StudentPayment }>(
      `${this.apiUrl}${this.endpoint}/student/${studentId}/payment/uniform`,
      payment,
      { params }
    ).pipe(map(response => response.paymentRecord));
  }

  // ✅ UPDATED: Record annual tuition payment
  recordAnnualTuitionPayment(
    studentId: string,
    payment: Omit<RecordPaymentRequest, 'monthIndex'>,
    academicYear?: string
  ): Observable<StudentPayment> {
    const params = academicYear ? this.buildParams({ academicYear }) : undefined;
    return this.http.post<{ message: string; paymentRecord: StudentPayment }>(
      `${this.apiUrl}${this.endpoint}/student/${studentId}/payment/tuition/annual`,
      payment,
      { params }
    ).pipe(map(response => response.paymentRecord));
  }

  deletePaymentRecord(studentId: string, academicYear?: string): Observable<{
    message: string;
    deletedRecord: {
      studentId: string;
      academicYear: string;
      totalAmounts: any;
    };
  }> {
    const params = academicYear ? this.buildParams({ academicYear }) : undefined;
    return this.http.delete<{
      message: string;
      deletedRecord: {
        studentId: string;
        academicYear: string;
        totalAmounts: any;
      };
    }>(
      `${this.apiUrl}${this.endpoint}/student/${studentId}`,
      { params }
    );
  }

  // ===== BULK OPERATIONS =====
  
  // ✅ UPDATED: Bulk generate with new options
  bulkGeneratePayments(options: BulkGeneratePaymentRequest = {}): Observable<{
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
      options
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

  deleteAllPaymentRecords(academicYear?: string): Observable<{
    message: string;
    results: {
      deleted: number;
      errors: Array<{
        studentId: string;
        error: string;
      }>;
    };
  }> {
    return this.http.delete<{
      message: string;
      results: {
        deleted: number;
        errors: Array<{
          studentId: string;
          error: string;
        }>;
      };
    }>(
      `${this.apiUrl}${this.endpoint}/bulk/delete-all`,
      { 
        body: { academicYear }
      }
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

  // ✅ UPDATED: Get payment stats by month with component filter
  getPaymentStatsByMonth(academicYear?: string, component: string = 'all'): Observable<MonthlyStats> {
    const params = this.buildParams({ 
      ...(academicYear && { academicYear }),
      component 
    });
    return this.http.get<MonthlyStats>(
      `${this.apiUrl}${this.endpoint}/stats/monthly`,
      { params }
    );
  }

  // ===== REPORTING =====
  
  // ✅ UPDATED: Get payment reports with new filters
  getPaymentReports(
    reportType: 'summary' | 'detailed' | 'overdue' | 'collection' | 'component' = 'summary',
    filters?: {
      academicYear?: string;
      gradeCategory?: GradeCategory;
      grade?: Grade;
      component?: 'all' | 'tuition' | 'uniform' | 'transportation';
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

  // ✅ UPDATED: Export payment data with new filters
  exportPaymentData(filters?: {
    academicYear?: string;
    gradeCategory?: GradeCategory;
    grade?: Grade;
    paymentStatus?: 'pending' | 'partial' | 'completed' | 'overdue';
    component?: 'all' | 'tuition' | 'uniform' | 'transportation';
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
    
    // Include past 2 years, current year, and next 3 years
    for (let i = -2; i <= 3; i++) {
      const year = currentYear + i;
      years.push(`${year}-${year + 1}`);
    }
    return years;
  }

  getCurrentAcademicYear(): string {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    
    // Academic year typically starts in September
    if (currentMonth < 8) {
      return `${currentYear - 1}-${currentYear}`;
    }
    return `${currentYear}-${currentYear + 1}`;
  }

  getPaymentStatusColor(status: string): string {
    const colorMap: { [key: string]: string } = {
      'completed': '#4CAF50',
      'partial': '#FF9800',
      'pending': '#2196F3',
      'overdue': '#F44336',
      'no_record': '#666666',
      'not_applicable': '#9E9E9E'
    };
    return colorMap[status] || '#666666';
  }

  getPaymentStatusIcon(status: string): string {
    const iconMap: { [key: string]: string } = {
      'completed': 'check_circle',
      'partial': 'schedule',
      'pending': 'hourglass_empty',
      'overdue': 'error',
      'no_record': 'help_outline',
      'not_applicable': 'remove_circle_outline'
    };
    return iconMap[status] || 'help_outline';
  }

  // ✅ UPDATED: Grade category colors and icons
  getGradeCategoryColor(gradeCategory: string): string {
    const colorMap: { [key: string]: string } = {
      'maternelle': '#E91E63',  // Pink
      'primaire': '#2196F3',    // Blue
      'secondaire': '#4CAF50'   // Green
    };
    return colorMap[gradeCategory] || '#666666';
  }

  getGradeCategoryIcon(gradeCategory: string): string {
    const iconMap: { [key: string]: string } = {
      'maternelle': 'child_care',
      'primaire': 'school',
      'secondaire': 'account_balance'
    };
    return iconMap[gradeCategory] || 'help_outline';
  }

  // ✅ NEW: Component colors and icons
  getComponentColor(component: string): string {
    const colorMap: { [key: string]: string } = {
      'tuition': '#2196F3',      // Blue
      'uniform': '#FF9800',      // Orange
      'transportation': '#4CAF50' // Green
    };
    return colorMap[component] || '#666666';
  }

  getComponentIcon(component: string): string {
    const iconMap: { [key: string]: string } = {
      'tuition': 'school',
      'uniform': 'checkroom',
      'transportation': 'directions_bus'
    };
    return iconMap[component] || 'help_outline';
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

  // ===== VALIDATION HELPERS =====
  
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

  // ===== FILTER OPTIONS =====
  
  // ✅ UPDATED: Get grade categories
  getGradeCategories(): Array<{ value: GradeCategory; label: string; color: string }> {
    return [
      { value: 'maternelle', label: 'Maternelle', color: this.getGradeCategoryColor('maternelle') },
      { value: 'primaire', label: 'Primaire', color: this.getGradeCategoryColor('primaire') },
      { value: 'secondaire', label: 'Secondaire', color: this.getGradeCategoryColor('secondaire') }
    ];
  }

  // ✅ NEW: Get all grades with categories
  getGradesWithCategories(): Array<{ value: Grade; label: string; category: GradeCategory }> {
    return [
      // Maternelle
      { value: 'Maternal', label: 'Maternal', category: 'maternelle' },
      
      // Primaire
      { value: '1ère année primaire', label: '1ère année primaire', category: 'primaire' },
      { value: '2ème année primaire', label: '2ème année primaire', category: 'primaire' },
      { value: '3ème année primaire', label: '3ème année primaire', category: 'primaire' },
      { value: '4ème année primaire', label: '4ème année primaire', category: 'primaire' },
      { value: '5ème année primaire', label: '5ème année primaire', category: 'primaire' },
      { value: '6ème année primaire', label: '6ème année primaire', category: 'primaire' },
      
      // Secondaire - Collège
      { value: '7ème année', label: '7ème année (Collège)', category: 'secondaire' },
      { value: '8ème année', label: '8ème année (Collège)', category: 'secondaire' },
      { value: '9ème année', label: '9ème année (Collège)', category: 'secondaire' },
      
      // Secondaire - Lycée
      { value: '1ère année lycée', label: '1ère année lycée', category: 'secondaire' },
      { value: '2ème année lycée', label: '2ème année lycée', category: 'secondaire' },
      { value: '3ème année lycée', label: '3ème année lycée', category: 'secondaire' },
      { value: '4ème année lycée', label: '4ème année lycée', category: 'secondaire' }
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

  // ✅ UPDATED: Get report types with new component report
  getReportTypes(): Array<{ value: string; label: string; description: string }> {
    return [
      { value: 'summary', label: 'Résumé', description: 'Vue d\'ensemble des statistiques de paiement' },
      { value: 'detailed', label: 'Détaillé', description: 'Rapport détaillé avec filtrage par date' },
      { value: 'overdue', label: 'En retard', description: 'Étudiants avec paiements en retard' },
      { value: 'collection', label: 'Collecte', description: 'Analyse des collectes par date et méthode' },
      { value: 'component', label: 'Composants', description: 'Analyse par composant (frais scolaires, uniforme, transport)' }
    ];
  }

  // ✅ NEW: Get payment components
  getPaymentComponents(): Array<{ value: string; label: string; color: string; icon: string }> {
    return [
      { value: 'all', label: 'Tous les composants', color: '#666666', icon: 'view_list' },
      { value: 'tuition', label: 'Frais scolaires', color: this.getComponentColor('tuition'), icon: this.getComponentIcon('tuition') },
      { value: 'uniform', label: 'Uniforme', color: this.getComponentColor('uniform'), icon: this.getComponentIcon('uniform') },
      { value: 'transportation', label: 'Transport', color: this.getComponentColor('transportation'), icon: this.getComponentIcon('transportation') }
    ];
  }

  getPaymentMethods(): Array<{ value: string; label: string; icon: string }> {
    return [
      { value: 'cash', label: 'Espèces', icon: 'money' },
      { value: 'check', label: 'Chèque', icon: 'receipt' },
      { value: 'bank_transfer', label: 'Virement bancaire', icon: 'account_balance' },
      { value: 'online', label: 'En ligne', icon: 'payment' }
    ];
  }

  // ✅ NEW: Get transportation types
  getTransportationTypes(): Array<{ value: string; label: string; description: string }> {
    return [
      { value: 'close', label: 'Zone proche', description: 'Transport pour les étudiants habitant près de l\'école' },
      { value: 'far', label: 'Zone éloignée', description: 'Transport pour les étudiants habitant loin de l\'école' }
    ];
  }

  // ===== HELPER METHODS FOR PAYMENT CALCULATIONS =====
  
  calculateTotalAmounts(paymentRecord: StudentPayment): {
    tuition: number;
    uniform: number;
    transportation: number;
    grandTotal: number;
  } {
    return {
      tuition: paymentRecord.totalAmounts?.tuition || 0,
      uniform: paymentRecord.totalAmounts?.uniform || 0,
      transportation: paymentRecord.totalAmounts?.transportation || 0,
      grandTotal: paymentRecord.totalAmounts?.grandTotal || 0
    };
  }

  calculateRemainingAmounts(paymentRecord: StudentPayment): {
    tuition: number;
    uniform: number;
    transportation: number;
    grandTotal: number;
  } {
    const total = this.calculateTotalAmounts(paymentRecord);
    const paid = {
      tuition: paymentRecord.paidAmounts?.tuition || 0,
      uniform: paymentRecord.paidAmounts?.uniform || 0,
      transportation: paymentRecord.paidAmounts?.transportation || 0,
      grandTotal: paymentRecord.paidAmounts?.grandTotal || 0
    };

    return {
      tuition: total.tuition - paid.tuition,
      uniform: total.uniform - paid.uniform,
      transportation: total.transportation - paid.transportation,
      grandTotal: total.grandTotal - paid.grandTotal
    };
  }

  getOverduePayments(paymentRecord: StudentPayment, gracePeriod: number = 5): {
    tuition: any[];
    transportation: any[];
    total: number;
  } {
    const overdueTuition = paymentRecord.tuitionMonthlyPayments?.filter(payment => 
      this.isPaymentOverdue(payment.dueDate, gracePeriod) && 
      (payment.status === 'pending' || payment.status === 'partial')
    ) || [];

    const overdueTransportation = paymentRecord.transportation?.monthlyPayments?.filter(payment => 
      this.isPaymentOverdue(payment.dueDate, gracePeriod) && 
      (payment.status === 'pending' || payment.status === 'partial')
    ) || [];

    return {
      tuition: overdueTuition,
      transportation: overdueTransportation,
      total: overdueTuition.length + overdueTransportation.length
    };
  }

  getPaymentHistory(paymentRecord: StudentPayment): any[] {
    const history: any[] = [];

    // Add tuition payments
    paymentRecord.tuitionMonthlyPayments?.forEach(payment => {
      if (payment.paymentDate && payment.paidAmount > 0) {
        history.push({
          date: payment.paymentDate,
          amount: payment.paidAmount,
          method: payment.paymentMethod,
          receiptNumber: payment.receiptNumber,
          type: 'tuition_monthly',
          month: payment.monthName,
          component: 'tuition'
        });
      }
    });

    // Add annual tuition payment
    if (paymentRecord.annualTuitionPayment?.isPaid && paymentRecord.annualTuitionPayment.paymentDate) {
      history.push({
        date: paymentRecord.annualTuitionPayment.paymentDate,
        amount: paymentRecord.tuitionFees.amount - (paymentRecord.annualTuitionPayment.discount || 0),
        method: paymentRecord.annualTuitionPayment.paymentMethod,
        receiptNumber: paymentRecord.annualTuitionPayment.receiptNumber,
        type: 'tuition_annual',
        component: 'tuition'
      });
    }

    // Add uniform payment
    if (paymentRecord.uniform?.isPaid && paymentRecord.uniform.paymentDate) {
      history.push({
        date: paymentRecord.uniform.paymentDate,
        amount: paymentRecord.uniform.price,
        method: paymentRecord.uniform.paymentMethod,
        receiptNumber: paymentRecord.uniform.receiptNumber,
        type: 'uniform',
        component: 'uniform'
      });
    }

    // Add transportation payments
    paymentRecord.transportation?.monthlyPayments?.forEach(payment => {
      if (payment.paymentDate && payment.paidAmount > 0) {
        history.push({
          date: payment.paymentDate,
          amount: payment.paidAmount,
          method: payment.paymentMethod,
          receiptNumber: payment.receiptNumber,
          type: 'transportation_monthly',
          month: payment.monthName,
          component: 'transportation'
        });
      }
    });

    // Sort by date (most recent first)
    return history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  // ===== GRADE LABEL HELPERS =====
  
  getGradeLabel(grade: Grade): string {
    const gradeLabels: { [key in Grade]: string } = {
      'Maternal': 'Maternelle',
      '1ère année primaire': '1ère année primaire',
      '2ème année primaire': '2ème année primaire', 
      '3ème année primaire': '3ème année primaire',
      '4ème année primaire': '4ème année primaire',
      '5ème année primaire': '5ème année primaire',
      '6ème année primaire': '6ème année primaire',
      '7ème année': '7ème année (Collège)',
      '8ème année': '8ème année (Collège)',
      '9ème année': '9ème année (Collège)',
      '1ère année lycée': '1ère année lycée',
      '2ème année lycée': '2ème année lycée',
      '3ème année lycée': '3ème année lycée',
      '4ème année lycée': '4ème année lycée'
    };
    return gradeLabels[grade] || grade;
  }

  getGradeCategoryLabel(category: GradeCategory): string {
    const categoryLabels: { [key in GradeCategory]: string } = {
      'maternelle': 'Maternelle',
      'primaire': 'Primaire',
      'secondaire': 'Secondaire (Collège + Lycée)'
    };
    return categoryLabels[category] || category;
  }

  // ===== ERROR HANDLING HELPERS =====
  

// Also add error handling helper if you don't have it already
handlePaymentError(error: any): string {
  if (error.error && error.error.message) {
    return error.error.message;
  }
  
  switch (error.status) {
    case 400:
      return 'Données invalides. Veuillez vérifier les informations saisies.';
    case 404:
      return 'Dossier de paiement non trouvé.';
    case 403:
      return 'Vous n\'avez pas les permissions nécessaires.';
    case 500:
      return 'Erreur du serveur. Veuillez réessayer plus tard.';
    default:
      return 'Une erreur inattendue s\'est produite.';
  }
}

  validatePaymentData(payment: RecordPaymentRequest): string[] {
    const errors: string[] = [];

    if (!payment.paymentMethod) {
      errors.push('La méthode de paiement est requise');
    }

    if (payment.amount !== undefined && payment.amount <= 0) {
      errors.push('Le montant doit être supérieur à 0');
    }

    if (payment.receiptNumber && payment.receiptNumber.trim().length < 3) {
      errors.push('Le numéro de reçu doit contenir au moins 3 caractères');
    }

    return errors;
  }
}