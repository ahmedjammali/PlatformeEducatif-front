import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Subject, combineLatest } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { PaymentService } from '../../../services/payment.service';
import {
  PaymentDashboard,
  PaymentAnalytics,
  FinancialSummaryResponse,
  AnalyticsFilters,
  GradeCategory,
  Grade,
  ChartData
} from '../../../models/payment.model';

@Component({
  selector: 'app-financial-overview',
  templateUrl: './financial-overview.component.html',
  styleUrls: ['./financial-overview.component.css']
})
export class FinancialOverviewComponent implements OnInit, OnDestroy {
  @ViewChild('printSection', { static: false }) printSection!: ElementRef;

  // Core data
  academicYear: string = '';
  dashboard: PaymentDashboard | null = null;
  analytics: PaymentAnalytics | null = null;
  financialSummary: FinancialSummaryResponse | null = null;
  enhancedReport: any | null = null; // Added back enhancedReport

  // Loading states
  isLoading = false;
  isAnalyticsLoading = false;

  // Filter form and options
  filterForm!: FormGroup;
  availableGrades: { categorizedGrades: any } | null = null;

  // Chart data
  chartData: {
    collectionRateChart: ChartData;
    componentBreakdownChart: ChartData;
    gradeCategoryChart: ChartData;
  } | null = null;

  // UI state - Single income tab only
  activeTab: 'overview' = 'overview';

  private destroy$ = new Subject<void>();

  constructor(
    private paymentService: PaymentService,
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder
  ) {
    this.initializeFilterForm();
  }

