// Combined Export Component TypeScript - Modifications pour Caissier

import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ExportService, CombinedExportFilters } from '../../../services/export.service';
import { IncomeAnalyticsService, FilterOptions } from '../../../services/income-analytics.service';
import { OutcomeAnalyticsService, OutcomeFilterOptions } from '../../../services/outcome-analytics.service';
import { ToasterService } from '../../../services/toaster.service';
import { AuthService } from '../../../services/auth.service'; // ✅ AJOUT

@Component({
  selector: 'app-combined-export',
  templateUrl: './combined-export.component.html',
  styleUrls: ['./combined-export.component.css']
})
export class CombinedExportComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Data properties
  incomeFilterOptions: FilterOptions | null = null;
  outcomeFilterOptions: OutcomeFilterOptions | null = null;
  schools: any[] = [];
  currentSchool: any = null;

  // ✅ AJOUT - Propriété pour vérifier si l'utilisateur est caissier
  isCaissier = false;

  // Filter properties
  activeFilters: CombinedExportFilters = {
    academicYear: '',
    startDate: '',
    endDate: '',
    grade: '',
    component: '',
    category: '',
    userRole: '',
    chargeCategory: '',
    month: '' // ✅ AJOUT
  };

  // UI state
  isLoading = false;
  currentAcademicYear = '2024-2025';

  // Component options
  components = [
    { value: '', label: 'Tous les composants' },
    { value: 'frais_scolaires', label: 'Frais Scolaires' },
    { value: 'frais_inscription', label: 'Frais d\'Inscription' },
    { value: 'uniforme', label: 'Uniforme' },
    { value: 'transport', label: 'Transport' }
  ];

  categories = [
    { value: '', label: 'Toutes les catégories' },
    { value: 'maternelle', label: 'Maternelle' },
    { value: 'primaire', label: 'Primaire' },
    { value: 'secondaire', label: 'Secondaire' }
  ];

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
  constructor(
    private exportService: ExportService,
    private incomeAnalyticsService: IncomeAnalyticsService,
    private outcomeAnalyticsService: OutcomeAnalyticsService,
    private toasterService: ToasterService,
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

    this.loadFilterOptions(); // Recharger les données
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
   * Load filter options for both income and outcome
   */
  loadFilterOptions(): void {
    // Load income filter options
    this.incomeAnalyticsService.getFilterOptions(this.activeFilters.schoolId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.incomeFilterOptions = response.data;
            // Set default academic year
            if (this.incomeFilterOptions.academicYears.length > 0) {
              this.activeFilters.academicYear = this.incomeFilterOptions.academicYears[0];
              this.currentAcademicYear = this.incomeFilterOptions.academicYears[0];
            }
          }
        },
        error: (error: any) => {
          console.error('Error loading income filter options:', error);
          this.toasterService.error('Erreur lors du chargement des options de filtre (revenus)');
        }
      });

    // Load outcome filter options
    this.outcomeAnalyticsService.getFilterOptions(this.activeFilters.schoolId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.outcomeFilterOptions = response.data;
          }
        },
        error: (error: any) => {
          console.error('Error loading outcome filter options:', error);
          this.toasterService.error('Erreur lors du chargement des options de filtre (dépenses)');
        }
      });
  }

  /**
   * Clear all filters
   */
  clearFilters(): void {
    this.activeFilters = {
      academicYear: this.currentAcademicYear,
      startDate: this.isCaissier ? this.getTodayDate() : '', // ✅ AJOUT
      endDate: this.isCaissier ? this.getTodayDate() : '',   // ✅ AJOUT
      grade: '',
      component: '',
      category: '',
      userRole: '',
      chargeCategory: ''
    };
  }

  /**
   * Export combined analytics to Excel
   */
  exportToExcel(): void {
    console.log('exportToExcel called');
    console.log('activeFilters:', this.activeFilters);

    // ✅ AJOUT - Assurer que les dates sont maintenues pour caissier
    if (this.isCaissier) {
      const today = this.getTodayDate();
      this.activeFilters.startDate = today;
      this.activeFilters.endDate = today;
    }

    this.isLoading = true;
    console.log('Starting Excel export...');

    this.exportService.exportCombinedExcel(this.activeFilters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob: Blob) => {
          console.log('Excel export successful:', blob);
          this.isLoading = false;
          const filename = `analyse_financiere_complete_${new Date().toISOString().split('T')[0]}.xlsx`;
          this.exportService.downloadFile(blob, filename);
          this.toasterService.success('Export Excel combiné terminé avec succès');
        },
        error: (error: any) => {
          console.error('Error exporting combined Excel:', error);
          this.isLoading = false;
          this.toasterService.error('Erreur lors de l\'export Excel combiné: ' + (error.message || error));
        }
      });
  }

  /**
   * Export combined analytics to PDF
   */
  exportToPDF(): void {
    console.log('exportToPDF called');
    console.log('activeFilters:', this.activeFilters);

    // ✅ AJOUT - Assurer que les dates sont maintenues pour caissier
    if (this.isCaissier) {
      const today = this.getTodayDate();
      this.activeFilters.startDate = today;
      this.activeFilters.endDate = today;
    }

    this.isLoading = true;
    console.log('Starting PDF export...');

    this.exportService.exportCombinedPDF(this.activeFilters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob: Blob) => {
          console.log('PDF export successful:', blob);
          this.isLoading = false;
          const filename = `analyse_financiere_complete_${new Date().toISOString().split('T')[0]}.pdf`;
          this.exportService.downloadFile(blob, filename);
          this.toasterService.success('Export PDF combiné terminé avec succès');
        },
        error: (error: any) => {
          console.error('Error exporting combined PDF:', error);
          this.isLoading = false;
          this.toasterService.error('Erreur lors de l\'export PDF combiné: ' + (error.message || error));
        }
      });
  }

  /**
   * Get formatted date for display
   */
  formatDate(date: string): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString('fr-FR');
  }

  /**
   * Get category display name
   */
  getCategoryDisplayName(category: string): string {
    const categoryMap: { [key: string]: string } = {
      'maternelle': 'Maternelle',
      'primaire': 'Primaire',
      'secondaire': 'Secondaire'
    };
    return categoryMap[category] || category;
  }

  /**
   * Get component display name
   */
  getComponentDisplayName(component: string): string {
    const componentMap: { [key: string]: string } = {
      'frais_scolaires': 'Frais Scolaires',
      'frais_inscription': 'Frais d\'Inscription',
      'uniforme': 'Uniforme',
      'transport': 'Transport'
    };
    return componentMap[component] || component;
  }

  /**
   * Get role display name
   */
  getRoleDisplayName(role: string): string {
    const roleMap: { [key: string]: string } = {
      'teacher': 'Enseignant',
      'admin': 'Administrateur',
      'superadmin': 'Super Administrateur',
      'student': 'Étudiant'
    };
    return roleMap[role] || role;
  }

  /**
   * Check if there are active filters
   */
  hasActiveFilters(): boolean {
    return !!(
      this.activeFilters.academicYear ||
      this.activeFilters.startDate ||
      this.activeFilters.endDate ||
      this.activeFilters.grade ||
      this.activeFilters.component ||
      this.activeFilters.category ||
      this.activeFilters.userRole ||
      this.activeFilters.chargeCategory
    );
  }
}