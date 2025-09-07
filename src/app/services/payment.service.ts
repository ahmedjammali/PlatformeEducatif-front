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
    StudentDiscount,
  ApplyDiscountRequest,
  ApplyDiscountResponse,
  ExportData,
  BulkUpdateResult,

  AvailableGradesResponse,
  Grade,
  GradeCategory , 
  UpdatePaymentRecordRequest,
  PaymentAnalytics,
  AnalyticsFilters,
  ChartData,
  EnhancedReportResponse,
  FinancialSummaryResponse
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
    for (let i = 0; i <= 3; i++) {
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

getComponentColor(component: string): string {
  const colorMap: { [key: string]: string } = {
    'tuition': '#2196F3',        // Blue
    'uniform': '#FF9800',        // Orange
    'transportation': '#4CAF50', // Green
    'inscriptionFee': '#9C27B0'  // Purple ✅ NEW
  };
  return colorMap[component] || '#666666';
}


getComponentIcon(component: string): string {
  const iconMap: { [key: string]: string } = {
    'tuition': 'school',
    'uniform': 'checkroom',
    'transportation': 'directions_bus',
    'inscriptionFee': 'assignment'  // ✅ NEW
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



  getPaymentMethodLabel(method: string): string {
    const labelMap: { [key: string]: string } = {
      'cash': 'Espèces',
      'check': 'Chèque',
      'bank_transfer': 'Virement bancaire',
      'online': 'En ligne'
    };
    return labelMap[method] || method;
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

  // ✅ NEW: Add inscription fee payment
  if (paymentRecord.inscriptionFee?.isPaid && paymentRecord.inscriptionFee.paymentDate) {
    history.push({
      date: paymentRecord.inscriptionFee.paymentDate,
      amount: paymentRecord.inscriptionFee.price,
      method: paymentRecord.inscriptionFee.paymentMethod,
      receiptNumber: paymentRecord.inscriptionFee.receiptNumber,
      type: 'inscription_fee',
      component: 'inscriptionFee'
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
// ✅ NEW: Helper method to get inscription fee label
getInscriptionFeeLabel(): string {
  return 'Frais d\'inscription';
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
applyStudentDiscount(
  studentId: string,
  discountRequest: ApplyDiscountRequest,
  academicYear?: string
): Observable<ApplyDiscountResponse> {
  const params = academicYear ? this.buildParams({ academicYear }) : undefined;
  return this.http.post<ApplyDiscountResponse>(
    `${this.apiUrl}${this.endpoint}/student/${studentId}/discount`,
    discountRequest,
    { params }
  );
}

// ✅ Remove discount from student
removeStudentDiscount(
  studentId: string,
  academicYear?: string
): Observable<{ message: string; paymentRecord: StudentPayment }> {
  const params = academicYear ? this.buildParams({ academicYear }) : undefined;
  return this.http.delete<{ message: string; paymentRecord: StudentPayment }>(
    `${this.apiUrl}${this.endpoint}/student/${studentId}/discount`,
    { params }
  );
}


recordInscriptionFeePayment(
  studentId: string,
  payment: Omit<RecordPaymentRequest, 'monthIndex' | 'amount'>,
  academicYear?: string
): Observable<StudentPayment> {
  const params = academicYear ? this.buildParams({ academicYear }) : undefined;
  return this.http.post<{ message: string; paymentRecord: StudentPayment }>(
    `${this.apiUrl}${this.endpoint}/student/${studentId}/payment/inscription`,
    payment,
    { params }  
  ).pipe(map(response => response.paymentRecord));
}

// ✅ UTILITY: Check if student has discount
hasDiscount(paymentRecord: StudentPayment): boolean {
  return paymentRecord?.discount?.enabled || false;
}

// ✅ UTILITY: Get discount display text
getDiscountDisplayText(discount: StudentDiscount): string {
  if (!discount?.enabled) return 'Aucune remise';
  
  const typeText = discount.type === 'monthly' ? 'Mensuel' : 'Annuel';
  return `${discount.percentage}% - ${typeText}`;
}

// ✅ UTILITY: Calculate discount amount
calculateDiscountAmount(originalAmount: number, percentage: number): number {
  return (originalAmount * percentage) / 100;
}
isInscriptionFeeApplicableForGrade(gradeCategory: GradeCategory, config: PaymentConfiguration): boolean {
  if (!config?.inscriptionFee?.enabled) return false;
  
  if (gradeCategory === 'maternelle' || gradeCategory === 'primaire') {
    return config.inscriptionFee.prices.maternelleAndPrimaire > 0;
  }
  
  if (gradeCategory === 'secondaire') {
    return config.inscriptionFee.prices.collegeAndLycee > 0;
  }
  
  return false;
}

// ✅ NEW: Helper method to get inscription fee amount for grade category
getInscriptionFeeForGradeCategory(gradeCategory: GradeCategory, config: PaymentConfiguration): number {
  if (!config?.inscriptionFee?.enabled) return 0;
  
  if (gradeCategory === 'maternelle' || gradeCategory === 'primaire') {
    return config.inscriptionFee.prices.maternelleAndPrimaire || 0;
  }
  
  if (gradeCategory === 'secondaire') {
    return config.inscriptionFee.prices.collegeAndLycee || 0;
  }
  
  return 0;
}

getPaymentAnalytics(filters?: AnalyticsFilters): Observable<{
  academicYear: string;
  filters: any;
  totalStudents: number;
  analytics: PaymentAnalytics;
}> {
  const params = this.buildParams(filters || {});
  return this.http.get<{
    academicYear: string;
    filters: any;
    totalStudents: number;
    analytics: PaymentAnalytics;
  }>(
    `${this.apiUrl}${this.endpoint}/analytics`,
    { params }
  );
}

/**
 * Get financial summary dashboard
 */
getFinancialSummary(academicYear?: string): Observable<FinancialSummaryResponse> {
  const params = academicYear ? this.buildParams({ academicYear }) : undefined;
  return this.http.get<FinancialSummaryResponse>(
    `${this.apiUrl}${this.endpoint}/financial-summary`,
    { params }
  );
}

/**
 * Get enhanced payment reports with better filtering
 */
getEnhancedPaymentReports(filters?: {
  academicYear?: string;
  reportType?: 'detailed' | 'summary' | 'financial' | 'outstanding';
  gradeCategory?: GradeCategory;
  grade?: Grade;
  component?: 'all' | 'tuition' | 'uniform' | 'transportation' | 'inscription';
  paymentStatus?: string;
  includeDiscounts?: boolean;
  format?: 'json' | 'csv';
}): Observable<EnhancedReportResponse> {
  const params = this.buildParams(filters || {});
  return this.http.get<EnhancedReportResponse>(
    `${this.apiUrl}${this.endpoint}/reports/enhanced`,
    { params }
  );
}

// ✅ UTILITY: Analytics Helper Methods

/**
 * Calculate collection rate percentage
 */
calculateCollectionRate(collected: number, expected: number): number {
  if (expected === 0) return 0;
  return Math.round((collected / expected) * 100);
}

/**
 * Get analytics color by grade category
 */
getAnalyticsColor(gradeCategory: string, index: number = 0): string {
  const colors = {
    maternelle: ['#E91E63', '#F48FB1', '#FCE4EC'],
    primaire: ['#2196F3', '#64B5F6', '#E3F2FD'],
    secondaire: ['#4CAF50', '#81C784', '#E8F5E9']
  };
  
  const categoryColors = colors[gradeCategory as keyof typeof colors] || ['#666666'];
  return categoryColors[index % categoryColors.length];
}
formatAnalyticsChartData(analytics: PaymentAnalytics): {
  collectionRateChart: ChartData;
  componentBreakdownChart: ChartData;
  gradeCategoryChart: ChartData;
} {
  return {
    collectionRateChart: {
      labels: ['Collecté', 'En attente'],
      datasets: [{
        label: 'Taux de collecte',
        data: [
          parseFloat(analytics.collectionRate.percentage),
          100 - parseFloat(analytics.collectionRate.percentage)
        ],
        backgroundColor: ['#4CAF50', '#FF5722'],
        borderWidth: 0
      }]
    },
    componentBreakdownChart: {
      labels: ['Scolarité', 'Uniforme', 'Transport', 'Inscription'],
      datasets: [{
        label: 'Montants collectés',
        data: [
          analytics.byComponent.tuition.collected,
          analytics.byComponent.uniform.collected,
          analytics.byComponent.transportation.collected,
          analytics.byComponent.inscription.collected
        ],
        backgroundColor: ['#2196F3', '#FF9800', '#4CAF50', '#9C27B0'],
        borderWidth: 0
      }]
    },
    gradeCategoryChart: {
      labels: ['Maternelle', 'Primaire', 'Secondaire'],
      datasets: [{
        label: 'Attendu',
        data: [
          analytics.byGradeCategory.maternelle.expected,
          analytics.byGradeCategory.primaire.expected,
          analytics.byGradeCategory.secondaire.expected
        ],
        backgroundColor: '#E3F2FD',
        borderColor: '#2196F3',
        borderWidth: 1
      }, {
        label: 'Collecté',
        data: [
          analytics.byGradeCategory.maternelle.collected,
          analytics.byGradeCategory.primaire.collected,
          analytics.byGradeCategory.secondaire.collected
        ],
        backgroundColor: '#4CAF50',
        borderColor: '#2E7D32',
        borderWidth: 1
      }]
    }
  };
}


/**
 * Get analytics summary text
 */
getAnalyticsSummary(analytics: PaymentAnalytics): {
  totalStudents: string;
  collectionRate: string;
  outstandingAmount: string;
  discountImpact: string;
} {
  const collectionRate = parseFloat(analytics.collectionRate.percentage);
  const outstandingAmount = this.formatCurrency(analytics.collectionRate.outstanding);
  
  let collectionStatus = 'Excellent';
  if (collectionRate < 50) collectionStatus = 'Critique';
  else if (collectionRate < 70) collectionStatus = 'Faible';
  else if (collectionRate < 85) collectionStatus = 'Moyen';
  else if (collectionRate < 95) collectionStatus = 'Bon';
  
  const discountImpact = analytics.discountAnalysis 
    ? `${analytics.discountAnalysis.totalDiscounts} remises appliquées (${this.formatCurrency(analytics.discountAnalysis.totalDiscountAmount)})`
    : 'Aucune remise appliquée';
  
  return {
    totalStudents: `${analytics.overview.totalStudents} élèves`,
    collectionRate: `${collectionRate}% - ${collectionStatus}`,
    outstandingAmount: `${outstandingAmount} en attente`,
    discountImpact
  };
}

/**
 * Export analytics data to CSV format
 */
exportAnalyticsData(analytics: PaymentAnalytics, filters: AnalyticsFilters): any[] {
  const csvData: any[] = [];
  
  // Grade category summary
  Object.entries(analytics.byGradeCategory).forEach(([category, data]) => {
    csvData.push({
      'Type': 'Catégorie',
      'Nom': this.getGradeCategoryLabel(category as GradeCategory),
      'Nombre d\'élèves': data.count,
      'Montant attendu': data.expected,
      'Montant collecté': data.collected,
      'Montant en attente': data.outstanding,
      'Taux de collecte': `${data.collectionRate}%`,
      'Composant': filters.component || 'Tous'
    });
  });
  
  // Grade level summary
  Object.entries(analytics.byGrade).forEach(([grade, data]) => {
    csvData.push({
      'Type': 'Niveau',
      'Nom': this.getGradeLabel(grade as Grade),
      'Nombre d\'élèves': data.count,
      'Montant attendu': data.expected,
      'Montant collecté': data.collected,
      'Montant en attente': data.outstanding,
      'Taux de collecte': `${data.collectionRate}%`,
      'Composant': filters.component || 'Tous'
    });
  });
  
  return csvData;
}

/**
 * Get financial health score based on analytics
 */
getFinancialHealthScore(analytics: PaymentAnalytics): {
  score: number;
  level: 'Critique' | 'Faible' | 'Moyen' | 'Bon' | 'Excellent';
  recommendations: string[];
} {
  const collectionRate = parseFloat(analytics.collectionRate.percentage);
  const outstandingRatio = analytics.collectionRate.outstanding / analytics.collectionRate.expected;
  const discountImpact = analytics.discountAnalysis 
    ? analytics.discountAnalysis.totalDiscountAmount / analytics.collectionRate.expected 
    : 0;
  
  // Calculate score (0-100)
  let score = collectionRate;
  
  // Adjust for outstanding ratio
  if (outstandingRatio > 0.3) score -= 10;
  else if (outstandingRatio > 0.2) score -= 5;
  
  // Adjust for discount impact
  if (discountImpact > 0.15) score -= 5;
  else if (discountImpact > 0.1) score -= 2;
  
  // Determine level
  let level: 'Critique' | 'Faible' | 'Moyen' | 'Bon' | 'Excellent';
  if (score >= 95) level = 'Excellent';
  else if (score >= 85) level = 'Bon';
  else if (score >= 70) level = 'Moyen';
  else if (score >= 50) level = 'Faible';
  else level = 'Critique';
  
  // Generate recommendations
  const recommendations: string[] = [];
  
  if (collectionRate < 80) {
    recommendations.push('Améliorer le suivi des paiements en retard');
  }
  
  if (analytics.outstandingAnalysis.studentsWithOutstanding > analytics.overview.totalStudents * 0.3) {
    recommendations.push('Mettre en place un plan de recouvrement');
  }
  
  if (analytics.discountAnalysis && analytics.discountAnalysis.totalDiscounts > analytics.overview.totalStudents * 0.2) {
    recommendations.push('Réviser la politique de remises');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('Maintenir les bonnes pratiques actuelles');
  }
  
  return { score: Math.round(score), level, recommendations };
}

/**
 * Generate trend analysis
 */
analyzeTrends(analytics: PaymentAnalytics): {
  trend: 'Amélioration' | 'Stable' | 'Dégradation';
  insights: string[];
} {
  const trends = analytics.paymentTrends || [];
  
  if (trends.length < 2) {
    return {
      trend: 'Stable',
      insights: ['Données insuffisantes pour analyser les tendances']
    };
  }
  
  const recent = trends[trends.length - 1];
  const previous = trends[trends.length - 2];
  
  const collectionDiff = parseFloat(recent.collectionRate) - parseFloat(previous.collectionRate);
  
  let trend: 'Amélioration' | 'Stable' | 'Dégradation';
  if (collectionDiff > 5) trend = 'Amélioration';
  else if (collectionDiff < -5) trend = 'Dégradation';
  else trend = 'Stable';
  
  const insights: string[] = [];
  
  if (trend === 'Amélioration') {
    insights.push(`Amélioration de ${collectionDiff.toFixed(1)}% du taux de collecte`);
  } else if (trend === 'Dégradation') {
    insights.push(`Baisse de ${Math.abs(collectionDiff).toFixed(1)}% du taux de collecte`);
  } else {
    insights.push('Taux de collecte stable');
  }
  
  return { trend, insights };
}

}