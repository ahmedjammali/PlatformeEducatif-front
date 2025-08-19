import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { PaymentService } from '../../../services/payment.service';
import { PaymentConfiguration } from '../../../models/payment.model';

@Component({
  selector: 'app-payment-config',
  templateUrl: './payment-config.component.html',
  styleUrls: ['./payment-config.component.css']
})
export class PaymentConfigComponent implements OnInit, OnDestroy {
  configForm: FormGroup;
  isLoading = false;
  currentConfig: PaymentConfiguration | null = null;
  academicYears: string[] = [];
  currentAcademicYear: string;
  isCreatingNew = false; // New flag to track if creating new config
  private destroy$ = new Subject<void>();

  months = [
    { value: 1, label: 'Janvier' },
    { value: 2, label: 'Février' },
    { value: 3, label: 'Mars' },
    { value: 4, label: 'Avril' },
    { value: 5, label: 'Mai' },
    { value: 6, label: 'Juin' },
    { value: 7, label: 'Juillet' },
    { value: 8, label: 'Août' },
    { value: 9, label: 'Septembre' },
    { value: 10, label: 'Octobre' },
    { value: 11, label: 'Novembre' },
    { value: 12, label: 'Décembre' }
  ];

  constructor(
    private fb: FormBuilder,
    private paymentService: PaymentService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.currentAcademicYear = this.paymentService.getCurrentAcademicYear();
    this.academicYears = this.generateAcademicYears();
    this.configForm = this.createForm();
  }

  ngOnInit(): void {
    this.loadCurrentConfig();
    this.setupFormSubscriptions();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private generateAcademicYears(): string[] {
    const currentYear = new Date().getFullYear();
    const years: string[] = [];
    
    // Include past 2 years, current year, and next 3 years
    for (let i = 0 ; i <= 3; i++) {
      const year = currentYear + i;
      years.push(`${year}-${year + 1}`);
    }
    return years;
  }

  private createForm(): FormGroup {
    return this.fb.group({
      academicYear: [this.currentAcademicYear, Validators.required],
      paymentAmounts: this.fb.group({
        école: [0, [Validators.required, Validators.min(0)]],
        college: [0, [Validators.required, Validators.min(0)]],
        lycée: [0, [Validators.required, Validators.min(0)]]
      }),
      paymentSchedule: this.fb.group({
        startMonth: [9, Validators.required],
        endMonth: [5, Validators.required],
        totalMonths: [{ value: 9, disabled: true }]
      }),
      gracePeriod: [5, [Validators.required, Validators.min(0), Validators.max(30)]],
      annualPaymentDiscount: this.fb.group({
        enabled: [false],
        percentage: [0, [Validators.min(0), Validators.max(100)]],
        amount: [0, [Validators.min(0)]]
      })
    });
  }

  private setupFormSubscriptions(): void {
    this.configForm.get('paymentSchedule')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        const totalMonths = this.calculateTotalMonths();
        this.configForm.get('paymentSchedule.totalMonths')?.setValue(totalMonths, { emitEvent: false });
      });

