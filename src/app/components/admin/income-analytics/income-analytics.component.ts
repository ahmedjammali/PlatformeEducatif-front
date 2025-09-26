// Income Analytics Component TypeScript

import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { IncomeAnalyticsService, IncomeAnalyticsData, IncomeFilters, FilterOptions } from '../../../services/income-analytics.service';
import { ToasterService } from '../../../services/toaster.service';
import { SchoolService } from '../../../services/school.service';

@Component({
  selector: 'app-income-analytics',
  templateUrl: './income-analytics.component.html',
  styleUrls: ['./income-analytics.component.css']
})
export class IncomeAnalyticsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Data properties
  analyticsData: IncomeAnalyticsData | null = null;
  filterOptions: FilterOptions | null = null;
  schools: any[] = [];
  currentSchool: any = null;

  // Filter properties
  activeFilters: IncomeFilters = {
    grade: '',
    component: '',
    category: '',
    academicYear: '',
    startDate: '',
    endDate: ''
  };

  // UI state
  isLoading = false;
  isExportingExcel = false;
  isExportingPDF = false;
  currentAcademicYear = '2024-2025';

  // Pagination for student view
  currentPage = 1;
  itemsPerPage = 10;

  // Search for student view
  searchTerm = '';

  constructor(
    private incomeAnalyticsService: IncomeAnalyticsService,
    private toasterService: ToasterService,
    private schoolService: SchoolService,
  ) { }

  ngOnInit(): void {
    this.loadSchools();
    this.loadFilterOptions();
    // Analytics will be loaded after filter options are loaded
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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
    this.incomeAnalyticsService.getFilterOptions(this.activeFilters.school)
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

    this.incomeAnalyticsService.getIncomeAnalytics(this.activeFilters)
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
    this.loadAnalytics();
  }

  /**
   * Reset filters
   */
  resetFilters(): void {
    this.activeFilters = {
      school: this.currentSchool?._id,
      academicYear: this.currentAcademicYear,
      grade: '',
      component: '',
      category: '',
      startDate: '',
      endDate: ''
    };
    this.loadAnalytics();
  }

  /**
   * Get filtered student data for pagination and search
   */
  get filteredStudents() {
    if (!this.analyticsData) return [];

    let students = this.analyticsData.studentAnalysis;

    // Apply search filter
    if (this.searchTerm) {
      const searchLower = this.searchTerm.toLowerCase();
      students = students.filter(student =>
        student.nom.toLowerCase().includes(searchLower) ||
        student.email.toLowerCase().includes(searchLower) ||
        student.niveau.toLowerCase().includes(searchLower)
      );
    }

    return students;
  }

  /**
   * Get paginated student data
   */
  get paginatedStudents() {
    const filtered = this.filteredStudents;
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return filtered.slice(startIndex, startIndex + this.itemsPerPage);
  }

  /**
   * Get total pages for pagination
   */
  get totalPages(): number {
    return Math.ceil(this.filteredStudents.length / this.itemsPerPage);
  }

  /**
   * Change page
   */
  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  /**
   * Format currency
   */
  formatCurrency(amount: number): string {
    return this.incomeAnalyticsService.formatCurrency(amount);
  }

  /**
   * Format percentage
   */
  formatPercentage(percentage: number): string {
    return this.incomeAnalyticsService.formatPercentage(percentage);
  }

  /**
   * Get status color
   */
  getStatusColor(status: string): string {
    return this.incomeAnalyticsService.getStatusColor(status);
  }

  /**
   * Get rate color
   */
  getRateColor(rate: number): string {
    return this.incomeAnalyticsService.getRateColor(rate);
  }

  /**
   * Get category display name
   */
  getCategoryDisplayName(category: string): string {
    return this.incomeAnalyticsService.getCategoryDisplayName(category);
  }

  /**
   * Get component analysis as array
   */
  get componentAnalysisArray() {
    if (!this.analyticsData) return [];
    return Object.entries(this.analyticsData.componentAnalysis).map(([key, value]) => ({
      key,
      ...value
    }));
  }

  /**
   * Get category breakdown as array
   */
  get categoryBreakdownArray() {
    if (!this.analyticsData) return [];
    return Object.entries(this.analyticsData.categoryBreakdown).map(([key, value]) => ({
      key,
      name: this.getCategoryDisplayName(key),
      ...value
    }));
  }

  /**
   * Refresh data
   */
  refreshData(): void {
    this.loadAnalytics();
  }

  /**
   * Get progress bar width
   */
  getProgressWidth(collected: number, expected: number): number {
    return expected > 0 ? Math.min((collected / expected) * 100, 100) : 0;
  }

  /**
   * Export analytics to Excel
   */
  exportToExcel(): void {
    this.isExportingExcel = true;

    this.incomeAnalyticsService.exportToExcel(this.activeFilters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob: Blob) => {
          this.isExportingExcel = false;
          const filename = `analyse_revenus_${new Date().toISOString().split('T')[0]}.xlsx`;
          this.incomeAnalyticsService.downloadFile(blob, filename);
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

    this.incomeAnalyticsService.exportToPDF(this.activeFilters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob: Blob) => {
          this.isExportingPDF = false;
          const filename = `analyse_revenus_${new Date().toISOString().split('T')[0]}.pdf`;
          this.incomeAnalyticsService.downloadFile(blob, filename);
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
