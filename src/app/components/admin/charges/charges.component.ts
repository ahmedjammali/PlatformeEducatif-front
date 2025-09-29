import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject as RxSubject, takeUntil } from 'rxjs';
import { ChargeService } from '../../../services/charge.service';
import { ToasterService } from '../../../services/toaster.service';
import { Charge, ChargeSummary } from '../../../models/charge.model';

@Component({
  selector: 'app-charges',
  templateUrl: './charges.component.html',
  styleUrls: ['./charges.component.css']
})
export class ChargesComponent implements OnInit, OnDestroy {
  // Static categories list
  private readonly staticCategories = [
    'Équipement',
    'Fournitures scolaires',
    'Maintenance',
    'Électricité',
    'Eau',
    'Internet/Téléphone',
    'Transport-Carburant',
    'Transport-Maintenance',
    'Formation du personnel',
    'Assurance',
    'Nettoyage',
    'Sécurité',
    'Autre'
  ];

  // Getter for categories (returns static list)
  get categories(): string[] {
    return this.staticCategories;
  }

  // Data
  charges: Charge[] = [];
  filteredCharges: Charge[] = [];
  chargeSummary: ChargeSummary | null = null;

  // UI State
  isLoading = false;
  isSaving = false;
  showChargeModal = false;
  showDeleteModal = false;
  editingCharge: Charge | null = null;
  chargeToDelete: Charge | null = null;

  // Search and filters (unified for both summary and charges)
  selectedCategory = '';
  startDate = '';
  endDate = '';

  // Forms
  chargeForm!: FormGroup;

  // Pagination
  currentPage = 1;
  itemsPerPage = 10;
  totalItems = 0;
  totalPages = 0;

  // Active tab
  activeTab: 'charges' | 'categories' = 'charges';

  // Flag to prevent infinite loops in URL updates
  private isUpdatingFromUrl = false;

  private destroy$ = new RxSubject<void>();

  constructor(
    private fb: FormBuilder,
    private chargeService: ChargeService,
    private toasterService: ToasterService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {
    this.initializeForms();
  }

  ngOnInit(): void {
    // Initialize filters from URL parameters first, but don't subscribe to changes yet
    this.initializeFiltersFromUrl();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForms(): void {
    this.chargeForm = this.fb.group({
      categorie: ['', [Validators.required]],
      description: ['', [Validators.required, Validators.minLength(3)]],
      date: [new Date().toISOString().split('T')[0], [Validators.required]],
      montant: [0, [Validators.required, Validators.min(0.01)]]
    });
  }

  private initializeFiltersFromUrl(): void {
    // Get initial URL parameters
    const params = this.route.snapshot.queryParams;
    this.selectedCategory = decodeURIComponent(params['category'] || '');
    this.startDate = params['startDate'] || '';
    this.endDate = params['endDate'] || '';
    this.currentPage = parseInt(params['page']) || 1;
    this.activeTab = params['tab'] || 'charges';

    // Subscribe to future changes in query params
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(queryParams => {
      // Only update if data is already loaded (to avoid initial load conflicts)
      if (this.charges.length > 0) {
        const newCategory = decodeURIComponent(queryParams['category'] || '');
        const categoryChanged = this.selectedCategory !== newCategory;
        const startDateChanged = this.startDate !== (queryParams['startDate'] || '');
        const endDateChanged = this.endDate !== (queryParams['endDate'] || '');
        const pageChanged = this.currentPage !== (parseInt(queryParams['page']) || 1);
        const tabChanged = this.activeTab !== (queryParams['tab'] || 'charges');

        if (categoryChanged || startDateChanged || endDateChanged || pageChanged || tabChanged) {
          this.isUpdatingFromUrl = true;
          this.selectedCategory = newCategory;
          this.startDate = queryParams['startDate'] || '';
          this.endDate = queryParams['endDate'] || '';
          this.currentPage = parseInt(queryParams['page']) || 1;
          this.activeTab = queryParams['tab'] || 'charges';

          // Force change detection to update the select element
          this.cdr.detectChanges();

          this.loadData();
          this.isUpdatingFromUrl = false;
        }
      }
    });

    // Load data with initial filters
    this.loadData();
  }

  private updateUrlWithFilters(): void {
    const queryParams: any = {};

    if (this.selectedCategory) {
      queryParams.category = encodeURIComponent(this.selectedCategory);
    }
    if (this.startDate) {
      queryParams.startDate = this.startDate;
    }
    if (this.endDate) {
      queryParams.endDate = this.endDate;
    }
    if (this.currentPage > 1) {
      queryParams.page = this.currentPage;
    }
    if (this.activeTab !== 'charges') {
      queryParams.tab = this.activeTab;
    }

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      replaceUrl: true
    });
  }

  private loadData(): void {
    this.isLoading = true;

    // Load charges and summary
    Promise.all([
      this.loadCharges(),
      this.loadSummary()
    ]).finally(() => {
      this.isLoading = false;
    });
  }

