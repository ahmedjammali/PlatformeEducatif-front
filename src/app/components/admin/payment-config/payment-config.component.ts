// payment-config.component.ts - Corrected Version
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { PaymentService } from '../../../services/payment.service';
import { PaymentConfiguration, Grade } from '../../../models/payment.model';

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
  isCreatingNew = false;
  private destroy$ = new Subject<void>();

  // Grade definitions based on your payment model
  primaryGrades: Grade[] = [
    '1ère année primaire',
    '2ème année primaire', 
    '3ème année primaire',
    '4ème année primaire',
    '5ème année primaire',
    '6ème année primaire'
  ];

  secondaryGrades: Grade[] = [
    '7ème année',
    '8ème année', 
    '9ème année',
    '1ère année lycée',
    '2ème année lycée',
    '3ème année lycée',
    '4ème année lycée'
  ];

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
    
    // Include current year and next 3 years
    for (let i = 0; i <= 3; i++) {
      const year = currentYear + i;
      years.push(`${year}-${year + 1}`);
    }
    return years;
  }

  private createForm(): FormGroup {
    const gradeAmountsGroup = this.fb.group({});
    
    // Add all grades with validators
    gradeAmountsGroup.addControl('Maternal', this.fb.control(0, [Validators.required, Validators.min(0)]));
    
    this.primaryGrades.forEach(grade => {
      gradeAmountsGroup.addControl(grade, this.fb.control(0, [Validators.required, Validators.min(0)]));
    });
    
    this.secondaryGrades.forEach(grade => {
      gradeAmountsGroup.addControl(grade, this.fb.control(0, [Validators.required, Validators.min(0)]));
    });

    return this.fb.group({
      academicYear: [this.currentAcademicYear, Validators.required],
      gradeAmounts: gradeAmountsGroup,
      uniform: this.fb.group({
        enabled: [false],
        price: [0, [Validators.min(0)]],
        description: [''],
        isOptional: [true]
      }),
      transportation: this.fb.group({
        enabled: [false],
        tariffs: this.fb.group({
          close: this.fb.group({
            enabled: [false],
            monthlyPrice: [0, [Validators.min(0)]],
            description: ['']
          }),
          far: this.fb.group({
            enabled: [false],
            monthlyPrice: [0, [Validators.min(0)]],
            description: ['']
          })
        }),
        isOptional: [true]
      }),
      inscriptionFee: this.fb.group({
        enabled: [false],
        prices: this.fb.group({
          maternelleAndPrimaire: [0, [Validators.min(0)]],
          collegeAndLycee: [0, [Validators.min(0)]]
        }),
        description: ['']
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
    // Update total months when schedule changes
    this.configForm.get('paymentSchedule')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        const totalMonths = this.calculateTotalMonths();
        this.configForm.get('paymentSchedule.totalMonths')?.setValue(totalMonths, { emitEvent: false });
      });

    // Handle discount validation
    this.configForm.get('annualPaymentDiscount.enabled')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((enabled: boolean) => {
        this.updateDiscountValidators(enabled);
      });

    // Handle uniform validation
    this.configForm.get('uniform.enabled')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((enabled: boolean) => {
        this.updateUniformValidators(enabled);
      });

    // Handle transportation validation
    this.configForm.get('transportation.enabled')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((enabled: boolean) => {
        this.updateTransportationValidators(enabled);
      });
      this.configForm.get('inscriptionFee.enabled')?.valueChanges
  .pipe(takeUntil(this.destroy$))
  .subscribe((enabled: boolean) => {
    this.updateInscriptionFeeValidators(enabled);
  });
  }

  private updateInscriptionFeeValidators(enabled: boolean): void {
  const maternelleControl = this.configForm.get('inscriptionFee.prices.maternelleAndPrimaire');
  const collegeControl = this.configForm.get('inscriptionFee.prices.collegeAndLycee');

  if (!enabled) {
    maternelleControl?.setValue(0);
    collegeControl?.setValue(0);
  }

  maternelleControl?.updateValueAndValidity();
  collegeControl?.updateValueAndValidity();
}

  private updateDiscountValidators(enabled: boolean): void {
    const percentageControl = this.configForm.get('annualPaymentDiscount.percentage');
    const amountControl = this.configForm.get('annualPaymentDiscount.amount');

    if (!enabled) {
      percentageControl?.setValue(0);
      amountControl?.setValue(0);
    }

    percentageControl?.updateValueAndValidity();
    amountControl?.updateValueAndValidity();
  }

  private updateUniformValidators(enabled: boolean): void {
    const priceControl = this.configForm.get('uniform.price');

    if (enabled) {
      priceControl?.setValidators([Validators.required, Validators.min(0.01)]);
    } else {
      priceControl?.setValidators([Validators.min(0)]);
      priceControl?.setValue(0);
    }

    priceControl?.updateValueAndValidity();
  }

  private updateTransportationValidators(enabled: boolean): void {
    const closePriceControl = this.configForm.get('transportation.tariffs.close.monthlyPrice');
    const farPriceControl = this.configForm.get('transportation.tariffs.far.monthlyPrice');
    const closeEnabledControl = this.configForm.get('transportation.tariffs.close.enabled');
    const farEnabledControl = this.configForm.get('transportation.tariffs.far.enabled');

    if (!enabled) {
      closeEnabledControl?.setValue(false);
      farEnabledControl?.setValue(false);
      closePriceControl?.setValue(0);
      farPriceControl?.setValue(0);
    }

    closePriceControl?.updateValueAndValidity();
    farPriceControl?.updateValueAndValidity();
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
    const selectedYear = this.configForm.get('academicYear')?.value;
    
    // Reset grade amounts
    const gradeAmountsDefaults: any = { 'Maternal': 0 };
    this.primaryGrades.forEach(grade => gradeAmountsDefaults[grade] = 0);
    this.secondaryGrades.forEach(grade => gradeAmountsDefaults[grade] = 0);
    
    this.configForm.patchValue({
      academicYear: selectedYear,
      gradeAmounts: gradeAmountsDefaults,
      uniform: {
        enabled: false,
        price: 0,
        description: '',
        isOptional: true
      },
      transportation: {
        enabled: false,
        tariffs: {
          close: {
            enabled: false,
            monthlyPrice: 0,
            description: ''
          },
          far: {
            enabled: false,
            monthlyPrice: 0,
            description: ''
          }
        },
        isOptional: true
      },
      inscriptionFee: {
        enabled: false,
        prices: {
          maternelleAndPrimaire: 0,
          collegeAndLycee: 0
        },
        description: ''
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
      gradeAmounts: config.gradeAmounts,
      uniform: {
        enabled: config.uniform?.enabled || false,
        price: config.uniform?.price || 0,
        description: config.uniform?.description || '',
        isOptional: config.uniform?.isOptional ?? true
      },
      transportation: {
        enabled: config.transportation?.enabled || false,
        tariffs: {
          close: {
            enabled: config.transportation?.tariffs?.close?.enabled || false,
            monthlyPrice: config.transportation?.tariffs?.close?.monthlyPrice || 0,
            description: config.transportation?.tariffs?.close?.description || ''
          },
          far: {
            enabled: config.transportation?.tariffs?.far?.enabled || false,
            monthlyPrice: config.transportation?.tariffs?.far?.monthlyPrice || 0,
            description: config.transportation?.tariffs?.far?.description || ''
          }
        },
        isOptional: config.transportation?.isOptional ?? true
      },
      inscriptionFee: {
        enabled: config.inscriptionFee?.enabled || false,
        prices: {
          maternelleAndPrimaire: config.inscriptionFee?.prices?.maternelleAndPrimaire || 0,
          collegeAndLycee: config.inscriptionFee?.prices?.collegeAndLycee || 0
        },
        description: config.inscriptionFee?.description || ''
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

  calculateMonthlyAmount(grade: string): number {
    const totalAmount = this.configForm.get(`gradeAmounts.${grade}`)?.value || 0;
    const totalMonths = this.calculateTotalMonths();
    return totalMonths > 0 ? Math.round(totalAmount / totalMonths) : 0;
  }

  onSubmit(): void {
    if (this.configForm.invalid) {
      this.markFormGroupTouched(this.configForm);
      this.showMessage('Veuillez corriger les erreurs dans le formulaire', 'error');
      return;
    }

    // Validate that at least one grade amount is set
    const gradeAmounts = this.configForm.get('gradeAmounts')?.value;
    const hasAmounts = Object.values(gradeAmounts).some((amount: any) => amount > 0);
    
    if (!hasAmounts) {
      this.showMessage('Veuillez définir au moins un montant pour un niveau d\'étude', 'error');
      return;
    }

    // Validate uniform configuration
    if (this.configForm.get('uniform.enabled')?.value) {
      const uniformPrice = this.configForm.get('uniform.price')?.value || 0;
      if (uniformPrice <= 0) {
        this.showMessage('Veuillez définir un prix pour l\'uniforme', 'error');
        return;
      }
    }

    // Validate transportation configuration
    if (this.configForm.get('transportation.enabled')?.value) {
      const closeEnabled = this.configForm.get('transportation.tariffs.close.enabled')?.value;
      const farEnabled = this.configForm.get('transportation.tariffs.far.enabled')?.value;
      
      if (!closeEnabled && !farEnabled) {
        this.showMessage('Veuillez activer au moins une zone de transport', 'error');
        return;
      }

      if (closeEnabled) {
        const closePrice = this.configForm.get('transportation.tariffs.close.monthlyPrice')?.value || 0;
        if (closePrice <= 0) {
          this.showMessage('Veuillez définir un prix pour la zone proche', 'error');
          return;
        }
      }

      if (farEnabled) {
        const farPrice = this.configForm.get('transportation.tariffs.far.monthlyPrice')?.value || 0;
        if (farPrice <= 0) {
          this.showMessage('Veuillez définir un prix pour la zone éloignée', 'error');
          return;
        }
      }
    }
    if (this.configForm.get('inscriptionFee.enabled')?.value) {
  const maternellePrice = this.configForm.get('inscriptionFee.prices.maternelleAndPrimaire')?.value || 0;
  const collegePrice = this.configForm.get('inscriptionFee.prices.collegeAndLycee')?.value || 0;
  
  if (maternellePrice <= 0 && collegePrice <= 0) {
    this.showMessage('Veuillez définir au moins un prix pour les frais d\'inscription', 'error');
    return;
  }
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

    this.paymentService.createOrUpdatePaymentConfig(formValue)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (config) => {
          this.currentConfig = config;
          this.isCreatingNew = false;
          
          const message = this.isCreatingNew ? 
            `Configuration créée avec succès pour ${config.academicYear}` : 
            `Configuration mise à jour avec succès pour ${config.academicYear}`;
          
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
    
    // Set total months
    formValue.paymentSchedule.totalMonths = this.calculateTotalMonths();
    
    // Clean up discount configuration
    if (!formValue.annualPaymentDiscount.enabled) {
      formValue.annualPaymentDiscount = {
        enabled: false,
        percentage: 0,
        amount: 0
      };
    }

    // Clean up uniform configuration
    if (!formValue.uniform.enabled) {
      formValue.uniform = {
        enabled: false,
        price: 0,
        description: '',
        isOptional: true
      };
    }

    // Clean up transportation configuration
    if (!formValue.transportation.enabled) {
      formValue.transportation = {
        enabled: false,
        tariffs: {
          close: {
            enabled: false,
            monthlyPrice: 0,
            description: ''
          },
          far: {
            enabled: false,
            monthlyPrice: 0,
            description: ''
          }
        },
        isOptional: true
      };
    }
    if (!formValue.inscriptionFee.enabled) {
      formValue.inscriptionFee = {
        enabled: false,
        prices: {
          maternelleAndPrimaire: 0,
          collegeAndLycee: 0
        },
        description: ''
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
    
    // Show confirmation if user has unsaved changes
    if (this.configForm.dirty && this.currentConfig) {
      const confirmChange = confirm(
        'Vous avez des modifications non sauvegardées. Êtes-vous sûr de vouloir changer d\'année académique ?'
      );
      
      if (!confirmChange) {
        this.configForm.patchValue({ academicYear: this.currentConfig.academicYear });
        return;
      }
    }
    
    this.configForm.patchValue({ academicYear: newYear });
    this.loadCurrentConfig();
  }

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

  resetForm(): void {
    const selectedYear = this.configForm.get('academicYear')?.value || this.currentAcademicYear;
    this.configForm.reset();
    this.configForm.patchValue({ academicYear: selectedYear });
    this.resetFormToDefaults();
  }

  // ===== TEMPLATE HELPER METHODS =====

  getPrimaryGrades(): Grade[] {
    return this.primaryGrades;
  }

  getSecondaryGrades(): Grade[] {
    return this.secondaryGrades;
  }

  getGradeDisplayName(grade: Grade): string {
    return this.paymentService.getGradeLabel(grade);
  }

  // ===== VALIDATION HELPERS =====

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

  // ===== UTILITY METHODS =====

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

  isCreatingNewConfiguration(): boolean {
    return this.isCreatingNew;
  }

  getConfigurationTitle(): string {
    if (this.isCreatingNew) {
      return `Créer une nouvelle configuration pour ${this.configForm.get('academicYear')?.value}`;
    }
    return `Modifier la configuration pour ${this.configForm.get('academicYear')?.value}`;
  }

  // ===== MESSAGE HANDLING =====

  private showMessage(message: string, type: 'success' | 'error' | 'warning' | 'info'): void {

    this.showToast(message, type);
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
}