    this.configForm.get('annualPaymentDiscount.enabled')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((enabled: boolean) => {
        this.updateDiscountValidators(enabled);
      });
  }

  private updateDiscountValidators(enabled: boolean): void {
    const percentageControl = this.configForm.get('annualPaymentDiscount.percentage');
    const amountControl = this.configForm.get('annualPaymentDiscount.amount');

    if (enabled) {
      percentageControl?.setValidators([Validators.min(0), Validators.max(100)]);
      amountControl?.setValidators([Validators.min(0)]);
    } else {
      percentageControl?.setValidators([Validators.min(0), Validators.max(100)]);
      amountControl?.setValidators([Validators.min(0)]);
      percentageControl?.setValue(0);
      amountControl?.setValue(0);
    }

    percentageControl?.updateValueAndValidity();
    amountControl?.updateValueAndValidity();
  }

  loadCurrentConfig(): void {
    this.isLoading = true;
    const academicYear = this.configForm.get('academicYear')?.value;
    
    this.paymentService.getPaymentConfig(academicYear)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (config) => {
          this.currentConfig = config;
          this.isCreatingNew = false;
          this.patchFormWithConfig(config);
          this.isLoading = false;
          this.showMessage(`Configuration chargée pour ${academicYear}`, 'info');
        },
        error: (error) => {
          if (error.status === 404) {
            // No configuration found - this is normal for new academic years
            this.currentConfig = null;
            this.isCreatingNew = true;
            this.resetFormToDefaults();
            this.showMessage(`Aucune configuration trouvée pour ${academicYear}. Créez une nouvelle configuration.`, 'info');
          } else {
            this.showMessage('Erreur lors du chargement de la configuration', 'error');
            console.error('Error loading config:', error);
          }
          this.isLoading = false;
        }
      });
  }

  private resetFormToDefaults(): void {
    // Keep the selected academic year but reset other fields to defaults
    const selectedYear = this.configForm.get('academicYear')?.value;
    
    this.configForm.patchValue({
      academicYear: selectedYear,
      paymentAmounts: {
        école: 0,
        college: 0,
        lycée: 0
      },
      paymentSchedule: {
        startMonth: 9,
        endMonth: 5,
        totalMonths: 9
      },
      gracePeriod: 5,
      annualPaymentDiscount: {
        enabled: false,
        percentage: 0,
        amount: 0
      }
    });
  }

  private patchFormWithConfig(config: PaymentConfiguration): void {
    const totalMonths = this.calculateTotalMonthsFromSchedule(
      config.paymentSchedule.startMonth,
      config.paymentSchedule.endMonth
    );

    this.configForm.patchValue({
      academicYear: config.academicYear,
      paymentAmounts: {
        école: config.paymentAmounts.école || 0,
        college: config.paymentAmounts.college || 0,
        lycée: config.paymentAmounts.lycée || 0
      },
      paymentSchedule: {
        startMonth: config.paymentSchedule.startMonth,
        endMonth: config.paymentSchedule.endMonth,
        totalMonths: totalMonths
      },
      gracePeriod: config.gracePeriod || 5,
      annualPaymentDiscount: {
        enabled: config.annualPaymentDiscount?.enabled || false,
        percentage: config.annualPaymentDiscount?.percentage || 0,
        amount: config.annualPaymentDiscount?.amount || 0
      }
    });
  }

  calculateTotalMonths(): number {
    const startMonth = this.configForm.get('paymentSchedule.startMonth')?.value;
    const endMonth = this.configForm.get('paymentSchedule.endMonth')?.value;
    
    if (!startMonth || !endMonth) return 0;
    
    return this.calculateTotalMonthsFromSchedule(startMonth, endMonth);
  }

  private calculateTotalMonthsFromSchedule(startMonth: number, endMonth: number): number {
    if (!startMonth || !endMonth) return 0;
    
    let months = endMonth - startMonth + 1;
    if (months <= 0) {
      months += 12;
    }
    return months;
  }

  calculateMonthlyAmount(classGroup: string): number {
    const totalAmount = this.configForm.get(`paymentAmounts.${classGroup}`)?.value || 0;
    const totalMonths = this.calculateTotalMonths();
    return totalMonths > 0 ? Math.round(totalAmount / totalMonths) : 0;
  }

  onSubmit(): void {
    if (this.configForm.invalid) {
      this.markFormGroupTouched(this.configForm);
      this.showMessage('Veuillez corriger les erreurs dans le formulaire', 'error');
      return;
    }

    // Validate that at least one payment amount is set
    const amounts = this.configForm.get('paymentAmounts')?.value;
    if (!amounts.école && !amounts.college && !amounts.lycée) {
      this.showMessage('Veuillez définir au moins un montant de paiement', 'error');
      return;
    }

    // Validate discount configuration
    if (this.configForm.get('annualPaymentDiscount.enabled')?.value) {
      const percentage = this.configForm.get('annualPaymentDiscount.percentage')?.value || 0;
      const amount = this.configForm.get('annualPaymentDiscount.amount')?.value || 0;
      
      if (percentage <= 0 && amount <= 0) {
        this.showMessage('Veuillez définir soit un pourcentage soit un montant pour la remise', 'error');
        return;
      }

      if (percentage > 0 && amount > 0) {
        this.showMessage('Veuillez choisir soit un pourcentage soit un montant fixe, pas les deux', 'error');
        return;
      }
    }

    this.isLoading = true;
    const formValue = this.prepareFormData();
    const selectedYear = formValue.academicYear;

    this.paymentService.createOrUpdatePaymentConfig(formValue)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (config) => {
          this.currentConfig = config;
          this.isCreatingNew = false;
          
          const message = this.isCreatingNew ? 
            `Configuration créée avec succès pour ${selectedYear}` : 
            `Configuration mise à jour avec succès pour ${selectedYear}`;
          
          this.showMessage(message, 'success');
          this.isLoading = false;
          
          setTimeout(() => {
            this.router.navigate(['../'], { relativeTo: this.route });
          }, 1500);
        },
        error: (error) => {
          console.error('Error saving config:', error);
          this.showMessage(
            error.error?.message || 'Erreur lors de l\'enregistrement de la configuration',
            'error'
          );
          this.isLoading = false;
        }
      });
  }

  private prepareFormData(): any {
    const formValue = { ...this.configForm.value };
    
    formValue.paymentSchedule.totalMonths = this.calculateTotalMonths();
    
    if (!formValue.annualPaymentDiscount.enabled) {
      formValue.annualPaymentDiscount = {
        enabled: false,
        percentage: 0,
        amount: 0
      };
    }

    return formValue;
  }

  onCancel(): void {
    this.router.navigate(['../'], { relativeTo: this.route });
  }

  onAcademicYearChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const newYear = target.value;
    
    // Update the form control
    this.configForm.patchValue({ academicYear: newYear });
    
    // Show a confirmation if user has unsaved changes
    if (this.configForm.dirty && this.currentConfig) {
      const confirmChange = confirm(
        'Vous avez des modifications non sauvegardées. Êtes-vous sûr de vouloir changer d\'année académique ?'
      );
      
      if (!confirmChange) {
        // Revert to previous selection
        this.configForm.patchValue({ academicYear: this.currentConfig.academicYear });
        return;
      }
    }
    
    // Load configuration for the new year
    this.loadCurrentConfig();
  }

  // Copy configuration from another year
  copyFromPreviousYear(): void {
    if (!this.isCreatingNew) {
      this.showMessage('Cette fonction n\'est disponible que lors de la création d\'une nouvelle configuration', 'warning');
      return;
    }

    const currentYear = parseInt(this.configForm.get('academicYear')?.value.split('-')[0]);
    const previousYear = `${currentYear - 1}-${currentYear}`;

    this.isLoading = true;
    this.paymentService.getPaymentConfig(previousYear)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (config) => {
          // Copy configuration but keep the new academic year
          const newAcademicYear = this.configForm.get('academicYear')?.value;
          this.patchFormWithConfig(config);
          this.configForm.patchValue({ academicYear: newAcademicYear });
          this.showMessage(`Configuration copiée depuis ${previousYear}`, 'success');
          this.isLoading = false;
        },
        error: (error) => {
          this.showMessage(`Aucune configuration trouvée pour ${previousYear}`, 'warning');
          this.isLoading = false;
        }
      });
  }

  // Reset form to default values
  resetForm(): void {
    this.configForm.reset();
    const selectedYear = this.configForm.get('academicYear')?.value || this.currentAcademicYear;
    this.configForm.patchValue({
      academicYear: selectedYear,
      paymentAmounts: { école: 0, college: 0, lycée: 0 },
      paymentSchedule: { startMonth: 9, endMonth: 5, totalMonths: 9 },
      gracePeriod: 5,
      annualPaymentDiscount: { enabled: false, percentage: 0, amount: 0 }
    });
  }

  // Form validation helpers
  isFieldInvalid(fieldPath: string): boolean {
    const field = this.configForm.get(fieldPath);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldPath: string): string {
    const field = this.configForm.get(fieldPath);
    if (field && field.errors && (field.dirty || field.touched)) {
      if (field.errors['required']) return 'Ce champ est requis';
      if (field.errors['min']) return `La valeur minimum est ${field.errors['min'].min}`;
      if (field.errors['max']) return `La valeur maximum est ${field.errors['max'].max}`;
    }
    return '';
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  private showMessage(message: string, type: 'success' | 'error' | 'warning' | 'info'): void {
    console.log(`${type.toUpperCase()}: ${message}`);
    
    if (type === 'error') {
      this.showToast(message, 'error');
    } else if (type === 'success') {
      this.showToast(message, 'success');
    } else if (type === 'warning') {
      this.showToast(message, 'warning');
    } else if (type === 'info') {
      this.showToast(message, 'info');
    }
  }

  private showToast(message: string, type: 'success' | 'error' | 'warning' | 'info'): void {
    const toast = document.createElement('div');
    toast.textContent = message;
    
    const baseStyles = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 1rem 2rem;
      border-radius: 8px;
      z-index: 9999;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      max-width: 400px;
      word-wrap: break-word;
    `;

    const typeStyles = {
      success: 'background: #10b981; color: white;',
      error: 'background: #ef4444; color: white;',
      warning: 'background: #f59e0b; color: white;',
      info: 'background: #3b82f6; color: white;'
    };

    toast.style.cssText = baseStyles + typeStyles[type];
    document.body.appendChild(toast);
    
    setTimeout(() => {
      if (document.body.contains(toast)) {
        document.body.removeChild(toast);
      }
    }, 5000);
  }

  formatCurrency(amount: number): string {
    return this.paymentService.formatCurrency(amount);
  }

  formatDate(date: Date | string | undefined): string {
    if (!date) return 'N/A';
    return this.paymentService.formatDate(date);
  }

  getCreatedByName(createdBy: any): string {
    if (!createdBy) return 'Système';
    if (typeof createdBy === 'string') return 'Utilisateur';
    return createdBy.name || 'Système';
  }

  getClassGroupInfo(classGroup: string): { label: string; icon: string; color: string } {
    const classGroupMap = {
      'école': { label: 'École', icon: '🏫', color: '#3b82f6' },
      'college': { label: 'Collège', icon: '📚', color: '#10b981' },
      'lycée': { label: 'Lycée', icon: '🧪', color: '#f59e0b' }
    };
    return classGroupMap[classGroup as keyof typeof classGroupMap] || 
           { label: classGroup, icon: '📚', color: '#6b7280' };
  }

  isCreatingNewConfiguration(): boolean {
    return this.isCreatingNew;
  }

  getConfigurationTitle(): string {
    if (this.isCreatingNew) {
      return `Créer une nouvelle configuration pour ${this.configForm.get('academicYear')?.value}`;
    }
    return `Modifier la configuration pour ${this.configForm.get('academicYear')?.value}`;
  }
}