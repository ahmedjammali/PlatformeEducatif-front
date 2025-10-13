// Outcome Analytics Component TypeScript - Modifications pour Caissier

import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { OutcomeAnalyticsService, OutcomeAnalyticsData, OutcomeFilters, OutcomeFilterOptions } from '../../../services/outcome-analytics.service';
import { ToasterService } from '../../../services/toaster.service';
import { SchoolService } from '../../../services/school.service';
import { AuthService } from '../../../services/auth.service'; // ✅ AJOUT

@Component({
  selector: 'app-outcome-analytics',
  templateUrl: './outcome-analytics.component.html',
  styleUrls: ['./outcome-analytics.component.css']
})
export class OutcomeAnalyticsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Data properties
  analyticsData: OutcomeAnalyticsData | null = null;
  filterOptions: OutcomeFilterOptions | null = null;
  schools: any[] = [];
  currentSchool: any = null;

 // Add this inside the component class
  months = [
    { value: '01', label: 'Janvier' },
    { value: '02', label: 'Février' },
    { value: '03', label: 'Mars' },
    { value: '04', label: 'Avril' },
    { value: '05', label: 'Mai' },
    { value: '06', label: 'Juin' },
    { value: '07', label: 'Juillet' },
    { value: '08', label: 'Août' },
    { value: '09', label: 'Septembre' },
    { value: '10', label: 'Octobre' },
    { value: '11', label: 'Novembre' },
    { value: '12', label: 'Décembre' }
  ];
  // ✅ AJOUT - Propriété pour vérifier si l'utilisateur est caissier
  isCaissier = false;

  // Filter properties
  activeFilters: OutcomeFilters = {
    chargeCategory: '',
    userRole: '',
    academicYear: '',
    startDate: '',
    endDate: ''  
  };

  // UI state
  isLoading = false;
  isExportingExcel = false;
  isExportingPDF = false;
  currentAcademicYear = '2024-2025';

  // Pagination for detailed views
  currentChargesPage = 1;
  currentSalariesPage = 1;
  itemsPerPage = 10;

  // Search terms
  chargeSearchTerm = '';
  salarySearchTerm = '';

  constructor(
    private outcomeAnalyticsService: OutcomeAnalyticsService,
    private toasterService: ToasterService,
    private schoolService: SchoolService,
    private authService: AuthService // ✅ AJOUT
  ) { }

  ngOnInit(): void {
    // ✅ AJOUT - Vérifier si l'utilisateur est caissier
    this.isCaissier = this.authService.getCurrentUser()?.role === 'caissier';
    
    // ✅ AJOUT - Si caissier, définir les dates sur aujourd'hui
    if (this.isCaissier) {
      const today = this.getTodayDate();
      this.activeFilters.startDate = today;
      this.activeFilters.endDate = today;
    }

    this.loadSchools();
    this.loadFilterOptions();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Called when user selects a month
  onMonthChange(event: any) {
    const selectedMonth = this.activeFilters.month;
    if (selectedMonth) {
      const currentYear = new Date().getFullYear();
    // Premier jour du mois choisi
    let start = new Date(currentYear, parseInt(selectedMonth) - 1, 1);
    start.setDate(start.getDate() + 1);

    // Dernier jour du mois choisi
    let end = new Date(currentYear, parseInt(selectedMonth), 0);
    end.setDate(end.getDate() + 1);

      this.activeFilters.startDate = start.toISOString().split('T')[0];
      this.activeFilters.endDate = end.toISOString().split('T')[0];
    } else {
      this.activeFilters.startDate = '';
      this.activeFilters.endDate = '';
    }

    this.applyFilters(); // Recharger les données
  }
  // ✅ AJOUT - Nouvelle méthode pour obtenir la date d'aujourd'hui au format YYYY-MM-DD
  private getTodayDate(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Load available schools
   */
  loadSchools(): void {
    this.schoolService.getSchool()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          if (response.school) {
            this.schools = [response.school];
            this.currentSchool = response.school;
            this.activeFilters.school = this.currentSchool._id;
          }
        },
        error: (error: any) => {
          console.error('Error loading schools:', error);
          this.toasterService.error('Erreur lors du chargement des écoles');
        }
      });
  }

  /**
   * Load filter options
   */
  loadFilterOptions(): void {
    this.outcomeAnalyticsService.getFilterOptions(this.activeFilters.school)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.filterOptions = response.data;
            // Set default academic year
            if (this.filterOptions.academicYears.length > 0) {
              this.activeFilters.academicYear = this.filterOptions.academicYears[0];
              this.currentAcademicYear = this.filterOptions.academicYears[0];
              // Load analytics after setting default filters
              this.loadAnalytics();
            }
          }
        },
        error: (error) => {
          console.error('Error loading filter options:', error);
          this.toasterService.error('Erreur lors du chargement des options de filtre');
        }
      });
  }

  /**
   * Load analytics data
   */
  loadAnalytics(): void {
    this.isLoading = true;

    this.outcomeAnalyticsService.getOutcomeAnalytics(this.activeFilters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.isLoading = false;
          if (response.success) {
            this.analyticsData = response.data;
          } else {
            this.toasterService.error('Erreur lors du chargement des données');
          }
        },
        error: (error) => {
          this.isLoading = false;
          console.error('Error loading analytics:', error);
          this.toasterService.error('Erreur lors du chargement des analyses');
        }
      });
  }

  /**
   * Apply filters
   */
  applyFilters(): void {
    // ✅ AJOUT - Si caissier, maintenir les dates du jour
    if (this.isCaissier) {
      const today = this.getTodayDate();
      this.activeFilters.startDate = today;
      this.activeFilters.endDate = today;
    }
    this.loadAnalytics();
  }

  /**
   * Reset filters
   */
  resetFilters(): void {
    this.activeFilters = {
      school: this.currentSchool?._id,
      academicYear: this.currentAcademicYear,
      chargeCategory: '',
      userRole: '',
      startDate: this.isCaissier ? this.getTodayDate() : '', // ✅ AJOUT
      endDate: this.isCaissier ? this.getTodayDate() : ''    // ✅ AJOUT
    };
    this.loadAnalytics();
  }

  /**
   * Refresh data
   */
  refreshData(): void {
    this.loadFilterOptions();
    this.loadAnalytics();
  }

  // ... Le reste du code reste identique ...

  /**
   * Get filtered charges for pagination and search
   */
  get filteredCharges() {
    if (!this.analyticsData) return [];

    let charges = this.analyticsData.charges;

    // Apply search filter
    if (this.chargeSearchTerm) {
      const searchLower = this.chargeSearchTerm.toLowerCase();
      charges = charges.filter(charge =>
        charge.categorie.toLowerCase().includes(searchLower) ||
        charge.description.toLowerCase().includes(searchLower)
      );
    }

    return charges;
  }

  /**
   * Get paginated charges data
   */
  get paginatedCharges() {
    const filtered = this.filteredCharges;
    const startIndex = (this.currentChargesPage - 1) * this.itemsPerPage;
    return filtered.slice(startIndex, startIndex + this.itemsPerPage);
  }

  /**
   * Get filtered salaries for pagination and search
   */
  get filteredSalaries() {
    if (!this.analyticsData) return [];

    let salaries = this.analyticsData.salaries;

    // Apply search filter
    if (this.salarySearchTerm) {
      const searchLower = this.salarySearchTerm.toLowerCase();
      salaries = salaries.filter(salary =>
        salary.user?.name?.toLowerCase().includes(searchLower) ||
        salary.user?.email?.toLowerCase().includes(searchLower)
      );
    }

    return salaries;
  }

  /**
   * Get paginated salaries data
   */
  get paginatedSalaries() {
    const filtered = this.filteredSalaries;
    const startIndex = (this.currentSalariesPage - 1) * this.itemsPerPage;
    return filtered.slice(startIndex, startIndex + this.itemsPerPage);
  }

  /**
   * Get total pages for charges pagination
   */
  get totalChargesPages(): number {
    return Math.ceil(this.filteredCharges.length / this.itemsPerPage);
  }

  /**
   * Get total pages for salaries pagination
   */
  get totalSalariesPages(): number {
    return Math.ceil(this.filteredSalaries.length / this.itemsPerPage);
  }

  /**
   * Change charges page
   */
  changeChargesPage(page: number): void {
    if (page >= 1 && page <= this.totalChargesPages) {
      this.currentChargesPage = page;
    }
  }

  /**
   * Change salaries page
   */
  changeSalariesPage(page: number): void {
    if (page >= 1 && page <= this.totalSalariesPages) {
      this.currentSalariesPage = page;
    }
  }

  /**
   * Format currency
   */
  formatCurrency(amount: number | undefined): string {
    if (amount === undefined || amount === null) return '0,000 TND';
    return new Intl.NumberFormat('fr-TN', {
      style: 'currency',
      currency: 'TND',
      minimumFractionDigits: 3
    }).format(amount);
  }

  /**
   * Format percentage
   */
  formatPercentage(value: number): string {
    return `${value.toFixed(1)}%`;
  }

  /**
   * Format date
   */
  formatDate(date: string | Date): string {
    return new Date(date).toLocaleDateString('fr-FR');
  }

  /**
   * Get role display name
   */
  getRoleDisplayName(role: string | undefined): string {
    if (!role) return 'N/A';
    const roleMap: { [key: string]: string } = {
      'teacher': 'Enseignant',
      'admin': 'Administrateur',
      'superadmin': 'Super Administrateur'
    };
    return roleMap[role] || role;
  }

  /**
   * Get payment type display name
   */
  getPaymentTypeDisplayName(type: string | undefined): string {
    if (!type) return 'N/A';
    const typeMap: { [key: string]: string } = {
      'monthly': 'Mensuel',
      'hourly': 'Horaire'
    };
    return typeMap[type] || type;
  }

  /**
   * Get total expected amount for salary
   */
  getTotalExpected(salary: any): number {
    if (!salary.paymentSchedule) return 0;
    return salary.paymentSchedule.reduce((sum: number, payment: any) => sum + (payment.totalAmount || 0), 0);
  }

  /**
   * Get total paid amount for salary
   */
  getTotalPaid(salary: any): number {
    if (!salary.paymentSchedule) return 0;
    return salary.paymentSchedule.reduce((sum: number, payment: any) => {
      return sum + (payment.paymentStatus === 'paid' || payment.paymentStatus === 'partial' ? (payment.paidAmount || 0) : 0);
    }, 0);
  }

  /**
   * Get total pending amount for salary
   */
  getTotalPending(salary: any): number {
    if (!salary.paymentSchedule) return 0;
    return salary.paymentSchedule.reduce((sum: number, payment: any) => {
      return sum + (payment.paymentStatus !== 'paid' ? (payment.totalAmount - (payment.paidAmount || 0)) : 0);
    }, 0);
  }

  /**
   * Get payment status for salary
   */
  getPaymentStatus(salary: any): string {
    const totalExpected = this.getTotalExpected(salary);
    const totalPaid = this.getTotalPaid(salary);

    if (totalExpected === 0) return 'Aucun paiement';
    if (totalPaid === 0) return 'Non payé';
    if (totalPaid === totalExpected) return 'Complet';
    return 'Partiel';
  }

  /**
   * Get payment status CSS class
   */
  getPaymentStatusClass(salary: any): string {
    const status = this.getPaymentStatus(salary);
    switch (status) {
      case 'Complet': return 'status-complete';
      case 'Partiel': return 'status-partial';
      case 'Non payé': return 'status-unpaid';
      default: return 'status-none';
    }
  }

  /**
   * Get month name from number
   */
  getMonthName(month: number): string {
    const months = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];
    return months[month - 1] || `Mois ${month}`;
  }

  /**
   * Get category analysis array for template iteration
   */
  get chargeAnalysisArray() {
    if (!this.analyticsData?.chargeAnalysis) return [];
    return this.analyticsData.chargeAnalysis;
  }

  /**
   * Get salary analysis array for template iteration
   */
  get salaryAnalysisArray() {
    if (!this.analyticsData?.salaryAnalysis) return [];
    return this.analyticsData.salaryAnalysis;
  }

  /**
   * Export analytics to Excel
   */
  exportToExcel(): void {
    this.isExportingExcel = true;

    this.outcomeAnalyticsService.exportToExcel(this.activeFilters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob: Blob) => {
          this.isExportingExcel = false;
          const filename = `analyse_depenses_${new Date().toISOString().split('T')[0]}.xlsx`;
          this.outcomeAnalyticsService.downloadFile(blob, filename);
          this.toasterService.success('Export Excel terminé avec succès');
        },
        error: (error: any) => {
          this.isExportingExcel = false;
          console.error('Error exporting to Excel:', error);
          this.toasterService.error('Erreur lors de l\'export Excel');
        }
      });
  }

  /**
   * Export analytics to PDF
   */
  exportToPDF(): void {
    this.isExportingPDF = true;

    this.outcomeAnalyticsService.exportToPDF(this.activeFilters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob: Blob) => {
          this.isExportingPDF = false;
          const filename = `analyse_depenses_${new Date().toISOString().split('T')[0]}.pdf`;
          this.outcomeAnalyticsService.downloadFile(blob, filename);
          this.toasterService.success('Export PDF terminé avec succès');
        },
        error: (error: any) => {
          this.isExportingPDF = false;
          console.error('Error exporting to PDF:', error);
          this.toasterService.error('Erreur lors de l\'export PDF');
        }
      });
  }
}