  private loadCharges(): Promise<void> {
    return new Promise((resolve) => {
      this.chargeService.getCharges(this.currentPage, this.itemsPerPage, this.selectedCategory, this.startDate, this.endDate)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.charges = response.charges;
            this.totalItems = response.pagination.total;
            this.totalPages = response.pagination.totalPages;
            this.filteredCharges = this.charges; // No additional filtering needed since backend handles it
            resolve();
          },
          error: (error) => {
            console.error('Error loading charges:', error);
            this.toasterService.error('Erreur lors du chargement des charges');
            resolve();
          }
        });
    });
  }

  private loadSummary(): Promise<void> {
    return new Promise((resolve) => {
      this.chargeService.getChargeSummary(this.selectedCategory, this.startDate, this.endDate)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (summary) => {
            this.chargeSummary = summary;

            resolve();
          },
          error: (error) => {
            console.error('Error loading summary:', error);
            resolve();
          }
        });
    });
  }

  // Charge operations
  openCreateChargeModal(): void {
    this.editingCharge = null;
    this.chargeForm.reset({
      date: new Date().toISOString().split('T')[0],
      montant: 0
    });
    this.showChargeModal = true;
  }

  editCharge(charge: Charge): void {
    this.editingCharge = charge;
    this.chargeForm.patchValue({
      categorie: charge.categorie,
      description: charge.description,
      date: new Date(charge.date).toISOString().split('T')[0],
      montant: charge.montant
    });
    this.showChargeModal = true;
  }

  saveCharge(): void {
    if (this.chargeForm.invalid) {
      this.markFormGroupTouched(this.chargeForm);
      return;
    }

    this.isSaving = true;
    const formValue = this.chargeForm.value;
    const chargeData: Partial<Charge> = {
      categorie: formValue.categorie,
      description: formValue.description,
      date: new Date(formValue.date),
      montant: Number(formValue.montant)
    };

    const operation = this.editingCharge
      ? this.chargeService.updateCharge(this.editingCharge._id!, chargeData)
      : this.chargeService.createCharge(chargeData);

    operation.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.toasterService.success(
          this.editingCharge ? 'Charge modifiée avec succès' : 'Charge créée avec succès'
        );
        this.closeChargeModal();
        this.loadData();
      },
      error: (error) => {
        console.error('Error saving charge:', error);
        this.toasterService.error('Erreur lors de la sauvegarde de la charge');
      },
      complete: () => {
        this.isSaving = false;
      }
    });
  }

  // Filtering and search
  onFilterChange(): void {
    if (!this.isUpdatingFromUrl) {
      this.currentPage = 1;
      this.updateUrlWithFilters();
      this.loadData(); // Reload both charges and summary
    }
  }

  clearFilters(): void {
    if (!this.isUpdatingFromUrl) {
      this.selectedCategory = '';
      this.startDate = '';
      this.endDate = '';
      this.currentPage = 1;
      this.updateUrlWithFilters();
      this.loadData();
    }
  }

  // Pagination
  onPageChange(page: number): void {
    this.currentPage = page;
    this.updateUrlWithFilters();
    this.loadCharges();
  }

  // Modal operations
  closeChargeModal(): void {
    this.showChargeModal = false;
    this.editingCharge = null;
    this.chargeForm.reset();
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.chargeToDelete = null;
  }

  // Utility methods
  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(field => {
      const control = formGroup.get(field);
      control?.markAsTouched({ onlySelf: true });
    });
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('fr-FR');
  }

  formatCurrency(amount: number): string {
    if (amount == null || amount == undefined) {

      return '0.00 DT';
    }

    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount) + ' DT';
  }

  setActiveTab(tab: 'charges' | 'categories'): void {
    this.activeTab = tab;
    this.updateUrlWithFilters();
  }

  refreshData(): void {
    this.loadData();
  }

  // Missing computed properties
  get paginatedCharges(): Charge[] {
    // Since pagination is handled by the backend, just return the current charges
    return this.charges;
  }

  // Track-by functions for performance
  trackByChargeId(index: number, charge: Charge): string {
    return charge._id || index.toString();
  }

  // Category color method - returns default color since categories are now static strings
  getCategoryColor(categoryName: string): string {
    // Return a consistent color for all categories since they're now static
    return '#3B82F6';
  }

  // Pagination methods
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updateUrlWithFilters();
      this.loadCharges();
    }
  }

  // Update delete method signatures to match template
  confirmDeleteCharge(charge: Charge): void {
    this.chargeToDelete = charge;
    this.showDeleteModal = true;
  }

  confirmDelete(): void {
    if (this.chargeToDelete) {
      this.executeDeleteCharge();
    }
  }

  private executeDeleteCharge(): void {
    if (!this.chargeToDelete) return;

    this.isSaving = true;
    this.chargeService.deleteCharge(this.chargeToDelete._id!)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toasterService.success('Charge supprimée avec succès');
          this.closeDeleteModal();
          this.loadData();
        },
        error: (error) => {
          console.error('Error deleting charge:', error);
          this.toasterService.error('Erreur lors de la suppression de la charge');
        },
        complete: () => {
          this.isSaving = false;
        }
      });
  }
}
