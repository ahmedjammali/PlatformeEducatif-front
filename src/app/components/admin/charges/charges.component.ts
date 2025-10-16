import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject as RxSubject, takeUntil } from 'rxjs';
import { ChargeService } from '../../../services/charge.service';
import { ToasterService } from '../../../services/toaster.service';
import { Charge, ChargeSummary } from '../../../models/charge.model';
import { AuthService } from '../../../services/auth.service';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';


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
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {
    this.initializeForms();
  }
  // Auth
  isSuperAdmin = false;
  ngOnInit(): void {
    // Initialize filters from URL parameters first, but don't subscribe to changes yet
    this.initializeFiltersFromUrl();
    this.isSuperAdmin = this.authService.isSuperAdmin();
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

  convertAmountToWords(amount: number): string {
    // Simple number to words converter for French
    const units = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
    const teens = ['dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
    const tens = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante-dix', 'quatre-vingt', 'quatre-vingt-dix'];
    const hundreds = ['', 'cent', 'deux cents', 'trois cents', 'quatre cents', 'cinq cents', 'six cents', 'sept cents', 'huit cents', 'neuf cents'];

    if (amount === 0) return 'zéro';
    if (amount < 0) return 'moins ' + this.convertAmountToWords(-amount);

    let result = '';
    const wholePart = Math.floor(amount);
    const decimalPart = Math.round((amount - wholePart) * 100);

    // Convert whole part
    if (wholePart >= 1000) {
      result += Math.floor(wholePart / 1000) === 1 ? 'mille ' : units[Math.floor(wholePart / 1000)] + ' mille ';
    }

    const remainder = wholePart % 1000;
    if (remainder >= 100) {
      result += hundreds[Math.floor(remainder / 100)] + ' ';
    }

    const lastTwo = remainder % 100;
    if (lastTwo >= 20) {
      result += tens[Math.floor(lastTwo / 10)];
      if (lastTwo % 10 !== 0) {
        result += '-' + units[lastTwo % 10];
      }
    } else if (lastTwo >= 10) {
      result += teens[lastTwo - 10];
    } else if (lastTwo > 0) {
      result += units[lastTwo];
    }

    // Add decimal part if exists
    if (decimalPart > 0) {
      result += ' virgule ' + decimalPart;
    }

    return result.trim();
  }

  generateReceipt(charge: Charge): void {
    const formattedDate = this.formatDate(charge.date);
    const formattedAmount = charge.montant;
    
    // Inline style + two identical receipts
    const receiptHTML = `
      <style>
      @page {
        size: A4;
        margin: 20mm;
      }

      body {
        font-family: Arial, sans-serif;
        line-height: 1.4;
        color: #000;
        background: white;
      }

      .receipt-container {
        max-width: 100%;
        margin: 0 auto;
        padding: 0;
      }

      .receipt-part-1 {
        padding: 20px;
        margin-bottom: 600px;
      }

      .receipt-part-2 {
        padding: 20px;
        margin-top: 200px;
      }

      .receipt-header {
        text-align: center;
        margin-bottom: 20px;
        padding-bottom: 10px;
      }

      .receipt-header h2 {
        font-size: 48px;
        font-weight: bold;
        margin: 0 0 8px 0;
        text-transform: uppercase;
      }

      .receipt-header p {
        font-size: 48px;
        margin: 0;
        font-style: italic;
      }

      .receipt-paragraph {
        margin-bottom: 12px;
        line-height: 1.5;
        font-size: 32px;
        text-align: justify;
      }

      .field-value {
        font-weight: bold;
        margin: 0 2px;
      }

      .field-suffix {
        font-weight: normal;
      }

      .receipt-signatures {
        display: flex;
        justify-content: space-between;
        margin-top: 25px;
        padding-top: 15px;
      }

      .signature-section {
        text-align: center;
        width: 45%;
      }

      .signature-section p {
        margin: 3px 0;
        font-size: 32px;
      }

      .signature-space {
        height: 45px;
        border-bottom: 1px solid #000;
        margin-top: 15px;
      }

      /* Receipt breakdown styles */
      .receipt-breakdown {
        margin: 15px 0;
        padding: 12px;
        border: 1px solid #000;
        border-radius: 4px;
        background-color: white;
      }

      .receipt-breakdown h4 {
        margin: 0 0 10px 0;
        font-size: 32px;
        font-weight: 600;
        color: #000;
        border-bottom: 1px solid #333;
        padding-bottom: 6px;
      }

      .breakdown-items {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .breakdown-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 4px 0;
        font-size: 12px;
      }

      .breakdown-label {
        color: #333;
        flex: 1;
      }

      .breakdown-value {
        font-weight: 500;
        color: #000;
        min-width: 70px;
        text-align: right;
      }

      .breakdown-total {
        border-top: 1px solid #333;
        margin-top: 6px;
        padding-top: 6px;
        font-size: 13px;
      }

      .breakdown-total .breakdown-label,
      .breakdown-total .breakdown-value {
        color: #000;
        font-weight: bold;
      }
      </style>

      <div class="receipt-container" id="receipt-container">
        <div class="receipt-part-1">
          ${this.generateReceiptSection(charge, formattedDate, formattedAmount, 'COPIE ÉTABLISSEMENT')}
        </div>
        <hr class="separator" />
        <div class="receipt-part-2">
          ${this.generateReceiptSection(charge, formattedDate, formattedAmount, 'COPIE CLIENT')}
        </div>
      </div>
    `;

    // Create a temporary DOM element
    const wrapper = document.createElement('div');
    wrapper.innerHTML = receiptHTML;
    document.body.appendChild(wrapper);

    const receiptElement = wrapper.querySelector('#receipt-container') as HTMLElement;

    html2canvas(receiptElement,).then(canvas => {
      const pdf = new jsPDF('p', 'mm', 'a4');

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const imgData = canvas.toDataURL('image/png');

      // Scale image to fit full page width (or smaller if you want some margins)
      const maxWidth = pageWidth * 0.9;  // 10% margin horizontally
      const maxHeight = pageHeight * 0.9; // 10% margin vertically
      let imgWidth = (canvas.width * maxHeight) / canvas.height;
      let imgHeight = maxHeight;

      // If width is too big, scale down to fit width
      if (imgWidth > maxWidth) {
        imgWidth = maxWidth;
        imgHeight = (canvas.height * imgWidth) / canvas.width;
      }

      // Center the image
      const xPos = (pageWidth - imgWidth) / 2;
      const yPos = (pageHeight - imgHeight) / 2;

      pdf.addImage(imgData, 'PNG', xPos, yPos, imgWidth, imgHeight);
      pdf.save(`Reçu-${charge.categorie}-${formattedDate}.pdf`);

      document.body.removeChild(wrapper);
    });

  }

  // Helper to generate each receipt section
  private generateReceiptSection(charge: Charge, formattedDate: string, formattedAmount: number , copyLabel: string): string {
    const amountInWords = this.convertAmountToWords(formattedAmount);
    return `
        <div class="receipt-container">
          <div class="receipt-part">
            <div class="receipt-header">
              <h2>REÇU POUR PAIEMENT DE FRAIS ${charge.categorie} EN ESPÈCES</h2>
            </div>

            <div class="receipt-content">
              <p class="receipt-paragraph">
                Je soussigné(e), .........................................................,
                déclare avoir reçu en ce jour la somme de <span class="field-value">${amountInWords}</span> dinars tunisiens (TND),
                soit <span class="field-value">${formattedAmount}</span> TND,
                correspondant au paiement de la charge suivante :
                <span class="breakdown-value">${charge.description}</span>.
                <br/>
                Le paiement a été effectué par <span class="field-value">Ons School</span>,
                en date du <span class="field-value">${formattedDate}</span>,
                conformément aux modalités convenues.

                En foi de quoi, le présent reçu est établi pour servir de preuve de paiement.              </p>

              <p class="receipt-paragraph">
                Fait à Jilma, le <span class="breakdown-value">${formattedDate}</span>.
              </p>

              <div class="receipt-signatures">
                <div class="signature-section">
                  <p>« Lu et approuvé »</p>
                  <p>Signature de l'école</p>
                  <div class="signature-space"></div>
                </div>
                <div class="signature-section">
                  <p>« Lu et approuvé »</p>
                  <p>Signature</p>
                  <div class="signature-space"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
    `;
  }


}
