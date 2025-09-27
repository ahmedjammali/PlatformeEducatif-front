// charges-management.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil, forkJoin } from 'rxjs';

import { ChargeService } from '../../../services/charge.service';
import { BudgetService } from '../../../services/budget.service';
import { ToasterService } from '../../../services/toaster.service';

import {
  Charge,
  CreateChargeRequest,
  ChargeFilters,
  AdvancedSearchFilters,
  DashboardStats,
  CHARGE_CATEGORIES,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  PRIORITIES,
  RECURRING_FREQUENCIES,
  CURRENCIES,
  ChargeCategory,
  PaymentStatus,
  Priority,
  PaymentMethod,
  Currency,
  RecurringFrequency
} from '../../../models/charge.model';

import {
  BudgetAlerts
} from '../../../models/budget.model';

@Component({
  selector: 'app-charges-management',
  templateUrl: './charges-management.component.html',
  styleUrls: ['./charges-management.component.css']
})
export class ChargesManagementComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // Data properties
  charges: Charge[] = [];
  filteredCharges: Charge[] = [];
  paginatedCharges: Charge[] = [];
  selectedCharges: string[] = [];
  dashboardStats: DashboardStats | null = null;
  budgetAlerts: BudgetAlerts | null = null;
  selectedSubcategories: string[] = [];

  // UI State
  isLoading = false;
  isSaving = false;
  viewMode: 'cards' | 'table' = 'cards';
  showAdvancedFilters = false;

  // Modal states
  showChargeModal = false;
  showViewModal = false;
  showDeleteModal = false;
  showBudgetModal = false;
  showTemplatesModal = false;
  
  // Current items
  editingCharge: Charge | null = null;
  viewingCharge: Charge | null = null;
  chargeToDelete: Charge | null = null;

  // Forms
  chargeForm: FormGroup;

  // Filters
  searchTerm = '';
  selectedCategory = '';
  selectedStatus = '';
  selectedPriority = '';
  selectedPeriod = '';
  selectedPaymentMethod = '';
  supplierFilter = '';
  minAmount: number | null = null;
  maxAmount: number | null = null;
  startDate = '';
  endDate = '';
  showRecurringOnly = false;

  // Pagination
  currentPage = 1;
  itemsPerPage = 20;
  totalPages = 1;

  // Sorting
  sortField = 'purchaseDate';
  sortOrder: 'asc' | 'desc' = 'desc';

  // Constants for templates
  chargeCategories = CHARGE_CATEGORIES;
  paymentMethods = PAYMENT_METHODS;
  paymentStatuses = PAYMENT_STATUSES;
  priorities = PRIORITIES;
  recurringFrequencies = RECURRING_FREQUENCIES;
  currencies = CURRENCIES;

  // Computed properties
  get calculatedTaxAmount(): number {
    const amount = this.chargeForm?.get('amount')?.value || 0;
    const taxRate = this.chargeForm?.get('taxRate')?.value || 0;
    return (amount * taxRate) / 100;
  }

  constructor(
    private fb: FormBuilder,
    private chargeService: ChargeService,
    private budgetService: BudgetService,
    private toaster: ToasterService
  ) {
    this.chargeForm = this.createChargeForm();
  }

  ngOnInit(): void {
    this.loadInitialData();
    this.setupSearchDebounce();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // =================== INITIALIZATION ===================

  private createChargeForm(): FormGroup {
    return this.fb.group({
      title: ['', [Validators.required]],
      description: [''],
      category: ['', [Validators.required]],
      amount: [0, [Validators.required, Validators.min(0.01)]],
      currency: ['TND'],
      purchaseDate: [new Date().toISOString().split('T')[0]],
      paymentMethod: ['', [Validators.required]],
      paymentStatus: ['pending'],
      priority: ['medium'],
      
      // Supplier fields
      supplierName: [''],
      supplierContact: [''],
      supplierAddress: [''],
      supplierTaxId: [''],
      
      // Tax fields
      taxRate: [0, [Validators.min(0), Validators.max(100)]]
    });
  }

  private loadInitialData(): void {
    this.isLoading = true;
    
    forkJoin({
      charges: this.chargeService.getAllCharges(),
      dashboardStats: this.chargeService.getDashboardStats('month'),
      budgetAlerts: this.budgetService.getBudgetAlerts()
    }).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (data) => {
        this.charges = data.charges.charges;
        this.dashboardStats = data.dashboardStats;
        this.budgetAlerts = data.budgetAlerts;
        this.applyFilters();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading initial data:', error);
        this.toaster.error('Erreur lors du chargement des données');
        this.isLoading = false;
      }
    });
  }

  private setupSearchDebounce(): void {
    // You would need to implement a search subject and debounce logic here
    // This is a simplified version
  }

  // =================== DATA OPERATIONS ===================

  private applyFilters(): void {
    let filtered = [...this.charges];

    // Apply search filter
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(charge => 
        charge.title.toLowerCase().includes(term) ||
        charge.description?.toLowerCase().includes(term) ||
        charge.supplier?.name?.toLowerCase().includes(term) ||
        charge.notes?.toLowerCase().includes(term)
      );
    }

    // Apply category filter
    if (this.selectedCategory) {
      filtered = filtered.filter(charge => charge.category === this.selectedCategory);
    }

    // Apply status filter
    if (this.selectedStatus) {
      filtered = filtered.filter(charge => charge.paymentStatus === this.selectedStatus);
    }

    // Apply priority filter
    if (this.selectedPriority) {
      filtered = filtered.filter(charge => charge.priority === this.selectedPriority);
    }

    // Apply payment method filter
    if (this.selectedPaymentMethod) {
      filtered = filtered.filter(charge => charge.paymentMethod === this.selectedPaymentMethod);
    }

    // Apply amount range filter
    if (this.minAmount !== null) {
      filtered = filtered.filter(charge => charge.amount >= this.minAmount!);
    }
    if (this.maxAmount !== null) {
      filtered = filtered.filter(charge => charge.amount <= this.maxAmount!);
    }

    // Apply date range filter
    if (this.startDate) {
      filtered = filtered.filter(charge => 
        new Date(charge.purchaseDate) >= new Date(this.startDate)
      );
    }
    if (this.endDate) {
      filtered = filtered.filter(charge => 
        new Date(charge.purchaseDate) <= new Date(this.endDate)
      );
    }

    // Apply period filter
    if (this.selectedPeriod) {
      filtered = this.applyPeriodFilter(filtered, this.selectedPeriod);
    }

    // Apply supplier filter
    if (this.supplierFilter) {
      const term = this.supplierFilter.toLowerCase();
      filtered = filtered.filter(charge => 
        charge.supplier?.name?.toLowerCase().includes(term)
      );
    }

    // Apply recurring filter
    if (this.showRecurringOnly) {
      filtered = filtered.filter(charge => charge.isRecurring);
    }

    this.filteredCharges = filtered;
    this.applySorting();
    this.updatePagination();
  }

  private applyPeriodFilter(charges: Charge[], period: string): Charge[] {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'quarter':
        const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
        startDate = new Date(now.getFullYear(), quarterMonth, 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        return charges;
    }

    return charges.filter(charge => new Date(charge.purchaseDate) >= startDate);
  }

  private applySorting(): void {
    this.filteredCharges.sort((a, b) => {
      let valueA: any = a[this.sortField as keyof Charge];
      let valueB: any = b[this.sortField as keyof Charge];

      // Handle date sorting
      if (this.sortField === 'purchaseDate' || this.sortField === 'createdAt') {
        valueA = new Date(valueA).getTime();
        valueB = new Date(valueB).getTime();
      }

      // Handle string sorting
      if (typeof valueA === 'string') {
        valueA = valueA.toLowerCase();
        valueB = valueB.toLowerCase();
      }

      const comparison = valueA < valueB ? -1 : valueA > valueB ? 1 : 0;
      return this.sortOrder === 'asc' ? comparison : -comparison;
    });
  }

  private updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredCharges.length / this.itemsPerPage);
    
    if (this.currentPage > this.totalPages) {
      this.currentPage = Math.max(1, this.totalPages);
    }

    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedCharges = this.filteredCharges.slice(startIndex, endIndex);
  }

  // =================== EVENT HANDLERS ===================

  onSearchChange(): void {
    this.currentPage = 1;
    this.applyFilters();
  }

  onFilterChange(): void {
    this.currentPage = 1;
    this.applyFilters();
  }

  calculateTax(): void {
    // Tax calculation is handled by the getter
    this.chargeForm.updateValueAndValidity();
  }

  // =================== FORM VALIDATION ===================

  isFormValid(): boolean {
    const title = this.chargeForm.get('title')?.value;
    const category = this.chargeForm.get('category')?.value;
    const amount = this.chargeForm.get('amount')?.value;
    const paymentMethod = this.chargeForm.get('paymentMethod')?.value;

    return !!(title && title.trim() && 
              category && 
              amount && amount > 0 && 
              paymentMethod);
  }

  // =================== UI ACTIONS ===================

  resetFilters(): void {
    this.searchTerm = '';
    this.selectedCategory = '';
    this.selectedStatus = '';
    this.selectedPriority = '';
    this.selectedPeriod = '';
    this.selectedPaymentMethod = '';
    this.supplierFilter = '';
    this.minAmount = null;
    this.maxAmount = null;
    this.startDate = '';
    this.endDate = '';
    this.showRecurringOnly = false;
    this.currentPage = 1;
    this.applyFilters();
  }

  toggleAdvancedFilters(): void {
    this.showAdvancedFilters = !this.showAdvancedFilters;
  }

  setViewMode(mode: 'cards' | 'table'): void {
    this.viewMode = mode;
  }

  // =================== SELECTION ===================

  toggleSelect(chargeId: string): void {
    const index = this.selectedCharges.indexOf(chargeId);
    if (index > -1) {
      this.selectedCharges.splice(index, 1);
    } else {
      this.selectedCharges.push(chargeId);
    }
  }

  toggleSelectAll(event: any): void {
    if (event.target.checked) {
      this.selectedCharges = this.paginatedCharges.map(charge => charge._id);
    } else {
      this.selectedCharges = [];
    }
  }

  isSelected(chargeId: string): boolean {
    return this.selectedCharges.includes(chargeId);
  }

  isAllSelected(): boolean {
    return this.paginatedCharges.length > 0 && 
           this.paginatedCharges.every(charge => this.selectedCharges.includes(charge._id));
  }

  // =================== SORTING ===================

  sortBy(field: string): void {
    if (this.sortField === field) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortOrder = 'asc';
    }
    this.applySorting();
    this.updatePagination();
  }

  // =================== PAGINATION ===================

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePagination();
    }
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxPages = 5;
    
    let startPage = Math.max(1, this.currentPage - Math.floor(maxPages / 2));
    let endPage = Math.min(this.totalPages, startPage + maxPages - 1);
    
    if (endPage - startPage < maxPages - 1) {
      startPage = Math.max(1, endPage - maxPages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    return pages;
  }

  // =================== MODAL OPERATIONS ===================

  openCreateChargeModal(): void {
    this.editingCharge = null;
    this.chargeForm.reset();
    this.chargeForm.patchValue({
      currency: 'TND',
      purchaseDate: new Date().toISOString().split('T')[0],
      paymentStatus: 'pending',
      priority: 'medium',
      taxRate: 0
    });
    this.showChargeModal = true;
  }

  openBudgetModal(): void {
    this.showBudgetModal = true;
  }

  openTemplatesModal(): void {
    this.showTemplatesModal = true;
  }

  closeModal(): void {
    this.showChargeModal = false;
    this.showBudgetModal = false;
    this.showTemplatesModal = false;
    this.editingCharge = null;
  }

  closeViewModal(): void {
    this.showViewModal = false;
    this.viewingCharge = null;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.chargeToDelete = null;
  }

  // =================== CHARGE OPERATIONS ===================

  saveCharge(): void {
    if (this.isFormValid()) {
      this.isSaving = true;
      
      const formValue = this.chargeForm.value;
      const chargeData: CreateChargeRequest = {
        title: formValue.title,
        description: formValue.description,
        category: formValue.category,
        amount: parseFloat(formValue.amount),
        currency: formValue.currency,
        purchaseDate: new Date(formValue.purchaseDate),
        paymentMethod: formValue.paymentMethod,
        paymentStatus: formValue.paymentStatus,
        priority: formValue.priority,
        
        supplier: {
          name: formValue.supplierName,
          contact: formValue.supplierContact,
          address: formValue.supplierAddress,
          taxId: formValue.supplierTaxId
        },
        
        taxInfo: {
          taxRate: formValue.taxRate || 0
        }
      };

      const operation = this.editingCharge
        ? this.chargeService.updateCharge(this.editingCharge._id, chargeData)
        : this.chargeService.createCharge(chargeData);

      operation.pipe(takeUntil(this.destroy$)).subscribe({
        next: (response) => {
          this.toaster.success(
            this.editingCharge ? 'Charge mise à jour avec succès' : 'Charge créée avec succès'
          );
          this.closeModal();
          this.loadInitialData();
          this.isSaving = false;
        },
        error: (error) => {
          console.error('Error saving charge:', error);
          this.toaster.error('Erreur lors de l\'enregistrement de la charge');
          this.isSaving = false;
        }
      });
    }
  }

  editCharge(charge: Charge): void {
    this.editingCharge = charge;
    
    // Populate form with charge data
    this.chargeForm.patchValue({
      title: charge.title,
      description: charge.description,
      category: charge.category,
      amount: charge.amount,
      currency: charge.currency,
      purchaseDate: new Date(charge.purchaseDate).toISOString().split('T')[0],
      paymentMethod: charge.paymentMethod,
      paymentStatus: charge.paymentStatus,
      priority: charge.priority,
      
      supplierName: charge.supplier?.name || '',
      supplierContact: charge.supplier?.contact || '',
      supplierAddress: charge.supplier?.address || '',
      supplierTaxId: charge.supplier?.taxId || '',
      
      taxRate: charge.taxInfo?.taxRate || 0
    });

    this.showChargeModal = true;
  }

  viewCharge(charge: Charge): void {
    this.viewingCharge = charge;
    this.showViewModal = true;
  }

  deleteCharge(charge: Charge): void {
    this.chargeToDelete = charge;
    this.showDeleteModal = true;
  }

  confirmDeleteCharge(): void {
    if (this.chargeToDelete) {
      this.chargeService.deleteCharge(this.chargeToDelete._id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.toaster.success('Charge supprimée avec succès');
            this.closeDeleteModal();
            this.loadInitialData();
          },
          error: (error) => {
            console.error('Error deleting charge:', error);
            this.toaster.error('Erreur lors de la suppression de la charge');
          }
        });
    }
  }

  togglePaymentStatus(charge: Charge): void {
    const newStatus: PaymentStatus = charge.paymentStatus === 'paid' ? 'pending' : 'paid';
    
    this.chargeService.updateCharge(charge._id, { paymentStatus: newStatus })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toaster.success(`Charge marquée comme ${newStatus === 'paid' ? 'payée' : 'en attente'}`);
          this.loadInitialData();
        },
        error: (error) => {
          console.error('Error updating payment status:', error);
          this.toaster.error('Erreur lors de la mise à jour du statut');
        }
      });
  }

  // =================== BULK OPERATIONS ===================

  hasPendingInSelection(): boolean {
    return this.selectedCharges.some(id => {
      const charge = this.charges.find(c => c._id === id);
      return charge?.paymentStatus === 'pending';
    });
  }

  bulkApprove(): void {
    if (this.selectedCharges.length > 0) {
      this.chargeService.bulkApproveCharges(this.selectedCharges)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.toaster.success(`${response.approvedCount} charge(s) approuvée(s)`);
            this.selectedCharges = [];
            this.loadInitialData();
          },
          error: (error) => {
            console.error('Error bulk approving charges:', error);
            this.toaster.error('Erreur lors de l\'approbation des charges');
          }
        });
    }
  }

  bulkExport(): void {
    // Implementation for bulk export
    this.toaster.info('Fonctionnalité d\'export en cours de développement');
  }

  bulkDelete(): void {
    if (this.selectedCharges.length > 0 && confirm(`Êtes-vous sûr de vouloir supprimer ${this.selectedCharges.length} charge(s) ?`)) {
      // Implementation for bulk delete
      this.toaster.info('Fonctionnalité de suppression en lot en cours de développement');
    }
  }

  // =================== IMPORT/EXPORT ===================

  importCharges(): void {
    this.toaster.info('Fonctionnalité d\'import en cours de développement');
  }

  exportCharges(): void {
    this.chargeService.exportCharges('excel').subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `charges_${new Date().toISOString().split('T')[0]}.xlsx`;
        link.click();
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Error exporting charges:', error);
        this.toaster.error('Erreur lors de l\'export');
      }
    });
  }

  // =================== ALERTS ===================

  viewAllAlerts(): void {
    // Implementation to show all budget alerts
    this.toaster.info('Affichage de toutes les alertes en cours de développement');
  }

  // =================== HELPER METHODS ===================

  trackByChargeId(index: number, charge: Charge): string {
    return charge._id;
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.chargeForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getCategoryIcon(category: ChargeCategory): string {
    const categoryData = this.chargeCategories.find((c: any) => c.value === category);
    return categoryData?.icon || '📄';
  }

  getCategoryLabel(category: ChargeCategory): string {
    const categoryData = this.chargeCategories.find((c: any) => c.value === category);
    return categoryData?.label || category;
  }

  getPaymentStatusLabel(status: PaymentStatus): string {
    const statusData = this.paymentStatuses.find((s: any) => s.value === status);
    return statusData?.label || status;
  }

  getPriorityLabel(priority: Priority): string {
    const priorityData = this.priorities.find((p: any) => p.value === priority);
    return priorityData?.label || priority;
  }

  getPaymentMethodLabel(method: PaymentMethod): string {
    const methodData = this.paymentMethods.find((m: any) => m.value === method);
    return methodData?.label || method;
  }

  getRecurringFrequencyLabel(frequency: RecurringFrequency | undefined): string {
    if (!frequency) return '-';
    const freqData = this.recurringFrequencies.find((f: any) => f.value === frequency);
    return freqData?.label || frequency;
  }

  getCreatedByName(createdBy: any): string {
    if (typeof createdBy === 'string') return 'Utilisateur';
    return createdBy?.name || 'Inconnu';
  }

  // =================== SAFE CALCULATION HELPERS ===================

  calculatePendingPercentage(): number {
    if (!this.dashboardStats?.overview?.totalCharges || this.dashboardStats.overview.totalCharges === 0) {
      return 0;
    }
    return ((this.dashboardStats.overview.pendingCount || 0) / this.dashboardStats.overview.totalCharges) * 100;
  }

  calculatePaidPercentage(): number {
    if (!this.dashboardStats?.overview?.totalCharges || this.dashboardStats.overview.totalCharges === 0) {
      return 0;
    }
    return ((this.dashboardStats.overview.paidCount || 0) / this.dashboardStats.overview.totalCharges) * 100;
  }

  calculateOverduePercentage(): number {
    if (!this.dashboardStats?.overview?.totalCharges || this.dashboardStats.overview.totalCharges === 0) {
      return 0;
    }
    return ((this.dashboardStats.overview.overdueCount || 0) / this.dashboardStats.overview.totalCharges) * 100;
  }

  hasDashboardStats(): boolean {
    return !!(this.dashboardStats?.overview?.totalCharges && this.dashboardStats.overview.totalCharges > 0);
  }
}