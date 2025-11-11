import { Component, OnInit } from '@angular/core';
import { Caisse2Service, DeleteCaisseRequest } from '../../../services/caisse2.service';
import {
  CaisseDashboardData,
  CaisseTransaction,
  VerseCaisseRequest,
  TransfertBanqueRequest,
  TransactionHistoryFilters
} from '../../../models/caisse.model';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-caisse',
  templateUrl: './caisse.component.html',
  styleUrls: ['./caisse.component.css']
})
export class CaisseComponent implements OnInit {
  dashboardData: CaisseDashboardData | null = null;
  allTransactions: CaisseTransaction[] = [];
  loading = false;
  error: string | null = null;
  successMessage: string | null = null;
  
  // Forms
  verseForm: FormGroup;
  transfertForm: FormGroup;
  initializeForm: FormGroup;
  
  // Modals
  showVerseModal = false;
  showTransfertModal = false;
  showInitializeModal = false;
  showDeleteModal = false;
  showHistoryModal = false;
  
  // Confirmation states
  deleteConfirmText = '';
  isDeleting = false;
  isInitializing = false;
  
  // Selected date for filtering
  selectedDate: Date | null = null;
  
  // History pagination
  currentPage = 1;
  totalPages = 1;
  pageSize = 20;

  constructor(
    private caisseService: Caisse2Service,
    private fb: FormBuilder
  ) {
    // Initialize forms
    this.verseForm = this.fb.group({
      amount: ['', [Validators.required, Validators.min(0.01)]],
      description: [''],
      reference: ['']
    });

    this.transfertForm = this.fb.group({
      amount: ['', [Validators.required, Validators.min(0.01)]],
      description: [''],
      reference: ['']
    });

    this.initializeForm = this.fb.group({
      academicYear: ['', [Validators.required]]
    });
  }

  ngOnInit(): void {
    this.loadDashboard();
  }

  /**
   * Load dashboard data
   */
  loadDashboard(): void {
    this.loading = true;
    this.error = null;

    const filters = this.selectedDate 
      ? { date: this.caisseService.formatDateForApi(this.selectedDate) }
      : undefined;

    this.caisseService.getDashboardData(filters).subscribe({
      next: (data) => {
        this.dashboardData = data;
        this.loading = false;
      },
      error: (err) => {
        this.error = err.error?.message || 'Erreur lors du chargement des données';
        this.loading = false;
        console.error('Error loading dashboard:', err);
      }
    });
  }

  /**
   * Load transaction history
   */
  loadTransactionHistory(): void {
    const filters: TransactionHistoryFilters = {
      page: this.currentPage,
      limit: this.pageSize
    };

    this.caisseService.getTransactionHistory(filters).subscribe({
      next: (response) => {
        this.allTransactions = response.data.transactions;
        this.totalPages = response.data.pagination.totalPages;
      },
      error: (err) => {
        console.error('Error loading history:', err);
      }
    });
  }

  /**
   * Open initialize modal
   */
  openInitializeModal(): void {
    this.initializeForm.reset();
    this.showInitializeModal = true;
    this.error = null;
    this.successMessage = null;
  }

  /**
   * Submit initialize caisse
   */
  submitInitialize(): void {
    if (this.initializeForm.invalid) return;

    this.isInitializing = true;
    this.error = null;

    const request = this.initializeForm.value;
    
    this.caisseService.initializeCaisse(request).subscribe({
      next: (response) => {
        this.successMessage = 'Caisse initialisée avec succès!';
        this.showInitializeModal = false;
        this.initializeForm.reset();
        this.isInitializing = false;
        this.loadDashboard();
        setTimeout(() => this.successMessage = null, 5000);
      },
      error: (err) => {
        this.error = err.error?.message || 'Erreur lors de l\'initialisation';
        this.isInitializing = false;
      }
    });
  }

  /**
   * Open delete modal
   */
  openDeleteModal(): void {
    this.showDeleteModal = true;
    this.deleteConfirmText = '';
    this.error = null;
    this.successMessage = null;
  }