  ngOnInit(): void {
    this.loadAvailableGrades();

    // Get academic year from query params
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.academicYear = params['academicYear'] || this.paymentService.getCurrentAcademicYear();
      this.updateFilterForm(params);
      this.loadAllData();
    });

    // Set up filter form value changes
    this.setupFilterSubscription();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeFilterForm(): void {
    this.filterForm = this.fb.group({
      academicYear: [this.academicYear],
      gradeCategory: [''],
      grade: [''],
      component: ['all'],
      paymentStatus: ['']
    });
  }

  private updateFilterForm(params: any): void {
    this.filterForm.patchValue({
      academicYear: params['academicYear'] || this.academicYear,
      gradeCategory: params['gradeCategory'] || '',
      grade: params['grade'] || '',
      component: params['component'] || 'all',
      paymentStatus: params['paymentStatus'] || ''
    }, { emitEvent: false });
  }

  private setupFilterSubscription(): void {
    this.filterForm.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.applyFilters();
    });
  }

  private loadAvailableGrades(): void {
    this.paymentService.getAvailableGrades()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (grades) => {
          this.availableGrades = grades;
        },
        error: (error) => {
          console.error('Error loading available grades:', error);
        }
      });
  }

  private loadAllData(): void {
    this.isLoading = true;

    const filters = this.getAnalyticsFilters();

    // Load all data in parallel
    combineLatest([
      this.paymentService.getPaymentDashboard(this.academicYear),
      this.paymentService.getPaymentAnalytics(filters),
      this.paymentService.getFinancialSummary(this.academicYear)
    ]).pipe(takeUntil(this.destroy$)).subscribe({
      next: ([dashboard, analyticsResponse, financial]) => {
        this.dashboard = dashboard;
        this.analytics = analyticsResponse.analytics;
        this.financialSummary = financial;

        // Generate chart data
        if (this.analytics) {
          this.chartData = this.paymentService.formatAnalyticsChartData(this.analytics);
        }

        // Load enhanced report since everything is in one tab now
        this.loadEnhancedReport();

        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading financial data:', error);
        this.isLoading = false;
      }
    });
  }

  private getAnalyticsFilters(): AnalyticsFilters {
    const formValue = this.filterForm.value;
    return {
      academicYear: formValue.academicYear || this.academicYear,
      gradeCategory: formValue.gradeCategory || undefined,
      grade: formValue.grade || undefined,
      component: formValue.component === 'all' ? undefined : formValue.component,
      paymentStatus: formValue.paymentStatus || undefined,
      includeDiscounts: true
    };
  }

  // Filter and navigation methods
  applyFilters(): void {
    if (this.isLoading) return;

    const filters = this.getAnalyticsFilters();
    this.isAnalyticsLoading = true;

    // Update URL with filter params
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        ...this.filterForm.value,
        academicYear: this.academicYear
      },
      queryParamsHandling: 'merge'
    });

    // Reload analytics data
    this.paymentService.getPaymentAnalytics(filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.analytics = response.analytics;
          if (this.analytics) {
            this.chartData = this.paymentService.formatAnalyticsChartData(this.analytics);
          }

          // Load enhanced report since everything is in one tab now
          this.loadEnhancedReport();

          this.isAnalyticsLoading = false;
        },
        error: (error) => {
          console.error('Error applying filters:', error);
          this.isAnalyticsLoading = false;
        }
      });
  }

  clearFilters(): void {
    this.filterForm.patchValue({
      gradeCategory: '',
      grade: '',
      component: 'all',
      paymentStatus: ''
    });

    // Clear enhanced report when filters are cleared
    this.enhancedReport = null;
  }

  onGradeCategoryChange(): void {
    // Clear grade selection when category changes
    this.filterForm.patchValue({ grade: '' });
  }

  // Tab management is no longer needed since everything is in one tab
  // Removed setActiveTab method

  private loadEnhancedReport(): void {
    const filters = {
      ...this.getAnalyticsFilters(),
      reportType: 'detailed' as 'detailed'
    };

    this.paymentService.getEnhancedPaymentReports(filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (report) => {
          this.enhancedReport = report;
        },
        error: (error) => {
          console.error('Error loading enhanced report:', error);
        }
      });
  }

  // Data refresh
  refreshData(): void {
    this.loadAllData();
  }

  refreshAnalytics(): void {
    const filters = this.getAnalyticsFilters();
    this.isAnalyticsLoading = true;

    this.paymentService.getPaymentAnalytics(filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.analytics = response.analytics;
          if (this.analytics) {
            this.chartData = this.paymentService.formatAnalyticsChartData(this.analytics);
          }

          // Reload enhanced report since everything is in one tab now
          this.loadEnhancedReport();

          this.isAnalyticsLoading = false;
        },
        error: (error) => {
          console.error('Error refreshing analytics:', error);
          this.isAnalyticsLoading = false;
        }
      });
  }

  // Navigation methods
  goBack(): void {
    this.router.navigate(['../'], { relativeTo: this.route });
  }

  navigateToPaymentManagement(): void {
    this.router.navigate(['../'], {
      relativeTo: this.route,
      queryParams: { academicYear: this.academicYear }
    });
  }

  navigateToFilteredView(filters: any): void {
    this.router.navigate(['../'], {
      relativeTo: this.route,
      queryParams: {
        academicYear: this.academicYear,
        ...filters
      }
    });
  }

  // Print method
  printFinancialOverview(): void {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const htmlContent = this.generatePrintableContent();
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.print();
    }
  }

  // Utility methods with proper null checking
  formatCurrency(amount: number): string {
    return this.paymentService.formatCurrency(amount);
  }

  getCollectionRateNumber(rateString: string): number {
    if (!rateString) return 0;
    return parseFloat(rateString) || 0;
  }

  getCollectionRateClass(rateString: string): string {
    const rate = this.getCollectionRateNumber(rateString);
    if (rate >= 90) return 'excellent';
    if (rate >= 75) return 'good';
    if (rate >= 50) return 'average';
    return 'poor';
  }

  getGradeCategoryLabel(gradeCategory: GradeCategory | string): string {
    return this.paymentService.getGradeCategoryLabel(gradeCategory as GradeCategory);
  }

  getGradeLabel(grade: Grade | string): string {
    return this.paymentService.getGradeLabel(grade as Grade);
  }

  getCurrentDate(): string {
    return new Date().toLocaleDateString('fr-TN');
  }

  getCurrentTime(): string {
    return new Date().toLocaleTimeString('fr-TN');
  }

  roundNumber(value: number): number {
    return Math.round(value);
  }

  parseFloat(value: string): number {
    return parseFloat(value);
  }

  // Safe parseFloat for templates
  safeParseFloat(value: string | undefined): number {
    if (!value) return 0;
    return parseFloat(value) || 0;
  }

  // Data validation
  hasValidData(): boolean {
    return !!(this.dashboard && this.analytics);
  }

  hasEnhancedReportData(): boolean {
    return !!(this.enhancedReport && this.enhancedReport.report && this.enhancedReport.report.data && this.enhancedReport.report.data.length > 0);
  }

  // Check if there are active filters applied
  hasActiveFilters(): boolean {
    const formValue = this.filterForm.value;
    return !!(
      formValue.gradeCategory ||
      formValue.grade ||
      (formValue.component && formValue.component !== 'all') ||
      formValue.paymentStatus
    );
  }

  // Helper methods for labels
  getComponentLabel(component: string): string {
    const labels: { [key: string]: string } = {
      'tuition': 'Frais scolaires',
      'uniform': 'Uniforme',
      'transportation': 'Transport',
      'inscription': 'Frais d\'inscription'
    };
    return labels[component] || component;
  }

  getPaymentStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      'pending': 'En attente',
      'partial': 'Partiel',
      'completed': 'Terminé',
      'overdue': 'En retard'
    };
    return labels[status] || status;
  }

  getStatusLabel(status: string): string {
    return this.getPaymentStatusLabel(status);
  }

  // Filter options getters - Fixed to show current selection
  getGradeCategoryOptions(): { value: string; label: string }[] {
    return [
      { value: '', label: 'Toutes les catégories' },
      { value: 'maternelle', label: 'Maternelle' },
      { value: 'primaire', label: 'Primaire' },
      { value: 'secondaire', label: 'Secondaire' }
    ];
  }

  getGradeOptionsForCategory(): { value: string; label: string }[] {
    const category = this.filterForm.value.gradeCategory;
    if (!category || !this.availableGrades) {
      return [];
    }

    const grades = this.availableGrades.categorizedGrades[category] || [];
    return grades.map((grade: Grade) => ({
      value: grade,
      label: this.getGradeLabel(grade)
    }));
  }

  // Advanced analytics methods
  getComponentAnalytics(component: 'tuition' | 'uniform' | 'transportation' | 'inscription'): any {
    if (!this.analytics) return null;
    return this.analytics.byComponent[component];
  }

  getGradeCategoryAnalytics(category: GradeCategory): any {
    if (!this.analytics) return null;
    return this.analytics.byGradeCategory[category];
  }

  // Chart helper methods
  getChartData(chartType: 'collectionRate' | 'componentBreakdown' | 'gradeCategory'): ChartData | null {
    if (!this.chartData) return null;

    switch (chartType) {
      case 'collectionRate':
        return this.chartData.collectionRateChart;
      case 'componentBreakdown':
        return this.chartData.componentBreakdownChart;
      case 'gradeCategory':
        return this.chartData.gradeCategoryChart;
      default:
        return null;
    }
  }

  // Quick action methods
  navigateToComponent(component: string): void {
    this.navigateToFilteredView({ component });
  }

  navigateToGradeCategory(gradeCategory: string): void {
    this.navigateToFilteredView({ gradeCategory });
  }

  navigateToPaymentStatus(paymentStatus: string): void {
    this.navigateToFilteredView({ paymentStatus });
  }

  // Safe methods for template calculations to avoid TypeScript errors

  // For Error on line 617 - Safe parseFloat for collection rate
  getCollectionRatePercentage(): number {
    const percentage = this.analytics?.collectionRate?.percentage;
    if (!percentage) return 0;
    return parseFloat(percentage) || 0;
  }

  getRemainingCollectionPercentage(): number {
    return 100 - this.getCollectionRatePercentage();
  }

  // For component width calculations
  getComponentProgressWidth(component: 'tuition' | 'uniform' | 'transportation' | 'inscription'): number {
    if (!this.analytics?.byComponent) return 0;

    const componentData = this.analytics.byComponent[component];
    if (!componentData || !componentData.expected || componentData.expected === 0) {
      return 0;
    }

    return (componentData.collected / componentData.expected) * 100;
  }

  // For grade category width calculations
  getGradeCategoryProgressWidth(category: 'maternelle' | 'primaire' | 'secondaire'): number {
    if (!this.analytics?.byGradeCategory) return 0;

    const categoryData = this.analytics.byGradeCategory[category];
    if (!categoryData || !categoryData.expected || categoryData.expected === 0) {
      return 0;
    }

    return (categoryData.collected / categoryData.expected) * 100;
  }

  // Print content generator
  private generatePrintableContent(): string {
    if (!this.dashboard || !this.analytics) return '';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Rapport Financier Complet - ${this.academicYear}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 20px;
            line-height: 1.4;
            color: #333;
          }
          .header {
            text-align: center;
            border-bottom: 3px solid #4A628A;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          h1 {
            color: #4A628A;
            margin: 0;
            font-size: 24px;
          }
          .section {
            margin-bottom: 25px;
            page-break-inside: avoid;
          }
          .section-title {
            color: #4A628A;
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 15px;
            border-bottom: 1px solid #ddd;
            padding-bottom: 5px;
          }
          .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin: 20px 0;
          }
          .card {
            border: 1px solid #ddd;
            padding: 15px;
            border-radius: 8px;
            background: #f9f9f9;
          }
          .metric {
            font-size: 1.2em;
            font-weight: bold;
            color: #2c5aa0;
          }
          .excellent { color: #4CAF50; }
          .good { color: #2196F3; }
          .average { color: #FF9800; }
          .poor { color: #F44336; }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
          }
          th {
            background-color: #f2f2f2;
            font-weight: bold;
          }
          @media print {
            body { margin: 15px; }
            .section { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Rapport Financier et d'Analyse Complet</h1>
          <div>Année académique ${this.academicYear}</div>
          <div>Généré le ${this.getCurrentDate()} à ${this.getCurrentTime()}</div>
        </div>

        <div class="section">
          <div class="section-title">Résumé Exécutif</div>
          <div class="grid">
            <div class="card">
              <h4>Total Étudiants</h4>
              <div class="metric">${this.analytics?.overview?.totalStudents || 0}</div>
            </div>
            <div class="card">
              <h4>Taux de Collecte</h4>
              <div class="metric ${this.getCollectionRateClass(this.analytics?.collectionRate?.percentage || '0')}">${this.analytics?.collectionRate?.percentage || '0'}%</div>
            </div>
            <div class="card">
              <h4>Revenus Collectés</h4>
              <div class="metric">${this.formatCurrency(this.analytics?.overview?.totalCollected || 0)}</div>
            </div>
            <div class="card">
              <h4>Montant en Attente</h4>
              <div class="metric">${this.formatCurrency(this.analytics?.overview?.totalOutstanding || 0)}</div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Analyse par Composant</div>
          <table>
            <tr>
              <th>Composant</th>
              <th>Attendu</th>
              <th>Collecté</th>
              <th>Nombre d'étudiants</th>
            </tr>
            <tr>
              <td>Frais scolaires</td>
              <td>${this.formatCurrency(this.analytics?.byComponent?.tuition?.expected || 0)}</td>
              <td>${this.formatCurrency(this.analytics?.byComponent?.tuition?.collected || 0)}</td>
              <td>${this.analytics?.byComponent?.tuition?.studentsCount || 0}</td>
            </tr>
            <tr>
              <td>Uniforme</td>
              <td>${this.formatCurrency(this.analytics?.byComponent?.uniform?.expected || 0)}</td>
              <td>${this.formatCurrency(this.analytics?.byComponent?.uniform?.collected || 0)}</td>
              <td>${this.analytics?.byComponent?.uniform?.studentsCount || 0}</td>
            </tr>
            <tr>
              <td>Transport</td>
              <td>${this.formatCurrency(this.analytics?.byComponent?.transportation?.expected || 0)}</td>
              <td>${this.formatCurrency(this.analytics?.byComponent?.transportation?.collected || 0)}</td>
              <td>${this.analytics?.byComponent?.transportation?.studentsCount || 0}</td>
            </tr>
            <tr>
              <td>Inscription</td>
              <td>${this.formatCurrency(this.analytics?.byComponent?.inscription?.expected || 0)}</td>
              <td>${this.formatCurrency(this.analytics?.byComponent?.inscription?.collected || 0)}</td>
              <td>${this.analytics?.byComponent?.inscription?.studentsCount || 0}</td>
            </tr>
          </table>
        </div>

        <div class="section">
          <div class="section-title">Analyse par Catégorie de Niveau</div>
          <table>
            <tr>
              <th>Catégorie</th>
              <th>Étudiants</th>
              <th>Collecté</th>
              <th>Taux de Collecte</th>
            </tr>
            <tr>
              <td>Maternelle</td>
              <td>${this.analytics?.byGradeCategory?.maternelle?.count || 0}</td>
              <td>${this.formatCurrency(this.analytics?.byGradeCategory?.maternelle?.collected || 0)}</td>
              <td>${this.analytics?.byGradeCategory?.maternelle?.collectionRate || '0%'}</td>
            </tr>
            <tr>
              <td>Primaire</td>
              <td>${this.analytics?.byGradeCategory?.primaire?.count || 0}</td>
              <td>${this.formatCurrency(this.analytics?.byGradeCategory?.primaire?.collected || 0)}</td>
              <td>${this.analytics?.byGradeCategory?.primaire?.collectionRate || '0%'}</td>
            </tr>
            <tr>
              <td>Secondaire</td>
              <td>${this.analytics?.byGradeCategory?.secondaire?.count || 0}</td>
              <td>${this.formatCurrency(this.analytics?.byGradeCategory?.secondaire?.collected || 0)}</td>
              <td>${this.analytics?.byGradeCategory?.secondaire?.collectionRate || '0%'}</td>
            </tr>
          </table>
        </div>
      </body>
      </html>
    `;
  }
}