  /**
   * Submit delete caisse
   */
  submitDelete(): void {
    if (this.deleteConfirmText !== 'DELETE_CAISSE') {
      this.error = 'Veuillez taper exactement "DELETE_CAISSE" pour confirmer';
      return;
    }

    this.isDeleting = true;
    this.error = null;

    this.caisseService.deleteCaisseConfirmed().subscribe({
      next: (response) => {
        this.successMessage = 'Caisse supprimée avec succès! Vous pouvez maintenant réinitialiser.';
        this.showDeleteModal = false;
        this.deleteConfirmText = '';
        this.isDeleting = false;
        this.dashboardData = null;
        setTimeout(() => this.successMessage = null, 5000);
      },
      error: (err) => {
        this.error = err.error?.message || 'Erreur lors de la suppression';
        this.isDeleting = false;
      }
    });
  }

  /**
   * Open verse modal
   */
  openVerseModal(): void {
    this.verseForm.reset();
    this.showVerseModal = true;
    this.error = null;
  }

  /**
   * Submit verse en caisse
   */
  submitVerse(): void {
    if (this.verseForm.invalid) return;

    const request: VerseCaisseRequest = this.verseForm.value;
    
    this.caisseService.verseCaisse(request).subscribe({
      next: (response) => {
        this.successMessage = 'Versement enregistré avec succès!';
        this.showVerseModal = false;
        this.verseForm.reset();
        this.loadDashboard();
        setTimeout(() => this.successMessage = null, 5000);
      },
      error: (err) => {
        this.error = err.error?.message || 'Erreur lors du versement';
      }
    });
  }

  /**
   * Open transfert modal
   */
  openTransfertModal(): void {
    this.transfertForm.reset();
    this.showTransfertModal = true;
    this.error = null;
  }

  /**
   * Submit transfert banque
   */
  submitTransfert(): void {
    if (this.transfertForm.invalid) return;

    const request: TransfertBanqueRequest = this.transfertForm.value;
    
    this.caisseService.transfertBanque(request).subscribe({
      next: (response) => {
        this.successMessage = 'Transfert enregistré avec succès!';
        this.showTransfertModal = false;
        this.transfertForm.reset();
        this.loadDashboard();
        setTimeout(() => this.successMessage = null, 5000);
      },
      error: (err) => {
        this.error = err.error?.message || 'Erreur lors du transfert';
      }
    });
  }

  /**
   * Open history modal
   */
  openHistoryModal(): void {
    this.showHistoryModal = true;
    this.currentPage = 1;
    this.loadTransactionHistory();
  }

  /**
   * Navigate to next page in history
   */
  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadTransactionHistory();
    }
  }

  /**
   * Navigate to previous page in history
   */
  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadTransactionHistory();
    }
  }

  /**
   * Refresh dashboard manually
   */
  refreshDashboard(): void {
    this.caisseService.updateCaisse().subscribe({
      next: () => {
        this.loadDashboard();
        this.successMessage = 'Données actualisées avec succès!';
        setTimeout(() => this.successMessage = null, 3000);
      },
      error: (err) => {
        this.error = 'Erreur lors de l\'actualisation';
        console.error('Error updating caisse:', err);
      }
    });
  }

  /**
   * Format amount helper
   */
  formatAmount(amount: number): string {
    return this.caisseService.formatAmount(amount);
  }

  /**
   * Get balance color class
   */
  getBalanceClass(amount: number): string {
    return this.caisseService.getBalanceColorClass(amount);
  }

  /**
   * Get transaction type label
   */
  getTransactionLabel(type: string): string {
    return this.caisseService.getTransactionTypeLabel(type);
  }

  /**
   * Date change handler
   */
  onDateChange(event: any): void {
    this.selectedDate = event.value;
    this.loadDashboard();
  }

  /**
   * Clear date filter
   */
  clearDateFilter(): void {
    this.selectedDate = null;
    this.loadDashboard();
  }

  /**
   * Calculate progress percentage for the progress bar
   */
  getProgressPercentage(recettes: number, depenses: number): number {
    if (recettes === 0 && depenses === 0) return 0;
    if (depenses === 0) return 100;
    
    const total = recettes + depenses;
    return Math.min(100, Math.round((recettes / total) * 100));
  }

  /**
   * Get progress bar color based on balance
   */
  getProgressColor(balance: number): string {
    if (balance >= 0) {
      return 'linear-gradient(90deg, #4CAF50, #66BB6A)';
    } else {
      return 'linear-gradient(90deg, #f44336, #e57373)';
    }
  }

  /**
   * Dismiss error message
   */
  dismissError(): void {
    this.error = null;
  }

  /**
   * Dismiss success message
   */
  dismissSuccess(): void {
    this.successMessage = null;
  }
}